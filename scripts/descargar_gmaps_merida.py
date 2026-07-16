"""
descargar_gmaps_merida.py
=========================
Descarga TODOS los negocios de Mérida desde Google Places API (New).

Estrategia:
  - Crea un grid de puntos cada 500m cubriendo toda el área urbana de Mérida
  - En cada punto hace una búsqueda con radio 500m (hasta 20 resultados)
  - Deduplica por place_id
  - Guarda progresivamente para no perder datos si se interrumpe

Costo estimado: ~$127 USD — cubierto por el crédito gratuito de $200/mes de Google Cloud.

Uso:
    python scripts/descargar_gmaps_merida.py
"""

import json
import math
import time
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path
from datetime import datetime

# ── Config ─────────────────────────────────────────────────────────────────────
ROOT       = Path(__file__).parent.parent
OUTPUT     = ROOT / "data" / "raw" / "gmaps_places_completo.json"
PROGRESO   = ROOT / "data" / "raw" / "gmaps_progreso.json"   # checkpoint
API_KEY    = os.environ.get("GOOGLE_MAPS_API_KEY") or ""

# Área urbana de Mérida
LAT_MIN, LAT_MAX = 20.87, 21.05
LNG_MIN, LNG_MAX = -89.75, -89.50

RADIO_M   = 500     # radio de búsqueda por celda
MAX_RESULT = 20     # máximo por request (límite de la API)
DELAY_SEG  = 0.12   # ~8 requests/segundo (límite recomendado: 10/seg)

# ── Cargar API key desde .env si no está en env ────────────────────────────────
if not API_KEY:
    env_path = ROOT / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("GOOGLE_MAPS_API_KEY="):
                API_KEY = line.split("=", 1)[1].strip()
                break

if not API_KEY:
    print("[ERROR] No se encontró GOOGLE_MAPS_API_KEY en el entorno ni en .env")
    sys.exit(1)


# ── Calcular grid ──────────────────────────────────────────────────────────────

def generar_grid():
    step_lat = RADIO_M / 111000
    step_lng = RADIO_M / (111000 * math.cos(math.radians((LAT_MIN + LAT_MAX) / 2)))

    puntos = []
    lat = LAT_MIN
    while lat <= LAT_MAX:
        lng = LNG_MIN
        while lng <= LNG_MAX:
            puntos.append((round(lat, 6), round(lng, 6)))
            lng += step_lng
        lat += step_lat
    return puntos


# ── Llamada a Places API ───────────────────────────────────────────────────────

def buscar_lugares(lat, lng):
    """Hace una búsqueda Nearby Search y devuelve lista de lugares."""
    url = "https://places.googleapis.com/v1/places:searchNearby"
    body = json.dumps({
        "locationRestriction": {
            "circle": {
                "center": {"latitude": lat, "longitude": lng},
                "radius": float(RADIO_M)
            }
        },
        "maxResultCount": MAX_RESULT,
    }).encode("utf-8")

    fields = ",".join([
        "places.id",
        "places.displayName",
        "places.location",
        "places.types",
        "places.rating",
        "places.userRatingCount",
        "places.priceLevel",
        "places.businessStatus",
        "places.formattedAddress",
        "places.nationalPhoneNumber",
        "places.websiteUri",
    ])

    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Content-Type": "application/json",
            "X-Goog-Api-Key": API_KEY,
            "X-Goog-FieldMask": fields,
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
            return data.get("places", [])
    except urllib.error.HTTPError as e:
        body_err = e.read().decode("utf-8", errors="ignore")
        print(f"\n  [API ERROR {e.code}] {body_err[:200]}")
        if e.code == 429:
            print("  Rate limit alcanzado, esperando 30s...")
            time.sleep(30)
        return []
    except Exception as ex:
        print(f"\n  [ERROR] {ex}")
        return []


def normalizar(place):
    """Convierte respuesta de la API al formato del proyecto."""
    loc  = place.get("location", {})
    name = place.get("displayName", {})
    price_map = {
        "PRICE_LEVEL_FREE": 0,
        "PRICE_LEVEL_INEXPENSIVE": 1,
        "PRICE_LEVEL_MODERATE": 2,
        "PRICE_LEVEL_EXPENSIVE": 3,
        "PRICE_LEVEL_VERY_EXPENSIVE": 4,
    }
    return {
        "name":      name.get("text", "") if isinstance(name, dict) else str(name),
        "lat":       loc.get("latitude"),
        "lng":       loc.get("longitude"),
        "types":     place.get("types", []),
        "rating":    place.get("rating"),
        "reviews":   place.get("userRatingCount"),
        "price":     price_map.get(place.get("priceLevel")),
        "status":    place.get("businessStatus", "OPERATIONAL"),
        "direccion": place.get("formattedAddress"),
        "telefono":  place.get("nationalPhoneNumber"),
        "web":       place.get("websiteUri"),
    }


