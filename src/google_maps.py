"""
Integración con Google Maps Places API (v1) para enriquecer el modelo.

Autenticación: service account de GCP (marketing@videoimet.iam.gserviceaccount.com)
  → archivo JSON en GOOGLE_APPLICATION_CREDENTIALS o service_account.json

API usada: Places API (New) v1
  POST https://places.googleapis.com/v1/places:searchNearby
  Soporta OAuth2 con service account (a diferencia de la API legacy).

Por qué esto mejora el modelo:
  DENUE  → solo negocios FORMALES registrados en INEGI
  GMaps  → formales + informales (tienditas, fondas, salones de esquina)
  Brecha → fracción de negocios visibles que NO están en DENUE
           = proxy directo de densidad de economía informal por zona

Features que genera por zona 0.5 km × 0.5 km:
  gmaps_total          actividad económica real (formal + informal)
  gmaps_con_rating     establecimientos maduros (proxy formal)
  gmaps_sin_rating     sin reseñas (proxy informal)
  gmaps_rating_prom    calidad promedio de la zona
  gmaps_reviews_prom   madurez promedio del establecimiento
  gmaps_pct_tipos_inf  % de tipos típicamente informales
  gmaps_brecha         (gmaps_total − denue) / gmaps_total  ← el más importante

Costo (UNA sola vez, resultado cacheado en data/raw/gmaps_places.json):
  Con service account — mismo costo de API que con key
  ~150 llamadas (filtrado por DENUE) ≈ $4.80 USD
  ~300 llamadas (sin filtro)         ≈ $9.60 USD

Uso:
  python src/google_maps.py
  python src/google_maps.py --force          # borra caché y redescarga
  python src/google_maps.py --spacing-km 1.5 # grid más denso
"""

import os
import sys
import json
import time
import math
import argparse

import requests
import numpy as np
import pandas as pd
from tqdm import tqdm

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.config import (
    DATA_RAW, DATA_PROC,
    MERIDA_LAT, MERIDA_LON,
    GOOGLE_SERVICE_ACCOUNT_FILE,
    GOOGLE_MAPS_API_KEY,
)

# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------

_PLACES_V1_URL = "https://places.googleapis.com/v1/places:searchNearby"

# Campos que pedimos — solo los necesarios para minimizar costo
# (la nueva API cobra por campos solicitados; esto queda en tier Basic)
_FIELD_MASK = (
    "places.name,"
    "places.displayName,"
    "places.location,"
    "places.types,"
    "places.rating,"
    "places.userRatingCount,"
    "places.priceLevel,"
    "places.businessStatus"
)

# Tamaño de celda (debe coincidir con crear_grilla_merida en features.py)
_TAMAÑO_KM = 0.5
_DELTA_LAT  = _TAMAÑO_KM / 111.0
_DELTA_LNG  = _TAMAÑO_KM / (111.0 * math.cos(math.radians(MERIDA_LAT)))

# Tipos de GMaps que representan actividad económica
TIPOS_ECONOMICOS = {
    "restaurant", "food", "cafe", "bakery", "bar", "night_club",
    "meal_takeaway", "meal_delivery",
    "store", "shopping_mall", "supermarket", "grocery_or_supermarket",
    "convenience_store", "clothing_store", "shoe_store", "jewelry_store",
    "electronics_store", "hardware_store", "home_goods_store",
    "furniture_store", "book_store", "pet_store", "florist",
    "beauty_salon", "hair_care", "spa", "laundry", "dry_cleaning",
    "car_repair", "car_wash", "gas_station", "car_dealer",
    "pharmacy", "doctor", "dentist", "health", "veterinary_care",
    "gym", "lodging", "real_estate_agency", "travel_agency",
    "accounting", "lawyer", "finance", "insurance_agency",
    "bank", "atm",
}

# Tipos con mayor prevalencia de informalidad en México
TIPOS_INFORMALES = {
    "meal_takeaway", "meal_delivery", "food",
    "beauty_salon", "hair_care",
    "laundry", "dry_cleaning",
    "car_repair", "car_wash",
}


# ---------------------------------------------------------------------------
# Autenticación
# ---------------------------------------------------------------------------

