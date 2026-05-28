"""
descargar_colonias_merida.py
============================
Descarga colonias + limite municipal de Merida, Yucatan desde Overpass API.
Genera dos archivos:
  data/procesado/colonias_merida.geojson   <- poligonos de colonias/fraccionamientos
  data/procesado/municipio_merida.geojson  <- contorno del municipio completo
"""

import json, time, math, sys
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.parse import urlencode
from urllib.error import URLError

OUT_COLONIAS  = Path(__file__).parent.parent / "data/procesado/colonias_merida.geojson"
OUT_MUNICIPIO = Path(__file__).parent.parent / "data/procesado/municipio_merida.geojson"
OVERPASS_URL  = "https://overpass-api.de/api/interpreter"

# Centro de Merida y radio maximo aceptable (km)
MERIDA_LAT  = 20.9674
MERIDA_LON  = -89.5926
MAX_DIST_KM = 35.0   # colonias cuyo centroide este mas lejos se descartan

# Bounding box amplio del municipio
BBOX = "20.75,-90.05,21.25,-89.20"

# ── Queries ───────────────────────────────────────────────────────────────────
# Solo place=suburb/neighbourhood/quarter — NO boundary=administrative
# para no arrastrar municipios vecinos completos.
# Los fraccionamientos (admin_level 9/10) si se incluyen porque son
# subdivisiones INTERNAS de Merida, no municipios vecinos.

QUERY_COLONIAS = f"""
[out:json][timeout:240][bbox:{BBOX}];
(
  relation["place"~"suburb|neighbourhood|quarter|village|hamlet"]["name"];
  way["place"~"suburb|neighbourhood|quarter|hamlet"]["name"];
  relation["boundary"="administrative"]["admin_level"~"8|9|10"]["name"];
  way["boundary"="administrative"]["admin_level"~"8|9|10"]["name"];
  relation["landuse"="residential"]["name"];
  way["landuse"="residential"]["name"]["area"="yes"];
);
out body geom;
"""

QUERY_MUNICIPIO = f"""
[out:json][timeout:120][bbox:{BBOX}];
(
  relation["name"~"M.rida"]["admin_level"="6"]["boundary"="administrative"];
  relation["name"~"M.rida"]["admin_level"="8"]["boundary"="administrative"];
);
out body geom;
"""

# ── Geometria helpers ─────────────────────────────────────────────────────────

def _haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = math.sin(d_lat/2)**2 + math.cos(math.radians(lat1))*math.cos(math.radians(lat2))*math.sin(d_lon/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

def point_in_polygon(lon, lat, ring):
    """Ray casting — devuelve True si (lon,lat) esta dentro del anillo."""
    n = len(ring)
    inside = False
    j = n - 1
    for i in range(n):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]
        if ((yi > lat) != (yj > lat)) and (lon < (xj - xi) * (lat - yi) / (yj - yi + 1e-12) + xi):
            inside = not inside
        j = i
    return inside

def _centroid(coords):
    lats = [c[1] for c in coords]
    lons = [c[0] for c in coords]
    return sum(lats)/len(lats), sum(lons)/len(lons)

def _round_pt(pt):
    return (round(pt[0], 6), round(pt[1], 6))

def _way_coords(geom):
    return [[p["lon"], p["lat"]] for p in geom if "lon" in p and "lat" in p]

def _assemble_ring(ways_coords):
    remaining = [list(w) for w in ways_coords if len(w) >= 2]
    if not remaining:
        return None
    ring = list(remaining.pop(0))
    max_iter = len(remaining) * 3 + 10
    for _ in range(max_iter):
        if not remaining:
            break
        start = _round_pt(ring[0])
        end   = _round_pt(ring[-1])
        if start == end and len(ring) > 3:
            break
        joined = False
        for i, seg in enumerate(remaining):
            s = _round_pt(seg[0])
            e = _round_pt(seg[-1])
            if e == start:
                ring = seg + ring[1:]; remaining.pop(i); joined = True; break
            elif s == start:
                ring = list(reversed(seg)) + ring[1:]; remaining.pop(i); joined = True; break
            elif s == end:
                ring = ring + seg[1:]; remaining.pop(i); joined = True; break
            elif e == end:
                ring = ring + list(reversed(seg))[1:]; remaining.pop(i); joined = True; break
        if not joined:
            break
    if ring[0] != ring[-1]:
        ring.append(ring[0])
    return ring if len(ring) >= 4 else None