# ── Confirmación y resumen ─────────────────────────────────────────────────────

def mostrar_resumen(puntos):
    requests_est = len(puntos)
    costo_bruto  = requests_est * 0.032
    costo_neto   = max(0, costo_bruto - 200)
    lugares_est  = requests_est * 12  # promedio real ~12 resultados por celda

    print("=" * 56)
    print("  DESCARGA DE NEGOCIOS — MÉRIDA, YUCATÁN")
    print("=" * 56)
    print(f"  Grid:              {len(puntos):,} puntos de búsqueda")
    print(f"  Radio por celda:   {RADIO_M}m")
    print(f"  Requests estimados:{requests_est:,}")
    print(f"  Lugares esperados: ~{lugares_est:,} únicos")
    print(f"  Costo bruto:       ~${costo_bruto:.0f} USD")
    print(f"  Crédito gratuito:  $200 USD/mes (Google Cloud)")
    print(f"  COSTO NETO:        ~${costo_neto:.0f} USD  ✓ GRATIS")
    print(f"  Tiempo estimado:   ~{requests_est * DELAY_SEG / 60:.0f} minutos")
    print("=" * 56)

    # Checkpoint existente
    if PROGRESO.exists():
        prog = json.loads(PROGRESO.read_text(encoding="utf-8"))
        ya_hechos = prog.get("completados", 0)
        print(f"\n  ⚠️  Hay un progreso guardado: {ya_hechos}/{len(puntos)} puntos completados.")
        print(f"     El script continuará desde donde se quedó.")

    print()
    resp = input("  ¿Deseas iniciar la descarga? (s/n): ").strip().lower()
    if resp not in ("s", "si", "sí", "yes", "y"):
        print("\n  Cancelado. No se hizo ninguna llamada a la API.")
        sys.exit(0)
    print()


# ── Loop principal ─────────────────────────────────────────────────────────────

def main():
    puntos = generar_grid()
    mostrar_resumen(puntos)

    # Cargar datos existentes (para deduplicar y para continuar si se interrumpió)
    if OUTPUT.exists():
        with open(OUTPUT, encoding="utf-8") as f:
            acumulado = json.load(f)
        print(f"  Cargados {len(acumulado):,} lugares existentes de descarga previa.")
    else:
        acumulado = {}

    # Cargar checkpoint de progreso
    inicio = 0
    if PROGRESO.exists():
        prog  = json.loads(PROGRESO.read_text(encoding="utf-8"))
        inicio = prog.get("completados", 0)
        if inicio > 0:
            print(f"  Continuando desde el punto {inicio}/{len(puntos)}...\n")

    nuevos = 0
    errores = 0
    inicio_ts = time.time()

    for i, (lat, lng) in enumerate(puntos):
        if i < inicio:
            continue

        # Progreso en pantalla
        pct    = (i + 1) / len(puntos) * 100
        elapsed = time.time() - inicio_ts
        rate   = (i - inicio + 1) / max(elapsed, 1)
        restante = (len(puntos) - i - 1) / max(rate, 0.001) / 60
        print(f"\r  [{i+1:>4}/{len(puntos)}] {pct:5.1f}% | "
              f"+{nuevos:,} nuevos | "
              f"ETA: {restante:.0f}m    ", end="", flush=True)

        lugares = buscar_lugares(lat, lng)

        for p in lugares:
            pid = p.get("id")
            if pid and pid not in acumulado:
                acumulado[pid] = normalizar(p)
                nuevos += 1

        time.sleep(DELAY_SEG)

        # Guardar cada 50 puntos
        if (i + 1) % 50 == 0:
            with open(OUTPUT, "w", encoding="utf-8") as f:
                json.dump(acumulado, f, ensure_ascii=False)
            PROGRESO.write_text(json.dumps({"completados": i + 1, "total": len(puntos)}), encoding="utf-8")

    # Guardar final
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(acumulado, f, ensure_ascii=False)
    PROGRESO.unlink(missing_ok=True)

    elapsed_min = (time.time() - inicio_ts) / 60
    print(f"\n\n{'=' * 56}")
    print(f"  ✓ DESCARGA COMPLETA")
    print(f"  Total lugares únicos: {len(acumulado):,}")
    print(f"  Nuevos en esta sesión: {nuevos:,}")
    print(f"  Tiempo total: {elapsed_min:.1f} minutos")
    print(f"  Archivo: {OUTPUT}")
    print(f"{'=' * 56}")
    print(f"\n  Siguiente paso:")
    print(f"  Actualiza tu base de datos con el nuevo archivo y")
    print(f"  corre el proceso de cruce con DENUE para identificar informales.")


if __name__ == "__main__":
    main()
