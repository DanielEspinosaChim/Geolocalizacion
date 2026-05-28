"""
actualizar_zonas_poligonos.py
==============================
Reemplaza las bounding-box horribles en Firestore "zonas" con:
  1. Poligono real de OSM (si existe para esa colonia)
  2. Convex hull de los puntos de los candidatos (si no hay OSM)

Uso:
    cd <raiz-proyecto>
    python scripts/actualizar_zonas_poligonos.py
"""

import json, sys, time, re, unicodedata
from pathlib import Path
from collections import defaultdict
import requests
from shapely.geometry import MultiPoint, shape, mapping
from shapely.ops import unary_union

ROOT = Path(__file__).parent.parent
SA   = ROOT / "service_account.json"

import firebase_admin
from firebase_admin import credentials, firestore

if not firebase_admin._apps:
    firebase_admin.initialize_app(credentials.Certificate(str(SA)))
db = firestore.client()


def normalize(s):
    """Quita acentos, minusculas, colapsa espacios."""
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", s).strip().lower()


# ══════════════════════════════════════════════════════════════════════════════
# 1. Descargar poligonos de colonias de OSM
#    Usamos place~suburb|neighbourhood|quarter|residential + admin_level 9|10
# ══════════════════════════════════════════════════════════════════════════════
print("\n[1/4] Descargando poligonos de colonias de Merida (OSM)...")

OVERPASS = "https://overpass-api.de/api/interpreter"
QUERY = """
[out:json][timeout:120];
area["name"="Mérida"]["admin_level"="6"]["boundary"="administrative"]->.merida;
(
  relation["boundary"="administrative"]["admin_level"~"^(9|10)$"](area.merida);
  relation["place"~"suburb|neighbourhood|quarter|residential"](area.merida);
  way["place"~"suburb|neighbourhood|quarter|residential"](area.merida);
);
out body;
>;
out skel qt;
"""

resp = requests.get(
    OVERPASS,
    params={"data": QUERY},
    headers={"User-Agent": "GeoFormalMerida/1.0"},
    timeout=150,
)
if resp.status_code != 200:
    print(f"  Overpass error {resp.status_code}, intentando servidor alternativo...")
    resp = requests.get(
        "https://overpass.kumi.systems/api/interpreter",
        params={"data": QUERY},
        headers={"User-Agent": "GeoFormalMerida/1.0"},
        timeout=150,
    )

osm = resp.json()
elements    = osm["elements"]
nodes_by_id = {e["id"]: (e["lon"], e["lat"]) for e in elements if e["type"] == "node"}
ways_by_id  = {e["id"]: e for e in elements if e["type"] == "way"}
relations   = [e for e in elements if e["type"] == "relation"]
way_areas   = [e for e in elements if e["type"] == "way" and e.get("tags")]

print(f"   {len(relations)} relaciones, {len(way_areas)} ways con tags descargados")


def way_to_coords(way_id):
    w = ways_by_id.get(way_id)
    if not w:
        return []
    return [nodes_by_id[n] for n in w.get("nodes", []) if n in nodes_by_id]


def relation_to_geom(rel):
    outer, inner = [], []
    for m in rel.get("members", []):
        if m["type"] != "way":
            continue
        coords = way_to_coords(m["ref"])
        if len(coords) < 3:
            continue
        if coords[0] != coords[-1]:
            coords.append(coords[0])
        (inner if m.get("role") == "inner" else outer).append(coords)
    if not outer:
        return None
    from shapely.geometry import Polygon
    polys = []
    for o in outer:
        try:
            p = Polygon(o, inner).buffer(0)
            if not p.is_empty:
                polys.append(p)
        except Exception:
            pass
    if not polys:
        return None
    return unary_union(polys)


def way_to_geom(way):
    coords = [nodes_by_id[n] for n in way.get("nodes", []) if n in nodes_by_id]
    if len(coords) < 3:
        return None
    if coords[0] != coords[-1]:
        coords.append(coords[0])
    from shapely.geometry import Polygon
    try:
        return Polygon(coords).buffer(0)
    except Exception:
        return None


# Construir dict: nombre_normalizado -> geometria Shapely
osm_polys = {}  # nombre_norm -> (nombre_original, geom)

for rel in relations:
    tags = rel.get("tags", {})
    nombre = (tags.get("name") or "").strip()
    if not nombre:
        continue
    geom = relation_to_geom(rel)
    if geom and not geom.is_empty:
        key = normalize(nombre)
        # Si ya existe, hacer union (puede haber duplicados de nombre)
        if key in osm_polys:
            osm_polys[key] = (nombre, unary_union([osm_polys[key][1], geom]))
        else:
            osm_polys[key] = (nombre, geom)

