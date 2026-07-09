"""
Consulta de formalidad por coordenadas
=======================================
Dado un par de coordenadas (latitud, longitud) responde:
  1. ¿El negocio/lugar está registrado en DENUE (FORMAL)?
  2. ¿Cuál es el potencial de informalidad de esa zona?
  3. ¿Qué otros negocios formales hay cerca?

Uso:
  python consultar.py                        # modo interactivo
  python consultar.py 20.9674 -89.5926       # coordenadas directas
  python consultar.py 20.9674 -89.5926 --radio 200   # radio de búsqueda en metros
"""

import os
import sys
import math
import argparse
import pandas as pd

BASE = os.path.dirname(os.path.abspath(__file__))
PROC = os.path.join(BASE, "data", "procesado")

# ── Haversine: distancia en metros entre dos puntos ─────────────────────────

def distancia_m(lat1, lon1, lat2, lon2):
    R = 6_371_000
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat/2)**2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon/2)**2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ── Carga de datos ───────────────────────────────────────────────────────────

def _cargar_datos():
    archivos = {
        "pred":   os.path.join(PROC, "predicciones_zonas.csv"),
        "denue":  os.path.join(PROC, "denue_merida_limpio.csv"),
        "feats":  os.path.join(PROC, "features_zonas.csv"),
    }
    for nombre, ruta in archivos.items():
        if not os.path.exists(ruta):
            print(f"[ERROR] Falta {ruta}. Ejecuta primero: python main.py")
            sys.exit(1)

    pred  = pd.read_csv(archivos["pred"])
    denue = pd.read_csv(archivos["denue"], low_memory=False)
    feats = pd.read_csv(archivos["feats"])
    return pred, denue, feats


# ── Zona de la cuadrícula ────────────────────────────────────────────────────

DELTA_LAT = 0.5 / 111.0
DELTA_LNG = 0.5 / (111.0 * math.cos(math.radians(20.9674)))

def _encontrar_zona(lat, lon, pred):
    mask = (
        (pred["lat_centro"] - DELTA_LAT / 2 <= lat) &
        (lat  < pred["lat_centro"] + DELTA_LAT / 2) &
        (pred["lon_centro"] - DELTA_LNG / 2 <= lon) &
        (lon  < pred["lon_centro"] + DELTA_LNG / 2)
    )
    hits = pred[mask]
    return hits.iloc[0] if len(hits) > 0 else None


# ── Negocios DENUE cercanos ─────────────────────────────────────────────────

def _negocios_cercanos(lat, lon, denue, radio_m=100):
    # Filtro rápido por bounding box antes del cálculo exacto
    dlat = (radio_m / 1_000) / 111.0
    dlng = dlat / math.cos(math.radians(lat))
    caja = denue[
        denue["latitud"].between(lat - dlat, lat + dlat) &
        denue["longitud"].between(lon - dlng, lon + dlng)
    ].copy()

    if caja.empty:
        return pd.DataFrame()

    caja["dist_m"] = caja.apply(
        lambda r: distancia_m(lat, lon, r["latitud"], r["longitud"]), axis=1
    )
    return caja[caja["dist_m"] <= radio_m].sort_values("dist_m")


# ── Colores para terminal ────────────────────────────────────────────────────

def _color(texto, nivel):
    codigos = {"verde": "\033[92m", "rojo": "\033[91m",
               "amarillo": "\033[93m", "reset": "\033[0m", "negrita": "\033[1m"}
    c = {"Bajo": "verde", "Medio": "amarillo",
         "Alto": "rojo", "Muy alto": "rojo"}.get(nivel, "reset")
    return f"{codigos[c]}{codigos['negrita']}{texto}{codigos['reset']}"


# ── Consulta principal ───────────────────────────────────────────────────────