def _construir_headers(sa_file=None, api_key=None):
    """
    Devuelve (headers, params) para la nueva Places API v1.

    Prioridad:
      1. Service account JSON  → OAuth2 Bearer token
      2. API key               → ?key= en query params
    """
    sa = sa_file or GOOGLE_SERVICE_ACCOUNT_FILE
    key = api_key or GOOGLE_MAPS_API_KEY

    if sa and os.path.exists(sa):
        try:
            from google.oauth2 import service_account
            from google.auth.transport.requests import Request as GRequest

            creds = service_account.Credentials.from_service_account_file(
                sa,
                scopes=["https://www.googleapis.com/auth/cloud-platform"],
            )
            creds.refresh(GRequest())
            headers = {
                "Authorization":   f"Bearer {creds.token}",
                "Content-Type":    "application/json",
                "X-Goog-FieldMask": _FIELD_MASK,
            }
            print(f"  Autenticado con service account: {os.path.basename(sa)}")
            return headers, {}
        except Exception as exc:
            print(f"  [AVISO] Error con service account ({exc}). Intentando API key...")

    if key:
        headers = {
            "Content-Type":    "application/json",
            "X-Goog-FieldMask": _FIELD_MASK,
        }
        print("  Autenticado con API key")
        return headers, {"key": key}

    raise RuntimeError(
        "\nNo hay credenciales configuradas.\n"
        "Opciones:\n"
        "  A) Descarga el JSON de marketing@videoimet.iam.gserviceaccount.com\n"
        "     y guárdalo como 'service_account.json' en la raíz del proyecto.\n"
        "  B) Agrega GOOGLE_MAPS_API_KEY en el archivo .env\n"
        "\nEn Google Cloud Console asegúrate de que la cuenta tenga habilitada\n"
        "la 'Places API (New)' en el proyecto videoimet.\n"
    )


# ---------------------------------------------------------------------------
# Grid y filtros
# ---------------------------------------------------------------------------

def _grid_merida(spacing_km=2.0):
    """Puntos en cuadrícula sobre el área urbana de Mérida."""
    lat_min, lat_max = 20.85, 21.15
    lon_min, lon_max = -89.78, -89.45

    dlat = spacing_km / 111.0
    dlng = spacing_km / (111.0 * math.cos(math.radians(MERIDA_LAT)))

    puntos = []
    lat = lat_min
    while lat <= lat_max:
        lng = lon_min
        while lng <= lon_max:
            puntos.append((round(lat, 6), round(lng, 6)))
            lng += dlng
        lat += dlat
    return puntos


def _filtrar_zonas_activas(puntos, radio_m):
    """
    Descarta puntos sin actividad económica según DENUE.
    Reduce las llamadas a la API ~50%.
    """
    ruta = os.path.join(DATA_PROC, "denue_merida_limpio.csv")
    if not os.path.exists(ruta):
        print("  [INFO] DENUE no disponible para filtrar; usando grid completo.")
        return puntos

    df = pd.read_csv(ruta, low_memory=False, usecols=["latitud", "longitud"]).dropna()
    r_lat = (radio_m / 1000) / 111.0
    r_lng = r_lat / math.cos(math.radians(MERIDA_LAT))

    activos = [
        (lat, lng) for lat, lng in puntos
        if (
            df["latitud"].between(lat - r_lat, lat + r_lat) &
            df["longitud"].between(lng - r_lng, lng + r_lng)
        ).any()
    ]
    return activos


# ---------------------------------------------------------------------------
# Llamada a la API
# ---------------------------------------------------------------------------

def _llamar_nearby(lat, lng, radio_m, headers, params):
    """
    Llama a Places API v1 Nearby Search.
    Retorna lista de places o [] si hay error.
    """
    body = {
        "maxResultCount": 20,
        "locationRestriction": {
            "circle": {
                "center": {"latitude": lat, "longitude": lng},
                "radius": float(radio_m),
            }
        },
    }
    try:
        resp = requests.post(
            _PLACES_V1_URL,
            headers=headers,
            params=params,
            json=body,
            timeout=12,
        )
        data = resp.json()

        if resp.status_code == 200:
            return data.get("places", [])

        # Errores críticos que deben detener la descarga
        err = data.get("error", {})
        status_code = err.get("code", resp.status_code)
        msg = err.get("message", resp.text[:120])

        if status_code in (401, 403):
            raise RuntimeError(f"Error de autenticación ({status_code}): {msg}")
        if status_code == 400:
            raise RuntimeError(f"Petición inválida (400): {msg}")

        print(f"\n  [API {status_code}] {msg}")
        return []

    except RuntimeError:
        raise
    except Exception as exc:
        print(f"\n  [Red] {exc}")
        return []