for way in way_areas:
    tags = way.get("tags", {})
    nombre = (tags.get("name") or "").strip()
    if not nombre:
        continue
    geom = way_to_geom(way)
    if geom and not geom.is_empty:
        key = normalize(nombre)
        if key in osm_polys:
            osm_polys[key] = (nombre, unary_union([osm_polys[key][1], geom]))
        else:
            osm_polys[key] = (nombre, geom)

print(f"   {len(osm_polys)} colonias con poligono real en OSM")


# ══════════════════════════════════════════════════════════════════════════════
# 2. Leer candidatos de Firestore y agrupar por colonia_nombre
# ══════════════════════════════════════════════════════════════════════════════
print("\n[2/4] Leyendo candidatos de Firestore...")

docs = list(db.collection("candidatos").stream())
zona_pts = defaultdict(list)  # colonia_nombre_upper -> [(lng, lat), ...]

for doc in docs:
    d = doc.to_dict()
    col = (d.get("colonia_nombre") or "").strip().upper()
    if col and d.get("lat") and d.get("lng"):
        zona_pts[col].append((float(d["lng"]), float(d["lat"])))

print(f"   {len(zona_pts)} colonias unicas con candidatos")


# ══════════════════════════════════════════════════════════════════════════════
# 3. Para cada colonia: OSM polygon si existe, sino convex hull
# ══════════════════════════════════════════════════════════════════════════════
print("\n[3/4] Construyendo geometrias...")

zonas_final = []
con_osm  = 0
con_hull = 0
PAD = 0.002  # ~200m de margen

for nombre_upper, pts in sorted(zona_pts.items()):
    key = normalize(nombre_upper)
    geom = None

    # Buscar en OSM (exacto primero, luego contenido)
    if key in osm_polys:
        geom = osm_polys[key][1]
        con_osm += 1
    else:
        # Busqueda parcial: colonia cuyo nombre OSM contiene esta clave
        for osm_key, (_, osm_geom) in osm_polys.items():
            if key in osm_key or osm_key in key:
                geom = osm_geom
                con_osm += 1
                break

    if geom is None:
        # Convex hull de los puntos de candidatos + pequeno buffer
        if len(pts) >= 3:
            geom = MultiPoint(pts).convex_hull.buffer(PAD)
        elif len(pts) == 2:
            from shapely.geometry import LineString
            geom = LineString(pts).buffer(PAD)
        else:
            from shapely.geometry import Point
            geom = Point(pts[0]).buffer(PAD)
        con_hull += 1

    geom_dict = mapping(geom)
    zonas_final.append({
        "nombre":   nombre_upper.title(),
        "nombre_upper": nombre_upper,
        "geojson":  geom_dict,
        "num_pts":  len(pts),
        "fuente":   "osm" if con_osm > con_hull else "hull",
    })

# Arreglar fuente correctamente (se calculaba mal en el loop)
zonas_final = []
con_osm = 0
con_hull = 0

for nombre_upper, pts in sorted(zona_pts.items()):
    key = normalize(nombre_upper)
    geom = None
    fuente = "hull"

    if key in osm_polys:
        geom = osm_polys[key][1]
        fuente = "osm"
        con_osm += 1
    else:
        for osm_key in osm_polys:
            if key in osm_key or osm_key in key:
                geom = osm_polys[osm_key][1]
                fuente = "osm"
                con_osm += 1
                break

    if geom is None:
        if len(pts) >= 3:
            geom = MultiPoint(pts).convex_hull.buffer(PAD)
        elif len(pts) == 2:
            from shapely.geometry import LineString
            geom = LineString(pts).buffer(PAD)
        else:
            from shapely.geometry import Point
            geom = Point(pts[0]).buffer(PAD)
        fuente = "hull"
        con_hull += 1

    zonas_final.append({
        "nombre":       nombre_upper.title(),
        "nombre_upper": nombre_upper,
        "geojson":      mapping(geom),
        "num_pts":      len(pts),
        "fuente":       fuente,
    })

print(f"   Con poligono OSM real: {con_osm}")
print(f"   Con convex hull (sin OSM): {con_hull}")


# ══════════════════════════════════════════════════════════════════════════════
# 4. Guardar en Firestore
# ══════════════════════════════════════════════════════════════════════════════
print("\n[4/4] Guardando zonas en Firestore...")

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

batch = db.batch()
count = 0
for z in zonas_final:
    doc_id = re.sub(r"[^a-zA-Z0-9_-]", "_", z["nombre_upper"])[:80]
    ref = db.collection("zonas").document(doc_id)
    batch.set(ref, {
        "id":             doc_id,
        "nombre":         z["nombre"],
        "geometry_json":  json.dumps(z["geojson"]),
        "num_candidatos": z["num_pts"],
        "fuente":         z["fuente"],
    })
    count += 1
    if count % 400 == 0:
        batch.commit()
        batch = db.batch()
        count = 0
if count > 0:
    batch.commit()

print(f"   {len(zonas_final)} zonas guardadas")
print(f"\n[OK] Listo: {con_osm} con poligono OSM real, {con_hull} con convex hull.")