def consultar(lat, lon, radio_m=100):
    pred, denue, feats = _cargar_datos()

    SEP = "=" * 60

    print(f"\n{SEP}")
    print(f"  CONSULTA DE FORMALIDAD")
    print(f"  Coordenadas: {lat}, {lon}")
    print(SEP)

    # ── 1. Zona ──────────────────────────────────────────────────────────────
    zona = _encontrar_zona(lat, lon, pred)

    if zona is None:
        print("\n  [!] Coordenadas fuera del área de análisis de Mérida.")
        print(f"  Rango válido: lat 20.85–21.15 | lon -89.78 a -89.45\n")
        return

    nivel = str(zona.get("nivel", "N/A"))
    score = float(zona.get("score_100", zona["prob_formalizacion"] * 100))

    print(f"\n  ZONA: {zona['zona_id']}")
    print(f"  Potencial de informalidad: {_color(f'{score:.1f}%  [{nivel}]', nivel)}")

    # Features adicionales de la zona
    fila_feats = feats[feats["zona_id"].astype(str) == str(zona["zona_id"])]
    if not fila_feats.empty:
        f = fila_feats.iloc[0]
        print(f"  Negocios formales en zona (DENUE) : {int(f.get('total_negocios', 0)):,}")
        pct = f.get("pct_sector_informal", 0)
        if pd.notna(pct):
            print(f"  % sector informal en zona         : {float(pct)*100:.1f}%")
        gmaps = f.get("gmaps_total", 0)
        if pd.notna(gmaps) and gmaps > 0:
            print(f"  Lugares en Google Maps en zona    : {int(gmaps)}")

    # ── 2. Negocio en DENUE ──────────────────────────────────────────────────
    print(f"\n  REGISTRO EN DENUE (radio {radio_m} m)")
    print(f"  {'-'*40}")

    cercanos = _negocios_cercanos(lat, lon, denue, radio_m)

    if cercanos.empty:
        print(f"  RESULTADO: NO encontrado en DENUE")
        print(f"  -> Este negocio/lugar NO está registrado ante INEGI")
        print(f"  -> Clasificación: posiblemente INFORMAL")
        if nivel in ("Alto", "Muy alto"):
            print(f"\n  [!] Está en una zona de {nivel} potencial de informalidad.")
            print(f"     Alta probabilidad de operar sin registro formal.")
    else:
        print(f"  RESULTADO: ENCONTRADO en DENUE — Es FORMAL [OK]")
        print()
        for _, neg in cercanos.head(3).iterrows():
            nombre    = neg.get("nom_estab", neg.get("razon_social", "Sin nombre"))
            actividad = neg.get("nombre_act", "N/A")
            emp       = int(neg.get("per_ocu", 0)) if pd.notna(neg.get("per_ocu")) else 0
            dist      = neg["dist_m"]
            año       = int(neg["año_alta"]) if "año_alta" in neg and pd.notna(neg.get("año_alta")) else None

            print(f"  - {nombre}")
            print(f"    Actividad : {actividad}")
            print(f"    Empleados : {emp}")
            if año:
                print(f"    Registro  : {año}")
            print(f"    Distancia : {dist:.0f} m")
            print()

    # ── 3. Otros negocios formales cerca ─────────────────────────────────────
    cercanos_500 = _negocios_cercanos(lat, lon, denue, radio_m=500)
    n_500 = len(cercanos_500)
    if n_500 > 0:
        print(f"  Negocios formales en 500 m: {n_500}")
        if "sector_2dig" in cercanos_500.columns:
            from src.config import SECTORES_INFORMALES
            n_inf = cercanos_500["sector_2dig"].isin(SECTORES_INFORMALES.keys()).sum()
            print(f"  De sector informal        : {n_inf} ({n_inf/n_500*100:.0f}%)")

    # ── 4. Recomendación ─────────────────────────────────────────────────────
    print(f"\n  {'-'*40}")
    print(f"  RECOMENDACIÓN")
    if nivel == "Muy alto":
        print("  Zona CRÍTICA de informalidad. Alta prioridad para")
        print("  programas de regularización y acompañamiento.")
    elif nivel == "Alto":
        print("  Zona de ALTO potencial. Muchos negocios visibles")
        print("  sin registro formal. Candidata para intervención.")
    elif nivel == "Medio":
        print("  Zona MIXTA. Actividad informal moderada.")
        print("  Vigilancia y difusión de beneficios de formalización.")
    else:
        print("  Zona con BAJA informalidad estimada.")
        print("  La mayoría de negocios están formalizados.")

    print(f"\n{SEP}\n")


# ── Entry point ──────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(
        description="Consulta si unas coordenadas corresponden a un negocio formal o informal"
    )
    ap.add_argument("lat",     nargs="?", type=float, help="Latitud  (ej: 20.9674)")
    ap.add_argument("lon",     nargs="?", type=float, help="Longitud (ej: -89.5926)")
    ap.add_argument("--radio", type=int, default=100,
                    help="Radio de búsqueda en metros para DENUE (default: 100)")
    args = ap.parse_args()

    if args.lat is not None and args.lon is not None:
        consultar(args.lat, args.lon, args.radio)
    else:
        # Modo interactivo
        print("\nCONSULTA DE FORMALIDAD — Mérida, Yucatán")
        print("Escribe 'salir' para terminar.\n")
        while True:
            entrada = input("Coordenadas (lat, lon): ").strip()
            if entrada.lower() in ("salir", "exit", "q"):
                break
            try:
                partes = entrada.replace(",", " ").split()
                lat, lon = float(partes[0]), float(partes[1])
                consultar(lat, lon, args.radio)
            except (ValueError, IndexError):
                print("  Formato inválido. Ejemplo: 20.9674 -89.5926\n")


if __name__ == "__main__":
    main()
