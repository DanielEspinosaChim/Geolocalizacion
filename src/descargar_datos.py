"""
PASO 1 — Descarga datos del DENUE (INEGI)
Descarga todos los negocios formales de Yucatán y filtra Mérida.
No necesita cuenta ni API key.
"""

import os
import zipfile
import requests
import pandas as pd
from tqdm import tqdm

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.config import DATA_RAW, DATA_PROC, CVE_ENT, YUC_LAT_MIN, YUC_LAT_MAX, YUC_LON_MIN, YUC_LON_MAX


def descargar_denue_yucatan():
    """
    Descarga el archivo DENUE de Yucatán desde INEGI.
    Archivo CSV con todos los negocios formales registrados del estado.
    """
    # URL del DENUE de Yucatán (descarga masiva INEGI)
    url = "https://www.inegi.org.mx/contenidos/masiva/denue/denue_31_csv.zip"

    destino_zip = os.path.join(DATA_RAW, "denue_yucatan.zip")
    destino_csv = os.path.join(DATA_RAW, "denue_yucatan.csv")

    if os.path.exists(destino_csv):
        print(f"[OK] DENUE ya descargado: {destino_csv}")
        return destino_csv

    print("Descargando DENUE Yucatan desde INEGI (~50MB)...")
    r = requests.get(url, stream=True, timeout=120)

    if r.status_code != 200:
        print(f"[ERROR] No se pudo descargar. Status: {r.status_code}")
        print("Descarga manual en: https://www.inegi.org.mx/app/descarga/?ti=6")
        print("Busca 'DENUE' → 'Yucatan' → guarda el CSV en data/raw/denue_yucatan.csv")
        return None

    total = int(r.headers.get("content-length", 0))
    with open(destino_zip, "wb") as f, tqdm(total=total, unit="B", unit_scale=True) as bar:
        for chunk in r.iter_content(chunk_size=8192):
            f.write(chunk)
            bar.update(len(chunk))

    print("Extrayendo ZIP...")
    with zipfile.ZipFile(destino_zip, "r") as z:
        nombres = z.namelist()
        print(f"  Archivos en ZIP: {nombres}")
        # Buscar el CSV de datos reales (no el diccionario)
        # INEGI empaqueta: conjunto_de_datos/denue_inegi_31_.csv + diccionario_datos/...
        csvs = [n for n in nombres if n.endswith(".csv")]
        # Preferir el que está en conjunto_de_datos o el más grande
        csv_datos = None
        for c in csvs:
            nombre_lower = c.lower()
            if "conjunto" in nombre_lower or "denue_inegi" in nombre_lower:
                csv_datos = c
                break
        if csv_datos is None:
            # Tomar el CSV más grande
            tamaños = {c: z.getinfo(c).file_size for c in csvs}
            csv_datos = max(tamaños, key=tamaños.get)
        print(f"  Usando archivo de datos: {csv_datos}")
        z.extract(csv_datos, DATA_RAW)
        ruta_extraida = os.path.join(DATA_RAW, csv_datos.replace("/", os.sep))
        os.makedirs(os.path.dirname(ruta_extraida), exist_ok=True)
        os.rename(ruta_extraida, destino_csv)

    os.remove(destino_zip)
    print(f"[OK] DENUE guardado en: {destino_csv}")
    return destino_csv


def filtrar_merida(ruta_csv):
    """
    Carga todos los negocios de Yucatán (sin filtrar por municipio).
    El nombre se mantiene para compatibilidad con main.py.
    """
    ruta_salida = os.path.join(DATA_PROC, "denue_merida.csv")

    if os.path.exists(ruta_salida):
        print(f"[OK] Datos ya procesados: {ruta_salida}")
        return pd.read_csv(ruta_salida, low_memory=False)

    print("Cargando DENUE completo de Yucatan...")
    df = pd.read_csv(ruta_csv, encoding="latin1", low_memory=False)
    df.columns = df.columns.str.lower().str.strip()

    print(f"Total negocios Yucatan: {len(df):,}")

    # Guardar todo el estado (sin filtrar municipio)
    df.to_csv(ruta_salida, index=False, encoding="utf-8")
    print(f"[OK] Guardado: {ruta_salida} ({len(df):,} negocios)")
    return df


def limpiar_denue(df):
    """
    Limpia y prepara el DataFrame de negocios de Mérida.
    """
    ruta_salida = os.path.join(DATA_PROC, "denue_merida_limpio.csv")

    if os.path.exists(ruta_salida):
        print(f"[OK] Datos limpios ya existen: {ruta_salida}")
        return pd.read_csv(ruta_salida, low_memory=False)

    print("Limpiando datos...")

    # Convertir coordenadas a float
    for col in ["latitud", "longitud"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    # Eliminar filas sin coordenadas
    antes = len(df)
    df = df.dropna(subset=["latitud", "longitud"])
    print(f"  Eliminados sin coordenadas: {antes - len(df)}")

    # Filtrar por bounding box de Yucatan
    df = df[
        (df["latitud"].between(YUC_LAT_MIN, YUC_LAT_MAX)) &
        (df["longitud"].between(YUC_LON_MIN, YUC_LON_MAX))
    ]
    print(f"  Negocios con coordenadas validas en Yucatan: {len(df):,}")

    # Extraer sector (primeros 2 dígitos del código SCIAN)
    col_act = None
    for c in ["codigo_act", "codigo_actividad", "act"]:
        if c in df.columns:
            col_act = c
            break
    if col_act:
        df["sector_2dig"] = df[col_act].astype(str).str[:2]

    # Estrato como texto limpio
    # DENUE usa 'per_ocu' para personal ocupado
    if "per_ocu" in df.columns:
        df["per_ocu"] = pd.to_numeric(df["per_ocu"], errors="coerce").fillna(0)
    elif "per_ocp" in df.columns:
        df["per_ocu"] = pd.to_numeric(df["per_ocp"], errors="coerce").fillna(0)

    # Fecha de alta
    if "fecha_alta" in df.columns:
        df["fecha_alta"] = pd.to_datetime(df["fecha_alta"], errors="coerce")
        df["año_alta"] = df["fecha_alta"].dt.year
        df["meses_activo"] = (pd.Timestamp.now() - df["fecha_alta"]).dt.days / 30

    df.to_csv(ruta_salida, index=False, encoding="utf-8")
    print(f"[OK] Datos limpios guardados: {ruta_salida}")
    return df


def main():
    os.makedirs(DATA_RAW, exist_ok=True)
    os.makedirs(DATA_PROC, exist_ok=True)

    # 1. Descargar
    ruta_csv = descargar_denue_yucatan()
    if ruta_csv is None:
        return

    # 2. Filtrar Mérida
    df_merida = filtrar_merida(ruta_csv)
    if df_merida is None:
        return

    # 3. Limpiar
    df_limpio = limpiar_denue(df_merida)

    print("\n=== RESUMEN ===")
    print(f"Negocios totales en Mérida: {len(df_limpio):,}")
    if "nombre_act" in df_limpio.columns:
        print("\nTop 10 tipos de negocio:")
        print(df_limpio["nombre_act"].value_counts().head(10))
    if "año_alta" in df_limpio.columns:
        print("\nNegocios registrados por año (últimos 5):")
        print(df_limpio["año_alta"].value_counts().sort_index().tail(5))


if __name__ == "__main__":
    main()
