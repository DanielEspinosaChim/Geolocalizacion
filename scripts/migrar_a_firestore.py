"""
Migración SQLite → Firestore (Canaco Info)
==========================================
Copia las colecciones:
  - candidatos  (negocios informales)
  - colonias    (zonas Voronoi)
  - campanas    (campañas de visita)
  - campana_negocios → subcolección campanas/{id}/negocios
  - reportes    (reportes ciudadanos)

Uso:
    python scripts/migrar_a_firestore.py
"""
import sys
import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT / "backend"))

DB = ROOT / "data" / "procesado" / "negocios.db"

if not DB.exists():
    print(f"[ERROR] No existe {DB}")
    sys.exit(1)

# Inicializar Firestore
import firebase_admin
from firebase_admin import credentials, firestore

SA = ROOT / "service_account.json"
cred = credentials.Certificate(str(SA))
firebase_admin.initialize_app(cred)
db = firestore.client()

conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row


def batch_upload(collection_name, rows, key_field=None, transform=None):
    """Sube filas en lotes de 500 (límite de Firestore)."""
    total = 0
    batch = db.batch()
    count = 0
    for row in rows:
        d = dict(row)
        if transform:
            d = transform(d)
        doc_id = str(d[key_field]) if key_field else None
        ref = db.collection(collection_name).document(doc_id) if doc_id else db.collection(collection_name).document()
        batch.set(ref, d)
        count += 1
        total += 1
        if count >= 500:
            batch.commit()
            batch = db.batch()
            count = 0
            print(f"  ...{total} documentos subidos")
    if count > 0:
        batch.commit()
    return total


# ══════════════════════════════════════════════════════════════
# 1. CANDIDATOS
# ══════════════════════════════════════════════════════════════
print("\n[1/5] Migrando candidatos...")
rows = conn.execute("SELECT * FROM candidatos").fetchall()

def transform_candidato(d):
    d["lat"] = float(d["lat"]) if d["lat"] else None
    d["lng"] = float(d["lng"]) if d["lng"] else None
    d["colonia_id"] = int(d["colonia_id"]) if d["colonia_id"] else None
    # doc_id no puede tener "/" — usamos el place_id encodeado
    d["_doc_id"] = d["place_id"].replace("/", "__")
    return d

def batch_upload_candidatos(rows):
    total = 0
    batch = db.batch()
    count = 0
    for row in rows:
        d = transform_candidato(dict(row))
        doc_id = d.pop("_doc_id")
        ref = db.collection("candidatos").document(doc_id)
        batch.set(ref, d)
        count += 1
        total += 1
        if count >= 500:
            batch.commit()
            batch = db.batch()
            count = 0
            print(f"  ...{total} documentos subidos")
    if count > 0:
        batch.commit()
    return total

n = batch_upload_candidatos(rows)
print(f"  ✓ {n} candidatos migrados")


# ══════════════════════════════════════════════════════════════
# 2. COLONIAS
# ══════════════════════════════════════════════════════════════
print("\n[2/5] Migrando colonias...")
rows = conn.execute("SELECT * FROM colonias").fetchall()

def transform_colonia(d):
    d["id"] = int(d["id"])
    # geometry_geojson es string JSON — dejarlo como string para no exceder límite de doc
    return d

n = batch_upload("colonias", rows, key_field="id", transform=transform_colonia)
print(f"  ✓ {n} colonias migradas")


# ══════════════════════════════════════════════════════════════
# 3. CAMPANAS
# ══════════════════════════════════════════════════════════════
print("\n[3/5] Migrando campañas...")
rows = conn.execute("SELECT * FROM campanas").fetchall()

def transform_campana(d):
    d["id"] = int(d["id"])
    return d

n = batch_upload("campanas", rows, key_field="id", transform=transform_campana)
print(f"  ✓ {n} campañas migradas")


# ══════════════════════════════════════════════════════════════
# 4. CAMPANA_NEGOCIOS (subcolección dentro de cada campaña)
# ══════════════════════════════════════════════════════════════
print("\n[4/5] Migrando negocios de campañas...")
rows = conn.execute("SELECT * FROM campana_negocios").fetchall()

total = 0
batch = db.batch()
count = 0
for row in rows:
    d = dict(row)
    campana_id = str(d["campana_id"])
    negocio_id = str(d["id"])
    d["campana_id"] = int(d["campana_id"])
    d["completado"]  = int(d["completado"] or 0)
    ref = db.collection("campanas").document(campana_id).collection("negocios").document(negocio_id)
    batch.set(ref, d)
    count += 1
    total += 1
    if count >= 500:
        batch.commit()
        batch = db.batch()
        count = 0
if count > 0:
    batch.commit()
print(f"  ✓ {total} registros campana_negocios migrados")


# ══════════════════════════════════════════════════════════════
# 5. REPORTES
# ══════════════════════════════════════════════════════════════
print("\n[5/5] Migrando reportes...")
try:
    rows = conn.execute("SELECT * FROM reportes").fetchall()
    def transform_reporte(d):
        d["id"] = int(d["id"])
        d["lat"] = float(d["lat"])
        d["lng"] = float(d["lng"])
        return d
    n = batch_upload("reportes", rows, key_field="id", transform=transform_reporte)
    print(f"  ✓ {n} reportes migrados")
except Exception as e:
    print(f"  Sin reportes o error: {e}")

conn.close()
print("\n[OK] Migración completa a Firestore (canaco-info)")
