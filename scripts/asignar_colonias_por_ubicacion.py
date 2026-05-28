#!/usr/bin/env python3
"""
Asigna colonia real a cada candidato usando reverse geocoding (point-in-polygon).
Usa los polígonos de INEGI/SEPOMEX para determinar en qué colonia está cada punto.
"""

import json
import csv
from pathlib import Path

# Intentar usar shapely para point-in-polygon preciso
try:
    from shapely.geometry import shape, Point
    HAS_SHAPELY = True
except ImportError:
    HAS_SHAPELY = False
    print("ADVERTENCIA: shapely no instalado. Usando bounding box aproximado.")

BASE = Path(__file__).parent.parent
COLONIAS_GEOJSON = BASE / "data/procesado/colonias_merida.geojson"
CANDIDATOS_CSV = BASE / "data/procesado/candidatos_informales.csv"
OUTPUT_CSV = BASE / "data/procesado/candidatos_con_colonia.csv"


def cargar_colonias():
    """Carga polígonos de colonias y prepara para búsqueda."""
    with open(COLONIAS_GEOJSON, encoding='utf-8') as f:
        data = json.load(f)

    colonias = []
    for feat in data.get('features', []):
        props = feat.get('properties', {})
        geom = feat.get('geometry')
        bbox = feat.get('bbox')

        if not geom:
            continue

        colonia = {
            'nombre': props.get('nombre', f"CP {props.get('d_codigo', '?')}"),
            'd_codigo': props.get('d_codigo'),
            'tipo': props.get('tipo', ''),
            'geometry': geom,
            'bbox': bbox,
        }

        if HAS_SHAPELY:
            try:
                colonia['shape'] = shape(geom)
            except:
                continue

        colonias.append(colonia)

    print(f"Cargadas {len(colonias)} colonias con polígonos")
    return colonias


def punto_en_bbox(lat, lng, bbox):
    """Verifica si un punto está dentro del bounding box."""
    if not bbox or len(bbox) < 4:
        return True  # Sin bbox, asumimos que puede estar
    min_lng, min_lat, max_lng, max_lat = bbox
    return min_lat <= lat <= max_lat and min_lng <= lng <= max_lng


def encontrar_colonia(lat, lng, colonias):
    """Encuentra la colonia donde está ubicado el punto."""
    point = Point(lng, lat) if HAS_SHAPELY else None

    for col in colonias:
        # Filtro rápido por bounding box
        if col.get('bbox') and not punto_en_bbox(lat, lng, col['bbox']):
            continue

        # Verificación precisa con shapely
        if HAS_SHAPELY and col.get('shape'):
            if col['shape'].contains(point):
                return col
        elif not HAS_SHAPELY:
            # Sin shapely, solo usamos bbox (menos preciso)
            if col.get('bbox') and punto_en_bbox(lat, lng, col['bbox']):
                return col

    return None


def procesar_candidatos():
    """Procesa todos los candidatos y asigna colonia por ubicación."""
    colonias = cargar_colonias()

    # Leer candidatos
    with open(CANDIDATOS_CSV, encoding='utf-8') as f:
        reader = csv.DictReader(f)
        candidatos = list(reader)

    print(f"Procesando {len(candidatos)} candidatos...")

    asignados = 0
    sin_colonia = 0

    for i, cand in enumerate(candidatos):
        lat = cand.get('lat')
        lng = cand.get('lng')

        if not lat or not lng:
            cand['colonia_geo'] = ''
            cand['cp_geo'] = ''
            sin_colonia += 1
            continue

        try:
            lat = float(lat)
            lng = float(lng)
        except:
            cand['colonia_geo'] = ''
            cand['cp_geo'] = ''
            sin_colonia += 1
            continue

        colonia = encontrar_colonia(lat, lng, colonias)

        if colonia:
            cand['colonia_geo'] = colonia['nombre']
            cand['cp_geo'] = colonia.get('d_codigo', '')
            cand['tipo_colonia'] = colonia.get('tipo', '')
            asignados += 1
        else:
            cand['colonia_geo'] = ''
            cand['cp_geo'] = ''
            cand['tipo_colonia'] = ''
            sin_colonia += 1

        if (i + 1) % 200 == 0:
            print(f"  Procesados {i+1}/{len(candidatos)}...")

    # Guardar resultado
    fieldnames = list(candidatos[0].keys())
    if 'colonia_geo' not in fieldnames:
        fieldnames.extend(['colonia_geo', 'cp_geo', 'tipo_colonia'])

    with open(OUTPUT_CSV, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(candidatos)

    print(f"\n=== RESULTADO ===")
    print(f"Candidatos con colonia asignada: {asignados}")
    print(f"Candidatos sin colonia (fuera de polígonos): {sin_colonia}")
    print(f"Archivo guardado: {OUTPUT_CSV}")

    # Mostrar distribución de colonias
    from collections import Counter
    col_counts = Counter(c.get('colonia_geo', '') for c in candidatos if c.get('colonia_geo'))
    print(f"\nTop 15 colonias con más candidatos:")
    for col, count in col_counts.most_common(15):
        print(f"  {col}: {count}")


if __name__ == "__main__":
    procesar_candidatos()