def _parse_place(p):
    """Extrae los campos que necesitamos del formato v1."""
    loc  = p.get("location", {})
    name = p.get("displayName", {}).get("text", p.get("name", ""))
    return {
        "name":    name,
        "lat":     loc.get("latitude"),
        "lng":     loc.get("longitude"),
        "types":   p.get("types", []),
        "rating":  p.get("rating"),
        "reviews": p.get("userRatingCount"),
        "price":   p.get("priceLevel"),
        "status":  p.get("businessStatus", ""),
    }


# ---------------------------------------------------------------------------
# Descarga principal
# ---------------------------------------------------------------------------

def descargar_places_merida(
    sa_file=None, api_key=None,
    spacing_km=2.0, radio_m=2000,
    force=False,
):
    """
    Descarga y cachea todos los places económicos de Mérida.

    Usa service account (marketing@videoimet.iam.gserviceaccount.com) por defecto.

    Parámetros
    ----------
    sa_file    : ruta al JSON de la service account (default: GOOGLE_APPLICATION_CREDENTIALS)
    api_key    : API key como fallback
    spacing_km : separación del grid en km (default: 2)
    radio_m    : radio de búsqueda por punto en metros (default: 2000)
    force      : si True, ignora caché y redescarga

    Retorna dict  {resource_name → datos}
    """
    os.makedirs(DATA_RAW, exist_ok=True)
    ruta_cache = os.path.join(DATA_RAW, "gmaps_places.json")

    if os.path.exists(ruta_cache) and not force:
        print(f"[cache] Places ya descargados → {ruta_cache}")
        with open(ruta_cache, encoding="utf-8") as f:
            places = json.load(f)
        print(f"  {len(places):,} places únicos en caché")
        return places

    # Credenciales
    try:
        headers, params = _construir_headers(sa_file, api_key)
    except RuntimeError as exc:
        print(str(exc))
        return None

    # Grid
    puntos = _grid_merida(spacing_km)
    print(f"Grid inicial: {len(puntos):,} puntos ({spacing_km} km de separación)")
    print("Filtrando zonas activas con DENUE...")
    puntos = _filtrar_zonas_activas(puntos, radio_m)
    print(f"Puntos activos: {len(puntos):,}")

    costo = len(puntos) * 32 / 1000
    print(f"\nCosto estimado: {len(puntos)} llamadas × $0.032 = ${costo:.2f} USD")
    print("(Una sola vez — resultado cacheado en disco)\n")

    confirmar = input("¿Continuar? [s/N]: ").strip().lower()
    if confirmar != "s":
        print("Cancelado.")
        return None

    places = {}
    try:
        for lat, lng in tqdm(puntos, desc="Places API v1"):
            results = _llamar_nearby(lat, lng, radio_m, headers, params)
            for p in results:
                pid = p.get("name", "")   # resource name — único por place
                if not pid or pid in places:
                    continue
                parsed = _parse_place(p)
                if parsed["lat"] is not None:
                    places[pid] = parsed
            time.sleep(0.06)
    except RuntimeError as exc:
        print(f"\n[DETENIDO] {exc}")
        if places:
            _guardar(places, ruta_cache)
        return None

    _guardar(places, ruta_cache)
    return places


def _guardar(places, ruta):
    with open(ruta, "w", encoding="utf-8") as f:
        json.dump(places, f, ensure_ascii=False)
    print(f"[OK] {len(places):,} places únicos → {ruta}")


# ---------------------------------------------------------------------------
# Features por zona
# ---------------------------------------------------------------------------

