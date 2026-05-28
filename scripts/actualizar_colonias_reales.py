"""
actualizar_colonias_reales.py
==============================
Asigna la colonia real de Merida a cada candidato usando reverse geocoding
de Nominatim (OpenStreetMap) por lat/lng.

Proceso:
  1. Lee todos los candidatos de Firestore
  2. Para cada candidato hace reverse geocoding en Nominatim
  3. Extrae el nombre de colonia/suburb/neighbourhood/quarter
  4. Guarda colonia_nombre en Firestore
  5. Genera zonas reales (colonias unicas con bounding box) en coleccion "zonas"

Respeta el rate limit de Nominatim: 1 request/segundo max.
Con ~1100 candidatos informales tarda ~20 minutos.

Uso:
    cd <raiz-proyecto>
    python scripts/actualizar_colonias_reales.py
"""

import json, sys, time
from pathlib import Path
import requests

ROOT = Path(__file__).parent.parent
SA   = ROOT / "service_account.json"

import firebase_admin
from firebase_admin import credentials, firestore

if not firebase_admin._apps:
    if not SA.exists():
        print(f"[ERROR] No existe {SA}")
        sys.exit(1)
    firebase_admin.initialize_app(credentials.Certificate(str(SA)))

db = firestore.client()

NOMINATIM = "https://nominatim.openstreetmap.org/reverse"
HEADERS   = {"User-Agent": "GeoFormalMerida/1.0 contacto@canaco.mx"}

# Cache en disco para no repetir requests si el script se interrumpe
CACHE_FILE = ROOT / "cache" / "nominatim_cache.json"
CACHE_FILE.parent.mkdir(exist_ok=True)
if CACHE_FILE.exists():
    with open(CACHE_FILE, encoding="utf-8") as f:
        _cache = json.load(f)
else:
    _cache = {}

def save_cache():
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(_cache, f, ensure_ascii=False)

def get_colonia(lat, lng):
    """Reverse geocoding con Nominatim. Devuelve (colonia_nombre, display_name)."""
    key = f"{round(float(lat),5)},{round(float(lng),5)}"
    if key in _cache:
        return _cache[key]

    try:
        r = requests.get(
            NOMINATIM,
            params={
                "lat": lat, "lon": lng,
                "format": "jsonv2",
                "addressdetails": 1,
                "zoom": 16,        # nivel colonia/barrio
                "accept-language": "es",
            },
            headers=HEADERS,
            timeout=15,
        )
        time.sleep(1.1)  # respetar rate limit Nominatim

        if r.status_code != 200:
            _cache[key] = ("", "")
            return ("", "")

        data    = r.json()
        addr    = data.get("address", {})
        display = data.get("display_name", "")

        # Jerarquia de campos de colonia en Nominatim
        colonia = (
            addr.get("neighbourhood") or
            addr.get("suburb") or
            addr.get("quarter") or
            addr.get("residential") or
            addr.get("hamlet") or
            addr.get("village") or
            ""
        )
        colonia = colonia.strip().upper()
        _cache[key] = (colonia, display)
        return (colonia, display)

    except Exception as ex:
        print(f"  [warn] Error geocoding {lat},{lng}: {ex}")
        _cache[key] = ("", "")
        return ("", "")


# ══════════════════════════════════════════════════════════════════════════════
print("\n[1/3] Leyendo candidatos de Firestore...")
docs  = list(db.collection("candidatos").stream())
total = len(docs)
informales = [d for d in docs if d.to_dict().get("es_informal")]
print(f"   {total} candidatos totales, {len(informales)} informales")

# ══════════════════════════════════════════════════════════════════════════════
print(f"\n[2/3] Reverse geocoding (Nominatim, ~1 req/seg)...")
print(f"   Estimado: ~{len(informales)//60 + 1} minutos\n")

batch     = db.batch()
count     = 0
committed = 0
asignados = 0

for i, doc in enumerate(informales):
    d   = doc.to_dict()
    lat = d.get("lat")
    lng = d.get("lng")

    colonia = ""
    if lat and lng:
        colonia, _ = get_colonia(lat, lng)

    if colonia:
        asignados += 1

    batch.update(doc.reference, {"colonia_nombre": colonia})
    count += 1

    if count % 400 == 0:
        batch.commit()
        committed += count
        save_cache()
        pct = (i + 1) / len(informales) * 100
        print(f"   {committed}/{len(informales)} ({pct:.0f}%) — {asignados} con colonia asignada")
        batch = db.batch()
        count = 0

if count > 0:
    batch.commit()
    committed += count
    save_cache()

print(f"\n   Resultado: {asignados}/{len(informales)} candidatos con colonia ({asignados/len(informales)*100:.1f}%)")

# ══════════════════════════════════════════════════════════════════════════════
print("\n[3/3] Generando zonas (colonias unicas) en Firestore...")

# Recargar datos actualizados
docs  = list(db.collection("candidatos").stream())
from collections import defaultdict
zona_coords = defaultdict(list)  # colonia_nombre -> [(lat,lng), ...]

for doc in docs:
    d = doc.to_dict()
    col = (d.get("colonia_nombre") or "").strip().upper()
    if col and d.get("lat") and d.get("lng"):
        zona_coords[col].append((float(d["lat"]), float(d["lng"])))

# Borrar zonas viejas
old_docs = list(db.collection("zonas").stream())
batch = db.batch()
count = 0
for d in old_docs:
    batch.delete(d.reference)
    count += 1
    if count % 400 == 0:
        batch.commit()
        batch = db.batch()
        count = 0
if count > 0:
    batch.commit()
print(f"   {len(old_docs)} zonas antiguas eliminadas")

# Crear una zona por colonia usando bounding box como geometria
# (rectangulo simple — suficiente para visualizacion en el mapa)
batch = db.batch()
count = 0
saved = 0

for nombre, pts in sorted(zona_coords.items()):
    if not pts:
        continue
    lats = [p[0] for p in pts]
    lngs = [p[1] for p in pts]
    min_lat, max_lat = min(lats), max(lats)
    min_lng, max_lng = min(lngs), max(lngs)

    # Agregar un pequeno margen (0.003 grados ~ 300m)
    PAD = 0.003
    min_lat -= PAD; max_lat += PAD
    min_lng -= PAD; max_lng += PAD

    geom = {
        "type": "Polygon",
        "coordinates": [[
            [min_lng, min_lat],
            [max_lng, min_lat],
            [max_lng, max_lat],
            [min_lng, max_lat],
            [min_lng, min_lat],
        ]]
    }

    doc_id = nombre.replace(" ", "_").replace("/", "-")[:80]
    ref = db.collection("zonas").document(doc_id)
    batch.set(ref, {
        "id":            doc_id,
        "nombre":        nombre.title(),
        "geometry_json": json.dumps(geom),
        "num_candidatos": len(pts),
    })
    count += 1
    saved += 1

    if count % 400 == 0:
        batch.commit()
        batch = db.batch()
        count = 0

if count > 0:
    batch.commit()

print(f"   {saved} colonias unicas guardadas como zonas")
print(f"\n[OK] Listo. {asignados} candidatos con colonia real asignada.")