def way_to_rings(el):
    coords = _way_coords(el.get("geometry", []))
    if len(coords) < 4:
        return None
    if coords[0] != coords[-1]:
        coords.append(coords[0])
    return [coords]

def relation_to_rings(el):
    outer_ways, inner_ways = [], []
    for m in el.get("members", []):
        if m.get("type") != "way" or "geometry" not in m:
            continue
        coords = _way_coords(m["geometry"])
        if not coords:
            continue
        if m.get("role") == "inner":
            inner_ways.append(coords)
        else:
            outer_ways.append(coords)

    if not outer_ways:
        return None

    if len(outer_ways) == 1:
        c = outer_ways[0]
        if c[0] != c[-1]:
            c.append(c[0])
        outer_ring = c if len(c) >= 4 else None
    else:
        outer_ring = _assemble_ring(outer_ways)

    if not outer_ring:
        return None

    rings = [outer_ring]
    for inner in inner_ways:
        if inner[0] != inner[-1]:
            inner.append(inner[0])
        if len(inner) >= 4:
            rings.append(inner)
    return rings

def el_to_feature(el, is_municipio=False):
    tags = el.get("tags", {})
    name_raw = tags.get("name", "").strip()

    if el["type"] == "way":
        rings = way_to_rings(el)
    elif el["type"] == "relation":
        rings = relation_to_rings(el)
    else:
        return None

    if not rings:
        return None

    props = {
        "nombre":     name_raw.upper() if name_raw else f"OSM_{el['id']}",
        "nombre_raw": name_raw,
        "osm_id":     el["id"],
        "osm_type":   el["type"],
        "place":      tags.get("place", tags.get("boundary", tags.get("landuse", ""))),
        "tipo":       "municipio" if is_municipio else "colonia",
    }
    return {
        "type": "Feature",
        "properties": props,
        "geometry": {"type": "Polygon", "coordinates": rings},
    }

# ── Red ───────────────────────────────────────────────────────────────────────

