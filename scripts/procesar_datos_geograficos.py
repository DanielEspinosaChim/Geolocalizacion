#!/usr/bin/env python3
"""
Script para procesar y combinar datos geográficos de INEGI y SEPOMEX
para Mérida y Yucatán.

Fuentes:
- API INEGI: https://gaia.inegi.org.mx/wscatgeo/v2/
- SEPOMEX: Correos de México (datos abiertos)
"""

import json
import csv
import os
from pathlib import Path

# Directorios
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data" / "inegi"
OUTPUT_DIR = BASE_DIR / "data" / "procesado"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def cargar_json(filepath):
    """Carga un archivo JSON."""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def guardar_json(data, filepath):
    """Guarda datos como JSON."""
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def cargar_csv(filepath):
    """Carga un archivo CSV."""
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        return list(reader)


def crear_mapeo_cp_colonias():
    """
    Crea un mapeo de código postal -> lista de colonias desde SEPOMEX.
    """
    sepomex_path = DATA_DIR / "sepomex_yucatan.csv"
    if not sepomex_path.exists():
        print("Archivo SEPOMEX no encontrado")
        return {}

    datos = cargar_csv(sepomex_path)
    mapeo = {}

    for row in datos:
        cp = row.get('cp', '').strip()
        if not cp:
            continue

        if cp not in mapeo:
            mapeo[cp] = []

        mapeo[cp].append({
            'nombre': row.get('asentamiento', ''),
            'tipo': row.get('tipo', ''),
            'municipio': row.get('municipio', ''),
            'ciudad': row.get('ciudad', ''),
            'zona': row.get('zona', '')
        })

    return mapeo


def enriquecer_geojson_con_colonias():
    """
    Enriquece el GeoJSON de códigos postales con nombres de colonias.
    """
    geojson_path = DATA_DIR / "colonias_yucatan_sepomex.geojson"
    if not geojson_path.exists():
        print("GeoJSON de colonias no encontrado")
        return

    geojson = cargar_json(geojson_path)
    mapeo = crear_mapeo_cp_colonias()

    for feature in geojson.get('features', []):
        cp = str(feature.get('properties', {}).get('d_codigo', ''))
        if cp in mapeo:
            colonias = mapeo[cp]
            feature['properties']['colonias'] = colonias
            feature['properties']['num_colonias'] = len(colonias)
            # Si hay una sola colonia, usar su nombre
            if len(colonias) == 1:
                feature['properties']['nombre'] = colonias[0]['nombre']
                feature['properties']['tipo'] = colonias[0]['tipo']
            else:
                # Múltiples colonias - usar nombres concatenados
                nombres = [c['nombre'] for c in colonias]
                feature['properties']['nombre'] = ' / '.join(nombres[:3])
                if len(nombres) > 3:
                    feature['properties']['nombre'] += f' (+{len(nombres)-3} más)'

    # Filtrar solo Mérida (códigos postales 97XXX)
    features_merida = [
        f for f in geojson.get('features', [])
        if str(f.get('properties', {}).get('d_codigo', '')).startswith('97')
    ]

    geojson_merida = {
        'type': 'FeatureCollection',
        'name': 'Colonias_Merida',
        'crs': {'type': 'name', 'properties': {'name': 'EPSG:4326'}},
        'features': features_merida
    }

    output_path = OUTPUT_DIR / "colonias_merida.geojson"
    guardar_json(geojson_merida, output_path)
    print(f"Colonias de Mérida guardadas en: {output_path}")
    print(f"Total de polígonos: {len(features_merida)}")


def procesar_municipio_merida():
    """
    Copia y valida el polígono del municipio de Mérida.
    """
    input_path = DATA_DIR / "municipio_merida.geojson"
    if not input_path.exists():
        print("Polígono de municipio no encontrado")
        return

    geojson = cargar_json(input_path)
    output_path = OUTPUT_DIR / "municipio_merida.geojson"
    guardar_json(geojson, output_path)
    print(f"Municipio de Mérida guardado en: {output_path}")


def generar_resumen():
    """
    Genera un resumen de todos los datos disponibles.
    """
    resumen = {
        'fuentes': {
            'inegi_api': 'https://gaia.inegi.org.mx/wscatgeo/v2/',
            'sepomex': 'Correos de México - Datos Abiertos'
        },
        'archivos_inegi': [],
        'archivos_procesados': []
    }

    # Listar archivos de INEGI
    for archivo in DATA_DIR.glob('*.geojson'):
        size_kb = archivo.stat().st_size / 1024
        resumen['archivos_inegi'].append({
            'nombre': archivo.name,
            'tamaño_kb': round(size_kb, 1)
        })

    for archivo in DATA_DIR.glob('*.json'):
        size_kb = archivo.stat().st_size / 1024
        resumen['archivos_inegi'].append({
            'nombre': archivo.name,
            'tamaño_kb': round(size_kb, 1)
        })

    # Listar archivos procesados
    for archivo in OUTPUT_DIR.glob('*.geojson'):
        size_kb = archivo.stat().st_size / 1024
        resumen['archivos_procesados'].append({
            'nombre': archivo.name,
            'tamaño_kb': round(size_kb, 1)
        })

    output_path = OUTPUT_DIR / "resumen_datos.json"
    guardar_json(resumen, output_path)
    print(f"\nResumen guardado en: {output_path}")

    return resumen


def main():
    print("=" * 60)
    print("PROCESAMIENTO DE DATOS GEOGRÁFICOS - MÉRIDA, YUCATÁN")
    print("=" * 60)

    print("\n1. Procesando municipio de Mérida...")
    procesar_municipio_merida()

    print("\n2. Enriqueciendo GeoJSON de colonias...")
    enriquecer_geojson_con_colonias()

    print("\n3. Generando resumen...")
    resumen = generar_resumen()

    print("\n" + "=" * 60)
    print("RESUMEN DE DATOS DISPONIBLES")
    print("=" * 60)

    print("\nArchivos de INEGI:")
    for archivo in resumen['archivos_inegi']:
        print(f"  - {archivo['nombre']}: {archivo['tamaño_kb']} KB")

    print("\nArchivos procesados:")
    for archivo in resumen['archivos_procesados']:
        print(f"  - {archivo['nombre']}: {archivo['tamaño_kb']} KB")


if __name__ == "__main__":
    main()
