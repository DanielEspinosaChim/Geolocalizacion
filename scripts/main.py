"""
SISTEMA DE PREDICCION DE FORMALIZACION DE NEGOCIOS
Mérida, Yucatán, México

Ejecutar: python main.py

Pasos automáticos:
  1. Descarga datos DENUE de INEGI (negocios formales Yucatán)
  2. Filtra y limpia datos de Mérida
  3. Calcula features por zona geográfica
  4. Entrena modelo ML (Random Forest + XGBoost)
  5. Genera mapa interactivo HTML
"""

import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.config import DATA_PROC, MAPAS_DIR
from src.descargar_datos import descargar_denue_yucatan, filtrar_merida, limpiar_denue
from src.features import (
    crear_grilla_merida, asignar_zona, calcular_features_por_zona, preparar_para_modelo
)
from src.google_maps import descargar_places_merida, calcular_features_gmaps
from src.modelo import entrenar_modelo, predecir_todas_las_zonas
from src.mapa import crear_mapa_completo

import pandas as pd
import pickle


def main():
    print("=" * 60)
    print("  PREDICCION DE FORMALIZACION DE NEGOCIOS — MERIDA YUC")
    print("=" * 60)

    os.makedirs(DATA_PROC, exist_ok=True)
    os.makedirs(MAPAS_DIR, exist_ok=True)

    # PASO 1 — Descargar y limpiar datos
    print("\n[PASO 1/4] Descargando datos DENUE de INEGI...")
    ruta_csv = descargar_denue_yucatan()
    if ruta_csv is None:
        print("DETENIDO: No se pudo descargar el DENUE. Ver instrucciones arriba.")
        return

    df_merida = filtrar_merida(ruta_csv)
    if df_merida is None:
        return
    df_limpio = limpiar_denue(df_merida)

    # PASO 1.5 — Google Maps Places (enriquecimiento del modelo)
    print("\n[PASO 1.5] Datos de Google Maps Places...")
    ruta_gmaps_feat = os.path.join(DATA_PROC, "features_gmaps.csv")
    ruta_gmaps_raw  = os.path.join(os.path.dirname(DATA_PROC), "data", "raw", "gmaps_places.json")
    # ruta_gmaps_raw alternativa más robusta:
    import sys as _sys
    _base = os.path.dirname(os.path.abspath(__file__))
    ruta_gmaps_raw = os.path.join(_base, "data", "raw", "gmaps_places.json")

    if os.path.exists(ruta_gmaps_feat):
        print(f"  [cache] features_gmaps.csv disponible — el modelo usará datos de GMaps")
    elif os.path.exists(ruta_gmaps_raw):
        print("  [cache] gmaps_places.json encontrado. Calculando features...")
        calcular_features_gmaps()
    else:
        print(
            "  [INFO] Sin datos de Google Maps.\n"
            "  Para un modelo más preciso (incluye sector informal) ejecuta:\n"
            "         python src/google_maps.py\n"
            "  Esto hace ~150 llamadas a la API (~$5 USD, una sola vez).\n"
            "  El pipeline continúa solo con DENUE por ahora."
        )

    # PASO 2 — Features
    print("\n[PASO 2/4] Calculando características por zona...")
    ruta_feat = os.path.join(DATA_PROC, "features_zonas.csv")
    if os.path.exists(ruta_feat):
        df_features = pd.read_csv(ruta_feat)
        print(f"  [cache] Features cargados desde: {ruta_feat}")
    else:
        df_zonas = crear_grilla_merida(tamaño_km=0.5)
        df_limpio = asignar_zona(df_limpio, df_zonas)
        df_features = calcular_features_por_zona(df_limpio, df_zonas)

    # PASO 3 — Modelo
    print("\n[PASO 3/4] Entrenando modelo de Machine Learning...")
    ruta_pred = os.path.join(DATA_PROC, "predicciones_zonas.csv")
    if os.path.exists(ruta_pred):
        print(f"  [cache] Predicciones cargadas desde: {ruta_pred}")
    else:
        X, y, df_modelo, columnas, scaler = preparar_para_modelo(df_features)
        if X.shape[0] < 50:
            print("[ERROR] Muy pocos datos. Revisa la descarga.")
            return
        resultado = entrenar_modelo(X, y, columnas)
        if resultado[0] is None:
            print("DETENIDO: el modelo no pudo entrenarse. Revisa los datos.")
            return
        mejor_modelo, nombre, X_test, y_test = resultado
        predecir_todas_las_zonas(mejor_modelo, df_features, columnas, scaler)

    # PASO 4 — Mapa
    print("\n[PASO 4/4] Generando mapa interactivo...")
    ruta_mapa = crear_mapa_completo()

    print("\n" + "=" * 60)
    print("  COMPLETADO")
    print("=" * 60)
    print(f"\n  Mapa listo en: {ruta_mapa}")
    print("  Abre ese archivo .html en Chrome o Firefox")
    print("\n  Graficas en:", MAPAS_DIR)
    print("    - importancia_variables.png")
    print("    - curva_roc.png")
    print("=" * 60)


if __name__ == "__main__":
    main()