def fetch_overpass(query, label="", retries=3):
    data = urlencode({"data": query}).encode()
    for attempt in range(1, retries + 1):
        try:
            print(f"  -> {label} (intento {attempt})...")
            req = Request(OVERPASS_URL, data=data,
                          headers={"Content-Type": "application/x-www-form-urlencoded",
                                   "User-Agent": "GeoFormalMerida/2.0"})
            with urlopen(req, timeout=260) as resp:
                raw = resp.read()
            return json.loads(raw)
        except URLError as e:
            print(f"     ERROR: {e}")
            if attempt < retries:
                time.sleep(6 * attempt)
    return None

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("=" * 65)
    print("Descargando colonias + municipio de Merida, Yucatan...")
    print("=" * 65)

    # ── 0. Descargar limite municipal PRIMERO (se usa como filtro) ────────────
    print("\n[1/3] Limite del municipio de Merida...")
    mun_ring = None
    r_mun = fetch_overpass(QUERY_MUNICIPIO, "Limite municipal")
    if r_mun:
        for el in r_mun.get("elements", []):
            if el["type"] == "relation":
                feat = el_to_feature(el, is_municipio=True)
                if feat:
                    ring = feat["geometry"]["coordinates"][0]
                    lats = [c[1] for c in ring]
                    lons = [c[0] for c in ring]
                    # Verificar que sea Merida Yucatan (no Merida Filipinas etc.)
                    if 20.5 < sum(lats)/len(lats) < 21.5 and -90.5 < sum(lons)/len(lons) < -89.0:
                        mun_ring = ring
                        print(f"      Limite: {len(mun_ring)} puntos, lat {min(lats):.3f}-{max(lats):.3f}")
                        break

    if not mun_ring:
        print("      ADVERTENCIA: sin limite municipal, usando distancia como filtro.")

    # ── 1. Colonias ───────────────────────────────────────────────────────────
    print("\n[2/3] Colonias y fraccionamientos...")
    r_col = fetch_overpass(QUERY_COLONIAS, "Colonias (place/suburb/neighbourhood)")
    if not r_col:
        print("ERROR: fallo la descarga de colonias.")
        sys.exit(1)

    elements = r_col.get("elements", [])
    print(f"      Elementos OSM recibidos: {len(elements)}")

    features = []
    skipped  = 0
    for el in elements:
        feat = el_to_feature(el)
        if not feat:
            skipped += 1
            continue

        outer_ring = feat["geometry"]["coordinates"][0]
        clat, clon = _centroid(outer_ring)

        # Filtro 1: distancia maxima al centro (elimina casos extremos)
        dist = _haversine_km(MERIDA_LAT, MERIDA_LON, clat, clon)
        if dist > MAX_DIST_KM:
            skipped += 1
            continue

        # Filtro 2: excluir solo municipios completos (admin_level=6/7) que no son Merida
        place = feat["properties"].get("place", "")
        nombre = feat["properties"].get("nombre", "")
        MUNICIPIOS_VECINOS = {"BACA","IXIL","YAXKUKUL","MOCOCHÁ","MOCHOCHA",
                              "PROGRESO","MOTUL","TIXKOKOB","CONKAL"}
        if nombre in MUNICIPIOS_VECINOS:
            skipped += 1
            continue

        feat["properties"]["dist_km"] = round(dist, 2)
        features.append(feat)

    # Dedup por osm_id
    seen = set()
    unique = []
    for f in features:
        oid = f["properties"]["osm_id"]
        if oid not in seen:
            seen.add(oid)
            unique.append(f)
    features = unique

    features.sort(key=lambda f: f["properties"]["nombre"])

    print(f"      Colonias validas  : {len(features)}")
    print(f"      Ignorados/lejanos : {skipped}")

    geojson_col = {
        "type": "FeatureCollection",
        "features": features,
    }
    OUT_COLONIAS.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_COLONIAS, "w", encoding="utf-8") as f:
        json.dump(geojson_col, f, ensure_ascii=False, separators=(",", ":"))
    print(f"      -> Guardado: {OUT_COLONIAS} ({OUT_COLONIAS.stat().st_size/1024:.1f} KB)")

    # ── 2. Municipio ─────────────────────────────────────────────────────────
    print("\n[2/2] Limite del municipio de Merida...")
    r_mun = fetch_overpass(QUERY_MUNICIPIO, "Limite municipal")

    mun_feature = None
    if r_mun:
        # Puede volver como relation o nodo
        for el in r_mun.get("elements", []):
            if el["type"] == "relation":
                feat = el_to_feature(el, is_municipio=True)
                if feat:
                    mun_feature = feat
                    break

    if not mun_feature:
        # Fallback: bounding box del municipio
        print("      Advertencia: no se encontro relacion municipal, usando bbox.")
        poly = [
            [-89.85, 20.78], [-89.25, 20.78],
            [-89.25, 21.20], [-89.85, 21.20],
            [-89.85, 20.78],
        ]
        mun_feature = {
            "type": "Feature",
            "properties": {"nombre": "MUNICIPIO DE MERIDA", "nombre_raw": "Municipio de Merida", "tipo": "municipio"},
            "geometry": {"type": "Polygon", "coordinates": [poly]},
        }

    geojson_mun = {
        "type": "FeatureCollection",
        "features": [mun_feature],
    }
    with open(OUT_MUNICIPIO, "w", encoding="utf-8") as f:
        json.dump(geojson_mun, f, ensure_ascii=False, separators=(",", ":"))
    print(f"      -> Guardado: {OUT_MUNICIPIO} ({OUT_MUNICIPIO.stat().st_size/1024:.1f} KB)")

    # ── Resumen ───────────────────────────────────────────────────────────────
    print()
    print("=" * 65)
    print(f"  Colonias descargadas : {len(features)}")
    print(f"  Municipio incluido   : Si")
    print()
    print("  Distribucion geografica:")
    if features:
        lats = [f["properties"].get("dist_km", 0) for f in features]
        lats_real = []
        for f in features:
            ring = f["geometry"]["coordinates"][0]
            c = _centroid(ring)
            lats_real.append(c[0])
        print(f"    Lat min: {min(lats_real):.4f}  Lat max: {max(lats_real):.4f}")
        close = sum(1 for d in lats if d < 10)
        mid   = sum(1 for d in lats if 10 <= d < 20)
        far   = sum(1 for d in lats if d >= 20)
        print(f"    < 10km del centro: {close}")
        print(f"    10-20km del centro: {mid}")
        print(f"    20-35km del centro: {far}")
    print("=" * 65)

if __name__ == "__main__":
    main()
