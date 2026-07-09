"""
Descarga negocios/comercios de OpenStreetMap (Overpass API) para Merida.
Gratuito, sin limites de API key.

Busca todos los nodos y ways con tags comerciales:
  shop=*, amenity=restaurant|cafe|bar|..., office=*, craft=*, tourism=hotel|...,
  healthcare=*, leisure=fitness_centre|...

Resultado: data/raw/osm_negocios.json
"""

import json
import os
import time
import requests

DATA_RAW = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "raw")
CACHE_FILE = os.path.join(DATA_RAW, "osm_negocios.json")

# Bbox de Merida ampliada (misma que Google Maps)
BBOX = "20.83,-89.76,21.16,-89.45"  # south,west,north,east

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Query Overpass: todos los negocios en el bbox de Merida
QUERY = """[out:json][timeout:120][bbox:20.83,-89.76,21.16,-89.45];
(
  nwr["shop"];
  nwr["amenity"~"restaurant|cafe|bar|fast_food|food_court|ice_cream|pub|marketplace|pharmacy|clinic|dentist|doctors|veterinary|bank|atm|fuel|car_wash|car_rental|post_office|internet_cafe|laundry|dry_cleaning"];
  nwr["office"];
  nwr["craft"];
  nwr["tourism"~"hotel|hostel|motel|guest_house|apartment"];
  nwr["healthcare"];
  nwr["leisure"~"fitness_centre|sports_centre|bowling_alley|amusement_arcade"];
);
out center tags;
"""


def descargar():
    os.makedirs(DATA_RAW, exist_ok=True)

    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, encoding="utf-8") as f:
            data = json.load(f)
        print(f"[cache] OSM negocios ya descargados: {len(data)} registros")
        return data

    print("Descargando negocios de OpenStreetMap (Overpass API)...")
    print(f"  Bbox: {BBOX}")
    print(f"  Esto puede tardar 30-60 segundos...")

    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
        "User-Agent": "GeolocMerida/1.0",
    }
    resp = requests.post(OVERPASS_URL, data={"data": QUERY}, headers=headers, timeout=180)
    resp.raise_for_status()
    raw = resp.json()

    elements = raw.get("elements", [])
    print(f"  Elementos crudos: {len(elements)}")

    # Parsear a formato uniforme
    negocios = []
    for el in elements:
        tags = el.get("tags", {})
        name = tags.get("name", "").strip()
        if not name:
            continue  # Sin nombre = no util para cruce

        # Coordenadas: nodos tienen lat/lon directo, ways tienen center
        lat = el.get("lat") or el.get("center", {}).get("lat")
        lng = el.get("lon") or el.get("center", {}).get("lon")
        if not lat or not lng:
            continue

        # Determinar tipo principal
        tipo = ""
        for key in ["shop", "amenity", "office", "craft", "tourism", "healthcare", "leisure"]:
            if key in tags:
                tipo = f"{key}={tags[key]}"
                break

        negocio = {
            "osm_id": el.get("id"),
            "osm_type": el.get("type"),
            "nombre": name,
            "lat": float(lat),
            "lng": float(lng),
            "tipo_osm": tipo,
            "brand": tags.get("brand", ""),
            "operator": tags.get("operator", ""),
            "addr_street": tags.get("addr:street", ""),
            "addr_housenumber": tags.get("addr:housenumber", ""),
            "addr_city": tags.get("addr:city", ""),
            "phone": tags.get("phone", ""),
            "website": tags.get("website", ""),
            "opening_hours": tags.get("opening_hours", ""),
        }
        negocios.append(negocio)

    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(negocios, f, ensure_ascii=False, indent=2)

    print(f"  Negocios con nombre: {len(negocios)}")
    print(f"  Guardado en: {CACHE_FILE}")

    # Resumen por tipo
    from collections import Counter
    tipos = Counter(n["tipo_osm"].split("=")[0] if "=" in n["tipo_osm"] else n["tipo_osm"] for n in negocios)
    print("\n  Por categoria:")
    for t, c in tipos.most_common(10):
        print(f"    {t}: {c}")

    return negocios


if __name__ == "__main__":
    negocios = descargar()
    print(f"\nTotal: {len(negocios)} negocios OSM en Merida")
