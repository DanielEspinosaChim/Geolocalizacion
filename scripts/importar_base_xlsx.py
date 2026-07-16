"""
Importar BASE.xlsx → Firestore
================================
Hoja1: padrón fiscal      — RFC + Nombre + Dirección (formal con RFC)
Hoja2: licencias municipales — FechaAlta + NombreComercial (licencia municipal)

Pasos:
  1. Leer ambas hojas y normalizar nombres
  2. Cruce H1 × H2: detectar negocios en ambos registros
  3. Cruzar vs candidatos Firestore → reclasificar matches como formal_base_xlsx
  4. Subir los nuevos a colección 'padron_formal' (sin tocar existentes)

Uso:
    python scripts/importar_base_xlsx.py [--dry-run]
"""

import sys
import re
import unicodedata
import hashlib
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

DRY_RUN = "--dry-run" in sys.argv
if DRY_RUN:
    print("[DRY-RUN] No se escribirá nada en Firestore")

# ─── Dependencias ──────────────────────────────────────────────────────────────
try:
    import openpyxl
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "openpyxl", "-q"])
    import openpyxl

try:
    from rapidfuzz import fuzz
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "rapidfuzz", "-q"])
    from rapidfuzz import fuzz

import firebase_admin
from firebase_admin import credentials, firestore

# ─── Firebase ──────────────────────────────────────────────────────────────────
SA = ROOT / "service_account.json"
if not firebase_admin._apps:
    cred = credentials.Certificate(str(SA))
    firebase_admin.initialize_app(cred)
db = firestore.client()

# ─── Normalización (misma lógica que cruce.py) ────────────────────────────────
def quitar_acentos(t: str) -> str:
    nfkd = unicodedata.normalize("NFKD", str(t))
    return "".join(c for c in nfkd if not unicodedata.combining(c))

