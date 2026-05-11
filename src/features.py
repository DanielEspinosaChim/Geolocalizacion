"""
PASO 2 — Ingeniería de características (features)
Convierte los datos de negocios en variables útiles para el modelo ML.

Lógica del modelo:
- Dividimos Mérida en una cuadrícula de zonas (~500m x 500m)
- Para cada zona calculamos características de sus negocios
- La variable objetivo (Y) = ¿hay negocios micro recién formalizados en esta zona?
  (negocios con < 3 años de registro en sectores de alta informalidad)
"""

import os
import numpy as np
import pandas as pd
import geopandas as gpd
from shapely.geometry import Point
from sklearn.preprocessing import StandardScaler

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.config import DATA_PROC, SECTORES_INFORMALES, MERIDA_LAT, MERIDA_LON, YUC_LAT_MIN, YUC_LAT_MAX, YUC_LON_MIN, YUC_LON_MAX


def crear_grilla_merida(tamaño_km=0.5):
    """
    Crea una cuadrícula que cubre todo Yucatan.
    Cada celda es una 'zona' que analizaremos.
    """
    print(f"Creando cuadricula de zonas ({tamaño_km}km x {tamaño_km}km) — Yucatan completo...")

    lat_min, lat_max = YUC_LAT_MIN, YUC_LAT_MAX
    lon_min, lon_max = YUC_LON_MIN, YUC_LON_MAX

    # Convertir km a grados (aproximado para Yucatán)
    delta_lat = tamaño_km / 111.0
    delta_lon = tamaño_km / (111.0 * np.cos(np.radians(MERIDA_LAT)))

    lats = np.arange(lat_min, lat_max, delta_lat)
    lons = np.arange(lon_min, lon_max, delta_lon)

    celdas = []
    for i, lat in enumerate(lats):
        for j, lon in enumerate(lons):
            celdas.append({
                "zona_id": f"{i}_{j}",
                "lat_centro": lat + delta_lat / 2,
                "lon_centro": lon + delta_lon / 2,
                "lat_min": lat,
                "lat_max": lat + delta_lat,
                "lon_min": lon,
                "lon_max": lon + delta_lon,
            })

    df_zonas = pd.DataFrame(celdas)
    print(f"  Total zonas creadas: {len(df_zonas):,}")
    return df_zonas


def asignar_zona(df_negocios, df_zonas):
    """
    Asigna cada negocio a su zona calculando el índice directamente
    a partir de las coordenadas. O(n) en lugar de O(n×m).
    """
    print("Asignando negocios a zonas...")

    lat_min = df_zonas["lat_min"].min()
    lon_min = df_zonas["lon_min"].min()
    delta_lat = df_zonas["lat_max"].iloc[0] - df_zonas["lat_min"].iloc[0]
    delta_lon = df_zonas["lon_max"].iloc[0] - df_zonas["lon_min"].iloc[0]

    lats = df_negocios["latitud"].values
    lons = df_negocios["longitud"].values

    i_idx = np.floor((lats - lat_min) / delta_lat).astype(int)
    j_idx = np.floor((lons - lon_min) / delta_lon).astype(int)

    # Zonas válidas del grid
    zonas_set = set(df_zonas["zona_id"].values)

    zona_ids = []
    for i, j in zip(i_idx, j_idx):
        zid = f"{i}_{j}"
        zona_ids.append(zid if zid in zonas_set else None)

    df_negocios["zona_id"] = zona_ids
    asignados = df_negocios["zona_id"].notna().sum()
    print(f"  Negocios asignados a zona: {asignados:,} / {len(df_negocios):,}")
    return df_negocios


