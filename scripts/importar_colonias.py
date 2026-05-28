"""
Importar colonias de Mérida — Voronoi tessellation sobre candidatos

Genera zonas garantizadas SIN traslape usando:
  1. K-means para encontrar centroides óptimos
  2. Voronoi + Shapely para crear polígonos no solapados
  3. Opcionalmente intenta nombrar las zonas con datos de OSM

    python scripts/importar_colonias.py

Solo necesitas correrlo una vez (o cuando cambien los candidatos).
"""
import sqlite3
import json
import math
import sys
import requests
import numpy as np
from pathlib import Path
from scipy.spatial import Voronoi
from shapely.geometry import Polygon, MultiPolygon, Point, mapping
from shapely.ops import unary_union

ROOT = Path(__file__).parent.parent
DB   = ROOT / "data" / "procesado" / "negocios.db"

if not DB.exists():
    print(f"[ERROR] No existe {DB}")
    sys.exit(1)

conn = sqlite3.connect(DB)
conn.execute("PRAGMA journal_mode=WAL")

# ══════════════════════════════════════════════════════════════
# PASO 1: Cargar candidatos
# ══════════════════════════════════════════════════════════════
print("Paso 1: Cargando candidatos...")
candidatos = conn.execute(
    "SELECT place_id, lat, lng FROM candidatos WHERE lat IS NOT NULL AND lng IS NOT NULL"
).fetchall()
print(f"  {len(candidatos)} candidatos con coordenadas")

coords = np.array([(lat, lng) for _, lat, lng in candidatos])

# Bounding box de Mérida con margen
LAT_MIN, LAT_MAX = coords[:, 0].min() - 0.05, coords[:, 0].max() + 0.05
LNG_MIN, LNG_MAX = coords[:, 1].min() - 0.05, coords[:, 1].max() + 0.05

merida_box = Polygon([
    (LNG_MIN, LAT_MIN), (LNG_MAX, LAT_MIN),
    (LNG_MAX, LAT_MAX), (LNG_MIN, LAT_MAX),
])

# ══════════════════════════════════════════════════════════════
# PASO 2: K-means para encontrar centroides
# ══════════════════════════════════════════════════════════════
print("Paso 2: Calculando clusters (k-means)...")