def calcular_features_gmaps(df_zonas=None, places=None, force=False):
    """
    Calcula features de Google Maps por zona (0.5 km × 0.5 km).

    Retorna DataFrame con una fila por zona_id, listo para mergear con
    features_zonas.csv antes de entrenar el modelo.
    """
    os.makedirs(DATA_PROC, exist_ok=True)
    ruta_feat  = os.path.join(DATA_PROC, "features_gmaps.csv")
    ruta_cache = os.path.join(DATA_RAW,  "gmaps_places.json")

    if os.path.exists(ruta_feat) and not force:
        print(f"[cache] Features GMaps → {ruta_feat}")
        return pd.read_csv(ruta_feat)

    if places is None:
        if not os.path.exists(ruta_cache):
            print("[ERROR] Primero ejecuta descargar_places_merida()")
            return None
        with open(ruta_cache, encoding="utf-8") as f:
            places = json.load(f)

    if df_zonas is None:
        ruta_fz = os.path.join(DATA_PROC, "features_zonas.csv")
        if not os.path.exists(ruta_fz):
            print("[ERROR] features_zonas.csv no existe. Corre el pipeline primero.")
            return None
        df_z = pd.read_csv(ruta_fz, usecols=["zona_id", "lat_centro", "lon_centro"])
    else:
        df_z = df_zonas[["zona_id", "lat_centro", "lon_centro"]].copy()

    # Filtrar solo places económicos
    rows = []
    for p in places.values():
        if p["lat"] is None or p["lng"] is None:
            continue
        tipos = set(p.get("types", []))
        if not (tipos & TIPOS_ECONOMICOS):
            continue
        rows.append({
            "lat":      p["lat"],
            "lng":      p["lng"],
            "rating":   p.get("rating"),
            "reviews":  p.get("reviews"),
            "informal": int(bool(tipos & TIPOS_INFORMALES)),
        })

    df_p = pd.DataFrame(rows)
    print(f"Places económicos: {len(df_p):,} / {len(places):,} totales")

    feats = []
    for _, zona in tqdm(df_z.iterrows(), total=len(df_z), desc="Features por zona"):
        lat_c, lng_c = zona["lat_centro"], zona["lon_centro"]
        mask = (
            df_p["lat"].between(lat_c - _DELTA_LAT / 2, lat_c + _DELTA_LAT / 2) &
            df_p["lng"].between(lng_c - _DELTA_LNG / 2, lng_c + _DELTA_LNG / 2)
        )
        sub = df_p[mask]
        n   = len(sub)
        con = int(sub["rating"].notna().sum())

        feats.append({
            "zona_id":             zona["zona_id"],
            "gmaps_total":         n,
            "gmaps_con_rating":    con,
            "gmaps_sin_rating":    n - con,
            "gmaps_rating_prom":   float(sub["rating"].mean())   if con > 0                    else None,
            "gmaps_reviews_prom":  float(sub["reviews"].mean())  if sub["reviews"].notna().any() else None,
            "gmaps_pct_tipos_inf": float(sub["informal"].mean()) if n > 0                      else None,
        })

    df_feat = pd.DataFrame(feats)
    df_feat.to_csv(ruta_feat, index=False)
    print(f"[OK] Features GMaps → {ruta_feat}")
    print(f"  Zonas con ≥1 place: {(df_feat['gmaps_total'] > 0).sum():,} / {len(df_feat):,}")
    return df_feat


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--force",      action="store_true")
    ap.add_argument("--spacing-km", type=float, default=2.0)
    ap.add_argument("--radio-m",    type=int,   default=2000)
    ap.add_argument("--sa-file",    type=str,   default=None,
                    help="Ruta al JSON de service account (sobreescribe config)")
    args = ap.parse_args()

    print("=" * 60)
    print("  GOOGLE MAPS PLACES v1 — MÉRIDA, YUCATÁN")
    print("  Cuenta: marketing@videoimet.iam.gserviceaccount.com")
    print("=" * 60)

    places = descargar_places_merida(
        sa_file    = args.sa_file,
        spacing_km = args.spacing_km,
        radio_m    = args.radio_m,
        force      = args.force,
    )
    if places is None:
        return

    df_feat = calcular_features_gmaps(places=places, force=args.force)
    if df_feat is None:
        return

    print("\n=== RESUMEN CIUDAD ===")
    print(f"Zonas con datos GMaps  : {(df_feat['gmaps_total'] > 0).sum():,}")
    print(f"Total places económicos: {df_feat['gmaps_total'].sum():,}")
    if df_feat["gmaps_rating_prom"].notna().any():
        print(f"Rating promedio ciudad : {df_feat['gmaps_rating_prom'].mean():.2f}")
    print(
        "\nListo. Corre 'python main.py' para reentrenar el modelo\n"
        "con los nuevos features (incluye gmaps_brecha)."
    )


if __name__ == "__main__":
    main()