def calcular_features_por_zona(df_negocios, df_zonas):
    """
    Calcula todas las características (features) por zona.
    Estas son las variables de entrada del modelo ML.
    """
    print("Calculando features por zona...")

    sectores_inf = set(SECTORES_INFORMALES.keys())
    df = df_negocios[df_negocios["zona_id"].notna()].copy()

    features = []

    for _, zona in df_zonas.iterrows():
        zid = zona["zona_id"]
        negocios = df[df["zona_id"] == zid]

        if len(negocios) == 0:
            # Zona sin negocios — omitir
            continue

        f = {"zona_id": zid,
             "lat_centro": zona["lat_centro"],
             "lon_centro": zona["lon_centro"]}

        # --- Densidad de negocios ---
        f["total_negocios"] = len(negocios)

        # --- Tamaño promedio ---
        if "per_ocu" in negocios.columns:
            f["empleados_promedio"] = negocios["per_ocu"].mean()
            f["pct_micro"] = (negocios["per_ocu"] <= 5).mean()
        else:
            f["empleados_promedio"] = np.nan
            f["pct_micro"] = np.nan

        # --- Diversidad de sectores ---
        if "sector_2dig" in negocios.columns:
            f["num_sectores_distintos"] = negocios["sector_2dig"].nunique()
            f["pct_sector_informal"] = negocios["sector_2dig"].isin(sectores_inf).mean()

        # --- Antigüedad de negocios ---
        if "año_alta" in negocios.columns:
            año_actual = pd.Timestamp.now().year
            negocios_validos = negocios["año_alta"].dropna()
            if len(negocios_validos) > 0:
                f["año_alta_promedio"] = negocios_validos.mean()
                f["pct_recientes_3a"] = (negocios_validos >= año_actual - 3).mean()
                f["pct_recientes_1a"] = (negocios_validos >= año_actual - 1).mean()
            else:
                f["año_alta_promedio"] = np.nan
                f["pct_recientes_3a"] = np.nan
                f["pct_recientes_1a"] = np.nan

        # --- Variable OBJETIVO (Y) ---
        # Definición: zona con alta densidad de micro-negocios en sectores informales
        # registrados en los últimos 3 años = zona con potencial de formalización ACTIVO
        if "año_alta" in negocios.columns and "sector_2dig" in negocios.columns:
            año_actual = pd.Timestamp.now().year
            micro_recientes = negocios[
                (negocios["año_alta"] >= año_actual - 3) &
                (negocios["sector_2dig"].isin(sectores_inf))
            ]
            f["nuevos_formalizados"] = len(micro_recientes)
            # Y = 1 si hay al menos 2 micro-negocios de sectores informales recién formalizados
            f["alta_formalizacion"] = int(len(micro_recientes) >= 2)
        else:
            f["nuevos_formalizados"] = 0
            f["alta_formalizacion"] = 0

        features.append(f)

    df_features = pd.DataFrame(features)
    print(f"  Zonas con datos: {len(df_features):,}")
    print(f"  Zonas con alta formalizacion (criterio original): {df_features['alta_formalizacion'].sum():,}")

    # ── Recalcular target si el criterio original no produce positivos ────────
    n_positivos_orig = df_features["alta_formalizacion"].sum()

    if n_positivos_orig < max(10, len(df_features) * 0.05):
        print(
            f"  [AVISO] Target original: solo {n_positivos_orig} positivos.\n"
            "  Redefiniendo target: top 25% por densidad de sectores informales..."
        )
        score = (
            df_features["pct_sector_informal"].fillna(0) *
            df_features["total_negocios"].fillna(0)
        )
        # Usar nlargest para garantizar exactamente el 25% superior,
        # evitando el caso donde quantile(0.75) == 0 y todo queda positivo.
        n_top = max(10, len(df_features) // 4)
        top_idx = score.nlargest(n_top).index
        df_features["alta_formalizacion"] = 0
        df_features.loc[top_idx, "alta_formalizacion"] = 1
        print(f"  Nuevo target — positivos (top 25%): {df_features['alta_formalizacion'].sum():,}")

    # ─────────────────────────────────────────────────────────────────────────

    # ── Enriquecer con Google Maps Places si el caché ya existe ──────────────
    ruta_gmaps = os.path.join(DATA_PROC, "features_gmaps.csv")
    if os.path.exists(ruta_gmaps):
        print("  Mergeando features de Google Maps Places...")
        df_gmaps = pd.read_csv(ruta_gmaps)

        # Asegurar tipo compatible para el join
        df_features["zona_id"] = df_features["zona_id"].astype(str)
        df_gmaps["zona_id"]    = df_gmaps["zona_id"].astype(str)

        df_features = df_features.merge(df_gmaps, on="zona_id", how="left")

        # Feature clave: fracción de negocios visibles en GMaps que NO están en DENUE
        # Valor alto → alta economía informal → alto potencial de formalización
        df_features["gmaps_brecha"] = (
            (df_features["gmaps_total"].fillna(0) - df_features["total_negocios"])
            .clip(lower=0)
            / df_features["gmaps_total"].replace(0, np.nan)
        ).fillna(0)

        zonas_con_gmaps = df_features["gmaps_total"].notna().sum()
        print(f"  Zonas con datos GMaps: {zonas_con_gmaps:,} / {len(df_features):,}")
        print(f"  Brecha promedio de informalidad: {df_features['gmaps_brecha'].mean():.2%}")
    else:
        print(
            "  [INFO] Sin datos de Google Maps. Para mejorar el modelo ejecuta:\n"
            "         python src/google_maps.py"
        )
    # ─────────────────────────────────────────────────────────────────────────

    ruta = os.path.join(DATA_PROC, "features_zonas.csv")
    df_features.to_csv(ruta, index=False)
    print(f"[OK] Features guardados: {ruta}")
    return df_features


def preparar_para_modelo(df_features):
    """
    Prepara los features para entrenar el modelo.
    Escala variables numéricas y separa X e Y.
    """
    print("Preparando datos para el modelo...")

    columnas_x = [
        # ── DENUE (negocios formales registrados) ──────────────────────────
        "total_negocios", "empleados_promedio", "pct_micro",
        "num_sectores_distintos", "pct_sector_informal",
        "año_alta_promedio", "pct_recientes_3a", "pct_recientes_1a",
        # ── Google Maps Places (incluye sector informal) ───────────────────
        # Se usan solo si features_gmaps.csv fue generado previamente
        "gmaps_total",           # total de negocios visibles (formal + informal)
        "gmaps_con_rating",      # establecimientos maduros (proxy formal)
        "gmaps_sin_rating",      # sin reseñas (proxy informal)
        "gmaps_rating_prom",     # calidad promedio de la zona
        "gmaps_reviews_prom",    # madurez promedio del establecimiento
        "gmaps_pct_tipos_inf",   # % de tipos típicamente informales
        "gmaps_brecha",          # ← feature clave: fracción informal estimada
    ]

    # Solo usar columnas que existen
    columnas_x = [c for c in columnas_x if c in df_features.columns]
    columna_y = "alta_formalizacion"

    # Zonas sin datos GMaps reciben 0 en lugar de NaN para no perderlas en dropna
    gmaps_cols = [c for c in columnas_x if c.startswith("gmaps_")]
    if gmaps_cols:
        df_features[gmaps_cols] = df_features[gmaps_cols].fillna(0)

    df_modelo = df_features[columnas_x + [columna_y, "zona_id", "lat_centro", "lon_centro"]].dropna()

    print(f"  Zonas para el modelo: {len(df_modelo):,}")
    print(f"  Clase 1 (alta formalización): {df_modelo[columna_y].sum():,} ({df_modelo[columna_y].mean()*100:.1f}%)")
    print(f"  Clase 0 (baja formalización): {(df_modelo[columna_y]==0).sum():,}")

    # Escalar
    scaler = StandardScaler()
    X = df_modelo[columnas_x].values
    X_scaled = scaler.fit_transform(X)
    y = df_modelo[columna_y].values

    return X_scaled, y, df_modelo, columnas_x, scaler


def main():
    ruta = os.path.join(DATA_PROC, "denue_merida_limpio.csv")
    if not os.path.exists(ruta):
        print("[ERROR] Primero ejecuta: python src/descargar_datos.py")
        return

    df = pd.read_csv(ruta, low_memory=False)
    df_zonas = crear_grilla_merida(tamaño_km=0.5)
    df = asignar_zona(df, df_zonas)
    df_features = calcular_features_por_zona(df, df_zonas)

    X, y, df_modelo, columnas, scaler = preparar_para_modelo(df_features)
    print("\n[OK] Features listos para el modelo")
    print(f"  Shape X: {X.shape}")
    print(f"  Columnas: {columnas}")


if __name__ == "__main__":
    main()