# ~1 zona por cada 20-25 candidatos, mínimo 10
n_clusters = max(10, len(candidatos) // 22)
print(f"  Número de zonas: {n_clusters}")

try:
    from sklearn.cluster import KMeans
    km = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    km.fit(coords)
    centroids = km.cluster_centers_  # shape (n, 2) en [lat, lng]
    labels    = km.labels_
    print(f"  K-means convergido con {n_clusters} clusters")
except ImportError:
    # Fallback manual si sklearn no está
    import random
    random.seed(42)
    centroids = np.array(random.sample(list(coords), n_clusters), dtype=float)
    for _ in range(30):
        dists  = np.linalg.norm(coords[:, None] - centroids[None, :], axis=2)
        labels = dists.argmin(axis=1)
        for k in range(n_clusters):
            mask = labels == k
            if mask.any():
                centroids[k] = coords[mask].mean(axis=0)

# ══════════════════════════════════════════════════════════════
# PASO 3: Voronoi tessellation → polígonos sin traslape
# ══════════════════════════════════════════════════════════════
print("Paso 3: Generando polígonos Voronoi (sin traslape)...")

# Convertir centroides a (lng, lat) para Shapely/GeoJSON
centroids_xy = np.column_stack([centroids[:, 1], centroids[:, 0]])  # (lng, lat)

# Agregar puntos fantasma en las esquinas para que Voronoi cierre bien
margin = 2.0
phantom = np.array([
    [LNG_MIN - margin, LAT_MIN - margin],
    [LNG_MAX + margin, LAT_MIN - margin],
    [LNG_MAX + margin, LAT_MAX + margin],
    [LNG_MIN - margin, LAT_MAX + margin],
])
all_points = np.vstack([centroids_xy, phantom])

vor = Voronoi(all_points)

def voronoi_finite_polygon(vor, point_idx, clip_poly):
    """Obtiene el polígono Voronoi de un punto y lo recorta al área de Mérida."""
    region_idx = vor.point_region[point_idx]
    region     = vor.regions[region_idx]

    if not region or -1 in region:
        # Región infinita — usar bounding box completo
        return clip_poly

    polygon = Polygon(vor.vertices[region])
    clipped = polygon.intersection(clip_poly)
    return clipped if not clipped.is_empty else None

# Construir nombre por cantidad de candidatos en cada cluster
cluster_counts = {}
for k in range(n_clusters):
    cluster_counts[k] = int((labels == k).sum())

zonas = []
for k in range(n_clusters):
    poly = voronoi_finite_polygon(vor, k, merida_box)
    if poly is None or poly.is_empty:
        continue

    geom_dict = mapping(poly)
    # Asegurarnos de que sea serializable
    geom_json = json.dumps(geom_dict)

    lat_c = float(centroids[k, 0])
    lng_c = float(centroids[k, 1])
    count = cluster_counts[k]
    nombre = f"Zona {k+1} ({count} negocios)"

    zonas.append((nombre, geom_json, lat_c, lng_c, k))

print(f"  {len(zonas)} polígonos Voronoi generados")

# ══════════════════════════════════════════════════════════════
# PASO 4 (opcional): Intentar nombrar zonas con OSM
# ══════════════════════════════════════════════════════════════
print("Paso 4: Intentando obtener nombres de colonias de OSM...")

osm_names = {}
try:
    bbox  = f"{LAT_MIN},{LNG_MIN},{LAT_MAX},{LNG_MAX}"
    query = f"""
[out:json][timeout:60];
(
  way["place"~"neighbourhood|suburb|quarter"]({bbox});
  relation["place"~"neighbourhood|suburb|quarter"]({bbox});
);
out body; >; out skel qt;
"""
    r = requests.get("https://overpass-api.de/api/interpreter",
                     params={"data": query}, timeout=60)
    if r.status_code == 200:
        elements = r.json().get("elements", [])
        nodes = {e["id"]: (e["lon"], e["lat"]) for e in elements if e["type"] == "node"}
        for e in elements:
            if e["type"] == "way" and "tags" in e and "name" in e["tags"]:
                way_nodes = e.get("nodes", [])
                if way_nodes:
                    lats = [nodes[n][1] for n in way_nodes if n in nodes]
                    lngs = [nodes[n][0] for n in way_nodes if n in nodes]
                    if lats:
                        clat = sum(lats) / len(lats)
                        clng = sum(lngs) / len(lngs)
                        osm_names[e["tags"]["name"]] = (clat, clng)
        print(f"  {len(osm_names)} colonias OSM obtenidas para nombrar zonas")
    else:
        print(f"  OSM no respondió ({r.status_code}), se usarán nombres genéricos")
except Exception as ex:
    print(f"  No se pudo conectar a OSM: {ex}")

# Asignar nombre OSM a cada zona si hay una colonia OSM dentro del polígono Voronoi
if osm_names:
    zonas_named = []
    for nombre, geom_json, lat_c, lng_c, k in zonas:
        best_name = None
        best_dist = float("inf")
        poly = Polygon(json.loads(geom_json)["coordinates"][0]) \
               if json.loads(geom_json)["type"] == "Polygon" else None

        for osm_nombre, (olat, olng) in osm_names.items():
            pt = Point(olng, olat)
            if poly and poly.contains(pt):
                dist = math.sqrt((lat_c - olat)**2 + (lng_c - olng)**2)
                if dist < best_dist:
                    best_dist = dist
                    best_name = osm_nombre

        count = cluster_counts[k]
        final_nombre = best_name if best_name else f"Zona {k+1} ({count} negocios)"
        zonas_named.append((final_nombre, geom_json, lat_c, lng_c))
    zonas = zonas_named
else:
    zonas = [(n, g, la, lo) for n, g, la, lo, _ in zonas]

# ══════════════════════════════════════════════════════════════
# PASO 5: Guardar en la base de datos
# ══════════════════════════════════════════════════════════════
print("Paso 5: Guardando colonias en la base de datos...")

conn.execute("DELETE FROM colonias")
all_colonias = []

for nombre, geom_json, lat_c, lng_c in zonas:
    cur = conn.execute(
        "INSERT INTO colonias (nombre, geometry_geojson) VALUES (?, ?)",
        (nombre, geom_json)
    )
    all_colonias.append((cur.lastrowid, nombre, json.loads(geom_json), lat_c, lng_c))

conn.commit()
print(f"  {len(all_colonias)} zonas insertadas")

# ══════════════════════════════════════════════════════════════
# PASO 6: Asignar colonia_id a candidatos por punto más cercano al centroide
# ══════════════════════════════════════════════════════════════
print("Paso 6: Asignando colonia a cada candidato...")

# Usar los labels del k-means directamente (cada candidato ya tiene su cluster)
col_id_by_cluster = {k: all_colonias[k][0] for k in range(len(all_colonias))}

conn.execute("UPDATE candidatos SET colonia_id = NULL")

for idx, (place_id, lat, lng) in enumerate(candidatos):
    cluster_k = int(labels[idx])
    col_id    = col_id_by_cluster.get(cluster_k)
    if col_id:
        conn.execute("UPDATE candidatos SET colonia_id=? WHERE place_id=?", (col_id, place_id))

conn.commit()
conn.close()

print(f"\n[OK] Listo:")
print(f"  {len(all_colonias)} zonas Voronoi (SIN traslape)")
print(f"  {len(candidatos)} candidatos asignados")
print(f"\nYa puedes usar GET /api/colonias y generar campañas por colonia.")
