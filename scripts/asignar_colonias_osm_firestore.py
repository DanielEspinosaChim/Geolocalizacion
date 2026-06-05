"""
asignar_colonias_osm_firestore.py
==================================
Asigna la colonia real OSM a cada candidato en Firestore usando
point-in-polygon contra los 205 polígonos reales de colonias_merida.geojson.

No necesita internet ni API externa. Solo Shapely + los polígonos locales.

Uso:
    python scripts/asignar_colonias_osm_firestore.py
"""

import json
import sys
from pathlib import Path

try:
    from shapely.geometry import shape, Point
except ImportError:
    print("[ERROR] Instala shapely: pip install shapely")
    sys.exit(1)

ROOT = Path(__file__).parent.parent
SA   = ROOT / "service_account.json"
COLONIAS_GEOJSON = ROOT / "data/procesado/colonias_merida.geojson"

if not SA.exists():
    print(f"[ERROR] No existe {SA}")
    sys.exit(1)

if not COLONIAS_GEOJSON.exists():
    print(f"[ERROR] No existe {COLONIAS_GEOJSON}")
    sys.exit(1)

import firebase_admin
from firebase_admin import credentials, firestore

if not firebase_admin._apps:
    firebase_admin.initialize_app(credentials.Certificate(str(SA)))

db = firestore.client()


# ── 1. Cargar polígonos OSM reales ─────────────────────────────────────────────

print("[1/3] Cargando polígonos OSM de colonias...")
with open(COLONIAS_GEOJSON, encoding="utf-8") as f:
    geojson = json.load(f)

colonias = []
for feat in geojson.get("features", []):
    props = feat.get("properties", {})
    geom  = feat.get("geometry")
    if not geom:
        continue
    nombre = (props.get("nombre") or props.get("nombre_raw") or "").strip().upper()
    if not nombre:
        continue
    try:
        shp = shape(geom)
        if not shp.is_valid:
            shp = shp.buffer(0)  # repara polígonos inválidos
        colonias.append({"nombre": nombre, "shape": shp})
    except Exception:
        continue

print(f"   {len(colonias)} polígonos cargados")


def encontrar_colonia(lat, lng):
    """Devuelve el nombre de la colonia OSM donde cae el punto.
    Si no cae en ningún polígono, asigna siempre la más cercana."""
    pt = Point(float(lng), float(lat))
    for col in colonias:
        try:
            if col["shape"].contains(pt):
                return col["nombre"]
        except Exception:
            continue
    # Fallback: colonia más cercana sin límite de distancia
    min_dist = float("inf")
    nombre_cercano = ""
    for col in colonias:
        dist = col["shape"].distance(pt)  # distancia al borde del polígono, no al centroide
        if dist < min_dist:
            min_dist = dist
            nombre_cercano = col["nombre"]
    return nombre_cercano


# ── 2. Leer candidatos de Firestore ────────────────────────────────────────────

print("[2/3] Leyendo candidatos de Firestore...")
docs = list(db.collection("candidatos").stream())
informales = [d for d in docs if d.to_dict().get("es_informal")]
print(f"   {len(docs)} candidatos totales, {len(informales)} informales")


# ── 3. Asignar colonia y actualizar Firestore ──────────────────────────────────

print("[3/3] Asignando colonias y actualizando Firestore...")

batch     = db.batch()
count     = 0
committed = 0
asignados = 0
sin_colonia = 0

from collections import Counter
distribucion = Counter()

for i, doc in enumerate(informales):
    d   = doc.to_dict()
    lat = d.get("lat")
    lng = d.get("lng")

    colonia = ""
    if lat and lng:
        colonia = encontrar_colonia(lat, lng)

    if colonia:
        asignados += 1
        distribucion[colonia] += 1
    else:
        sin_colonia += 1

    batch.update(doc.reference, {"colonia_nombre": colonia})
    count += 1

    if count % 400 == 0:
        batch.commit()
        committed += count
        pct = (i + 1) / len(informales) * 100
        print(f"   {committed}/{len(informales)} ({pct:.0f}%) — {asignados} con colonia")
        batch = db.batch()
        count = 0

if count > 0:
    batch.commit()
    committed += count

print(f"\n=== RESULTADO ===")
print(f"Candidatos informales:      {len(informales)}")
print(f"Con colonia OSM asignada:   {asignados} ({asignados/len(informales)*100:.1f}%)")
print(f"Sin colonia (fuera de map): {sin_colonia}")
print(f"\nTop 15 colonias con más negocios informales:")
for nombre, cnt in distribucion.most_common(15):
    print(f"  {nombre}: {cnt}")

print("\n[OK] Listo. Recarga la app para ver los cambios.")