def normalizar(t: str) -> str:
    t = str(t).upper().strip()
    t = quitar_acentos(t)
    t = re.sub(r"[^\w\s&]", " ", t)
    t = re.sub(r"\b(EL|LA|LOS|LAS|DE|DEL|EN|Y|E|SA|CV|S\.A\.|C\.V\.|S DE RL|SAPI)\b", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t

def make_doc_id(text: str) -> str:
    """ID Firestore seguro a partir de texto (MD5 del nombre normalizado)."""
    norm = normalizar(text)
    return hashlib.md5(norm.encode()).hexdigest()[:16]

def limpiar_nombre(s: str) -> str:
    """Quita puntos iniciales: '.ALMACENES' → 'ALMACENES'."""
    if not s:
        return ""
    return str(s).lstrip(".").strip()

# ─── 1. LEER BASE.xlsx ────────────────────────────────────────────────────────
print("=" * 60)
print("IMPORTAR BASE.xlsx → FIRESTORE")
print("=" * 60)
print(f"\n[1/4] Leyendo data/data/BASE.xlsx...")

XLSX = ROOT / "data" / "data" / "BASE.xlsx"
if not XLSX.exists():
    print(f"[ERROR] No existe {XLSX}")
    sys.exit(1)

wb = openpyxl.load_workbook(str(XLSX), read_only=True, data_only=True)

# Hoja1: índice 0=num, 1=Nombre, 2=RFC, 3=Dirección
ws1 = wb["Hoja1"]
h1 = []
for row in list(ws1.rows)[1:]:
    vals = [c.value for c in row]
    nombre = limpiar_nombre(vals[1] if len(vals) > 1 else "")
    rfc    = str(vals[2] or "").strip() if len(vals) > 2 else ""
    direccion = str(vals[3] or "").strip() if len(vals) > 3 else ""
    if nombre and nombre.lower() not in ("none", "nan", "nombre"):
        h1.append({
            "nombre":    nombre,
            "rfc":       rfc,
            "direccion": direccion,
            "fuente":    "hoja1_rfc",
        })

# Hoja2: índice 0=num, 1=FechaAlta, 2=NombreComercial
ws2 = wb["Hoja2"]
h2 = []
for row in list(ws2.rows)[1:]:
    vals = [c.value for c in row]
    fecha  = str(vals[1] or "").strip() if len(vals) > 1 else ""
    nombre = limpiar_nombre(vals[2] if len(vals) > 2 else "")
    if nombre and nombre.lower() not in ("none", "nan", "nombre comercial"):
        h2.append({
            "nombre":     nombre,
            "fecha_alta": fecha,
            "fuente":     "hoja2_licencia",
        })

print(f"  Hoja1 (RFC):        {len(h1):,} registros")
print(f"  Hoja2 (Licencias):  {len(h2):,} registros")

# ─── 2. CRUCE H1 × H2 ────────────────────────────────────────────────────────
print(f"\n[2/4] Cruzando Hoja1 × Hoja2 (nombres similares)...")
print(f"  Construyendo índice por tokens...")

# Índice inverso por tokens para acelerar la búsqueda
h2_norm = [(normalizar(b["nombre"]), b) for b in h2]
h2_token_index: dict[str, list[tuple[str, dict]]] = {}
for norm, data in h2_norm:
    for token in norm.split():
        if len(token) >= 4:
            h2_token_index.setdefault(token, []).append((norm, data))

matches_h1h2 = 0
FUZZY_H1H2 = 78  # umbral más alto porque no hay coordenadas para anclar

for a in h1:
    a_norm = normalizar(a["nombre"])
    a_tokens = {t for t in a_norm.split() if len(t) >= 4}

    # Candidatos H2 con al menos un token en común
    candidatos_h2: dict[str, tuple[str, dict]] = {}
    for tok in a_tokens:
        for item in h2_token_index.get(tok, []):
            candidatos_h2[item[0]] = item

    best_score = 0
    best_match = None
    for b_norm, b_data in candidatos_h2.values():
        score = max(
            fuzz.token_sort_ratio(a_norm, b_norm),
            fuzz.token_set_ratio(a_norm, b_norm),
        )
        if score > best_score:
            best_score = score
            best_match = b_data

    if best_score >= FUZZY_H1H2 and best_match:
        a["match_h2"]    = best_match["nombre"]
        a["score_h2"]    = best_score
        a["fecha_alta"]  = best_match.get("fecha_alta", "")
        matches_h1h2 += 1

print(f"  {matches_h1h2:,} negocios en AMBOS registros "
      f"(RFC + Licencia, score ≥ {FUZZY_H1H2})")

# ─── 3. CRUCE vs CANDIDATOS FIRESTORE ────────────────────────────────────────
print(f"\n[3/4] Cruzando BASE.xlsx vs candidatos en Firestore...")
print(f"  Descargando candidatos...")

candidatos = []
for doc in db.collection("candidatos").stream():
    d = doc.to_dict()
    d["_doc_id"] = doc.id
    candidatos.append(d)
print(f"  {len(candidatos):,} candidatos cargados")

# Índice inverso del BASE.xlsx (ambas hojas)
base_todos = h1 + h2
base_norm_list = [(normalizar(b["nombre"]), b) for b in base_todos]
base_token_index: dict[str, list[tuple[str, dict]]] = {}
for norm, data in base_norm_list:
    for token in norm.split():
        if len(token) >= 4:
            base_token_index.setdefault(token, []).append((norm, data))

FUZZY_CAND = 75  # mismo criterio que cruce.py

actualizados = 0
batch = db.batch()
batch_count = 0

print(f"  Buscando matches (umbral fuzzy ≥ {FUZZY_CAND})...")
for cand in candidatos:
    cand_norm = normalizar(cand.get("nombre", ""))
    cand_tokens = {t for t in cand_norm.split() if len(t) >= 4}

    # Candidatos BASE con token en común
    candidatos_base: dict[str, tuple[str, dict]] = {}
    for tok in cand_tokens:
        for item in base_token_index.get(tok, []):
            candidatos_base[item[0]] = item

    best_score = 0
    best_base = None
    for b_norm, b_data in candidatos_base.values():
        score = max(
            fuzz.token_sort_ratio(cand_norm, b_norm),
            fuzz.token_set_ratio(cand_norm, b_norm),
        )
        if score > best_score:
            best_score = score
            best_base = b_data

    if best_score >= FUZZY_CAND and best_base:
        update_data = {
            "es_informal":       False,
            "decision_fuente":   "formal_base_xlsx",
            "razon_decision":    (
                f"Match BASE.xlsx ({best_base['fuente']}): "
                f"{best_base['nombre']} (score={best_score})"
            ),
            "rfc_base":          best_base.get("rfc", ""),
            "fecha_alta_base":   best_base.get("fecha_alta", ""),
        }
        if not DRY_RUN:
            ref = db.collection("candidatos").document(cand["_doc_id"])
            batch.update(ref, update_data)
            batch_count += 1
            actualizados += 1
            if batch_count >= 500:
                batch.commit()
                batch = db.batch()
                batch_count = 0
                print(f"    ...{actualizados} actualizados")
        else:
            actualizados += 1

if not DRY_RUN and batch_count > 0:
    batch.commit()

print(f"  ✓ {actualizados:,} candidatos reclasificados → formal_base_xlsx")

# ─── 4. SUBIR A padron_formal (SOLO NUEVOS) ───────────────────────────────────
print(f"\n[4/4] Subiendo a padron_formal (solo nuevos)...")

# Leer IDs ya existentes en padron_formal (un solo stream = eficiente)
existing_ids: set[str] = set()
for doc in db.collection("padron_formal").stream():
    existing_ids.add(doc.id)
print(f"  {len(existing_ids):,} documentos ya existen en padron_formal → se omiten")

# Preparar documentos a subir
docs_nuevos: dict[str, dict] = {}
timestamp = datetime.utcnow().isoformat()

# Hoja1: doc_id = RFC (único y estable) o hash si no hay RFC
for b in h1:
    doc_id = b["rfc"] if b["rfc"] else ("h1_" + make_doc_id(b["nombre"]))
    if doc_id in existing_ids:
        continue
    docs_nuevos[doc_id] = {
        "nombre":       b["nombre"],
        "nombre_norm":  normalizar(b["nombre"]),
        "rfc":          b["rfc"],
        "direccion":    b["direccion"],
        "fuente":       "hoja1_rfc",
        "match_h2":     b.get("match_h2", ""),
        "score_h2":     b.get("score_h2", 0),
        "fecha_alta":   b.get("fecha_alta", ""),
        "importado_en": timestamp,
    }

# Hoja2: doc_id = hash del nombre normalizado
nuevos_solo_h2 = 0
for b in h2:
    doc_id = "h2_" + make_doc_id(b["nombre"])
    if doc_id in existing_ids:
        continue
    if doc_id in docs_nuevos:
        continue  # ya cubierto por H1
    docs_nuevos[doc_id] = {
        "nombre":       limpiar_nombre(b["nombre"]),
        "nombre_norm":  normalizar(b["nombre"]),
        "fecha_alta":   b["fecha_alta"],
        "fuente":       "hoja2_licencia",
        "importado_en": timestamp,
    }
    nuevos_solo_h2 += 1

nuevos_h1 = len([d for d in docs_nuevos.values() if d["fuente"] == "hoja1_rfc"])
print(f"  Nuevos de Hoja1 (RFC):       {nuevos_h1:,}")
print(f"  Nuevos de Hoja2 (Licencias): {nuevos_solo_h2:,}")
print(f"  Total a subir:               {len(docs_nuevos):,}")

if not DRY_RUN:
    batch = db.batch()
    batch_count = 0
    total_subidos = 0

    for doc_id, data in docs_nuevos.items():
        ref = db.collection("padron_formal").document(doc_id)
        batch.set(ref, data)
        batch_count += 1
        total_subidos += 1
        if batch_count >= 500:
            batch.commit()
            batch = db.batch()
            batch_count = 0
            print(f"    ...{total_subidos:,} documentos subidos")

    if batch_count > 0:
        batch.commit()

    print(f"  ✓ {total_subidos:,} documentos subidos a padron_formal")
else:
    print(f"  [DRY-RUN] Se subirían {len(docs_nuevos):,} documentos")

# ─── RESUMEN ──────────────────────────────────────────────────────────────────
print(f"\n{'=' * 60}")
print("RESUMEN")
print(f"{'=' * 60}")
print(f"Hoja1 (RFC):           {len(h1):,}")
print(f"Hoja2 (Licencias):     {len(h2):,}")
print(f"Match H1 ∩ H2:         {matches_h1h2:,}  (mismos negocios en ambos registros)")
print(f"Candidatos actualizados: {actualizados:,}  (reclasificados como formales)")
print(f"Nuevos en padron_formal: {len(docs_nuevos):,}")
if DRY_RUN:
    print("\n[DRY-RUN] Ejecuta sin --dry-run para escribir en Firestore")
else:
    print("\nSiguiente: verifica en Firebase Console → colección 'padron_formal'")
