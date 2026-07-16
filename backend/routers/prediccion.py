from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
import pandas as pd
from db.database import get_db, haversine, ROOT

router = APIRouter()

PRED_CSV = ROOT / "data" / "procesado" / "predicciones_zonas.csv"


# ── Modelos de respuesta ──────────────────────────────────────────────────────

class PrediccionNegocioResponse(BaseModel):
    status: str = Field(..., description="'formal' o 'informal' — encontramos un negocio cercano")
    nombre: str = Field(..., description="Nombre del negocio más cercano al punto consultado")
    tipos: str = Field(..., description="Categorías del negocio (ej: 'restaurant,food')")
    distancia_m: float = Field(..., description="Distancia en metros entre el punto consultado y el negocio encontrado")

class PrediccionZonaResponse(BaseModel):
    status: str = Field("zona", description="'zona' — no hay negocios individuales cerca, se muestra el score de la zona")
    zona_score: int = Field(..., description="Score de la zona según el modelo ML (0–100). Más alto = más informalidad potencial")
    zona_nivel: str = Field(..., description="Nivel de riesgo: 'Bajo' | 'Medio' | 'Alto' | 'Muy Alto'")
    dist_zona_m: float = Field(..., description="Distancia en metros al centro de la zona ML más cercana")
    lat: float = Field(..., description="Latitud del centro de la zona ML")
    lng: float = Field(..., description="Longitud del centro de la zona ML")

class SinDatosResponse(BaseModel):
    status: str = Field("sin_datos", description="No hay negocios ni zonas con datos en ese punto")


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.get(
    "/api/predecir",
    summary="Consultar el estatus de formalización en unas coordenadas",
    description="""
Dado un punto geográfico (lat/lng), busca el negocio más cercano en la base de datos
y retorna si es formal o informal. Si no hay negocios cerca, cae al score de zona del modelo ML.

**Lógica de respuesta (en orden de prioridad):**

1. **Negocio encontrado dentro del radio** → retorna `status: 'formal'` o `status: 'informal'`
   con el nombre del negocio y la distancia exacta en metros.

2. **Sin negocios en el radio, pero hay datos de zona ML** → retorna `status: 'zona'`
   con el score (0–100) y nivel de informalidad predicho por el modelo para esa área.

3. **Sin datos de ningún tipo** → retorna `status: 'sin_datos'`.

**Parámetros:**
- `lat` / `lng`: coordenadas del punto a consultar
- `radio`: distancia máxima en metros para buscar negocios individuales (default: 300m).
  Si no hay ninguno dentro del radio, usa el score de zona.

**Caso de uso:** el inspector hace click en cualquier punto del mapa y obtiene
inmediatamente si ahí hay un negocio registrado o informal, o qué tan probable es
que haya informalidad en esa zona.

**Ejemplo:**
```
GET /api/predecir?lat=20.9674&lng=-89.5926&radio=200
```
""",
    responses={
        200: {
            "description": "Puede retornar uno de tres formatos según lo que se encuentre cerca del punto",
            "content": {
                "application/json": {
                    "examples": {
                        "negocio_informal": {
                            "summary": "Negocio informal encontrado cerca",
                            "value": {"status": "informal", "nombre": "Taquería El Güero", "tipos": "restaurant,food", "distancia_m": 45.3},
                        },
                        "negocio_formal": {
                            "summary": "Negocio registrado en DENUE encontrado cerca",
                            "value": {"status": "formal", "nombre": "Farmacia del Ahorro", "tipos": "pharmacy", "distancia_m": 120.1},
                        },
                        "zona_ml": {
                            "summary": "Sin negocios individuales — score de zona ML",
                            "value": {"status": "zona", "zona_score": 74, "zona_nivel": "Alto", "dist_zona_m": 210.5},
                        },
                        "sin_datos": {
                            "summary": "Zona sin información",
                            "value": {"status": "sin_datos"},
                        },
                    }
                }
            },
        }
    },
)
def predecir(
    lat: float = 20.9674,
    lng: float = -89.5926,
    radio: float = 300,
):
    conn = get_db()
    try:
        df_form = pd.read_sql("SELECT nombre, lat, lng, tipos FROM formales", conn)
    except Exception:
        df_form = pd.DataFrame(columns=["nombre", "lat", "lng", "tipos"])
    try:
        df_inf = pd.read_sql("SELECT nombre, lat, lng, tipos FROM candidatos", conn)
    except Exception:
        df_inf = pd.DataFrame(columns=["nombre", "lat", "lng", "tipos"])
    conn.close()

    mejor        = None
    mejor_dist   = 9999.0
    mejor_status = "sin_datos"

    for _, r in df_form.iterrows():
        d = haversine(lat, lng, float(r.lat), float(r.lng))
        if d < mejor_dist:
            mejor_dist, mejor, mejor_status = d, r.copy(), "formal"

    for _, r in df_inf.iterrows():
        d = haversine(lat, lng, float(r.lat), float(r.lng))
        if d < mejor_dist:
            mejor_dist, mejor, mejor_status = d, r.copy(), "informal"

    # Si no hay nada dentro del radio, mostrar score de zona ML
    if mejor is None or mejor_dist > radio:
        if PRED_CSV.exists():
            df_z  = pd.read_csv(PRED_CSV)
            dz    = df_z.apply(
                lambda r2: haversine(lat, lng, float(r2.lat_centro), float(r2.lon_centro)), axis=1
            )
            idx_z = dz.idxmin()
            z     = df_z.loc[idx_z]
            return {
                "status":      "zona",
                "zona_score":  int(z.score_100),
                "zona_nivel":  str(z.nivel),
                "dist_zona_m": round(float(dz[idx_z]), 1),
                "lat":         round(float(z.lat_centro), 6),
                "lng":         round(float(z.lon_centro), 6),
            }
        return {"status": "sin_datos"}

    return {
        "status":      mejor_status,
        "nombre":      str(mejor["nombre"]),
        "tipos":       str(mejor["tipos"]),
        "distancia_m": round(mejor_dist, 1),
    }


# ── Índice de informalidad ────────────────────────────────────────────────────

# Anclas del último cruce ejecutado (cruce.py + BASE.xlsx). Son constantes del
# método, no datos vivos: el estimador de razón necesita el overlap conocido
# entre ambos registros, y ese overlap solo cambia al re-correr el cruce.
_N1_DENUE          = 144_576  # formales registrados en DENUE Mérida (universo ancla)
_M_OVERLAP         = 8_901    # GM ∩ DENUE (decision_fuente=formal_denue)
_N_FORMALES_OTROS  = 4_616    # formal_cadena + formal_tipo_gmaps + formal_institucion
_N_FORMALES_BASE   = 3_809    # formal_base: match contra BASE.xlsx (RFC + licencias)
_N_INF_OBSERVADOS  = 5_966    # es_informal=True tras cruzar con BASE.xlsx
_N_GMAPS_NEGOCIOS  = 23_292   # negocios reales, GMaps + OSM combinados (sin parques/escuelas/iglesias)
_N_GMAPS_CSV       = 29_234   # filas crudas del CSV descargado (GMaps + OSM)

_ESCENARIOS = [
    (1.00, "Límite inferior"),
    (0.80, "Conservador"),
    (0.65, "Estimación central"),
    (0.50, "Límite superior"),
    (0.40, "Límite superior realista"),
]

# ── Chapman (captura-recaptura GMaps × OSM) ───────────────────────────────────
# Segunda estimación, independiente del multiplier method: usa OSM como fuente
# separada de Google Maps y el solapamiento entre ambas (a <150m, fuzzy≥80) para
# estimar el universo real sin asumir ningún α de visibilidad. Anclas del mismo
# cruce.py + BASE.xlsx que las constantes de arriba — no se recalculan por request.
_OSM_TOTAL          = 2_556   # negocios OSM únicos (fuente=osm, sin excluidos)
_OSM_OVERLAP        = 402     # OSM ∩ GMaps a <150m con nombre similar (fuzzy≥80)
_N_DENUE_MERIDA     = 56_014  # DENUE filtrado a municipio=Mérida (vs 144,576 de la zona metropolitana completa)
_N_CANACO_TOTAL     = 11_968  # directorio CANACO Mérida, deduplicado (BASE.xlsx)
_OSM_N_DENUE        = 1_010   # OSM ∩ DENUE (subconjunto de _M_OVERLAP que vino de OSM)
_OSM_N_CANACO       = 243     # OSM ∩ CANACO (subconjunto de _N_FORMALES_BASE que vino de OSM)


@router.get(
    "/api/indice",
    summary="Índice de informalidad (estimador de razón / multiplier method)",
    description="""
Estima qué proporción de los establecimientos de Mérida son informales, usando el
**Estimador de Razón** (Multiplier Method) sobre dos registros con solapamiento conocido:
Google Maps (incompleto, sesgado) y DENUE (completo, solo formales).

**Los tres pasos:**
1. Medir el "lente" de Google Maps: `p̂ = m / N1` — qué fracción de los formales del
   DENUE alcanzó a capturar Google Maps.
2. Escalar los informales observados al universo real: `N̂_inf = n_inf_obs / (α · p̂)`.
3. Índice: `I = N̂_inf / (N1 + N̂_inf)`.

**El parámetro α** corrige el sesgo de visibilidad: un negocio informal aparece menos
en Google Maps que uno formal (sin reseñas, sin fotos, sin ficha). α=1.0 asume igual
visibilidad (por eso da el *límite inferior*); α=0.65 es el valor central de la literatura.

**Usado por:** la vista Índice.
""",
)
def get_indice():
    import math

    n_formales_total = _M_OVERLAP + _N_FORMALES_OTROS + _N_FORMALES_BASE

    p_formal      = _M_OVERLAP / _N1_DENUE   # cobertura de GMaps sobre los formales
    multiplicador = _N1_DENUE / _M_OVERLAP

    escenarios = []
    for alpha, etiqueta in _ESCENARIOS:
        p_inf = alpha * p_formal
        n_inf = _N_INF_OBSERVADOS / p_inf
        escenarios.append({
            "alpha":          alpha,
            "etiqueta":       etiqueta,
            "N_inf_estimado": round(n_inf),
            "indice_pct":     round(n_inf / (_N1_DENUE + n_inf) * 100, 1),
        })

    # IC 95% del límite inferior por método delta sobre la varianza de p̂.
    var_p   = p_formal * (1 - p_formal) / _N1_DENUE
    se_n    = (_N_INF_OBSERVADOS / p_formal**2) * math.sqrt(var_p)
    ci_low  = max(0.0, _N_INF_OBSERVADOS * multiplicador - 1.96 * se_n)
    ci_high = _N_INF_OBSERVADOS * multiplicador + 1.96 * se_n

    # Chapman: estimador insesgado de captura-recaptura sobre dos muestras
    # (GMaps limpio y OSM) con solapamiento conocido. N̂ = (n1+1)(n2+1)/(m+1) − 1.
    n1_chapman = _N_GMAPS_NEGOCIOS - _OSM_TOTAL  # GMaps limpio sin los negocios que ya vinieron de OSM
    n_estimado_chapman = round((n1_chapman + 1) * (_OSM_TOTAL + 1) / (_OSM_OVERLAP + 1) - 1)
    n_inf_chapman = n_estimado_chapman - _N_DENUE_MERIDA
    chapman_indice_pct = round(n_inf_chapman / n_estimado_chapman * 100, 1) if n_estimado_chapman else 0.0

    return {
        "datos_entrada": {
            "N1_denue":         _N1_DENUE,
            "m_overlap":        _M_OVERLAP,
            "n_formales_total": n_formales_total,
            "n_formales_otros": _N_FORMALES_OTROS,
            "n_formales_base":  _N_FORMALES_BASE,
            "n_inf_observados": _N_INF_OBSERVADOS,
            "n_gmaps_negocios": _N_GMAPS_NEGOCIOS,
            "n_gmaps_csv":      _N_GMAPS_CSV,
        },
        "cobertura_gmaps_pct": round(p_formal * 100, 2),
        "multiplicador":       round(multiplicador, 2),
        "escenarios":          escenarios,
        "ic95_indice_inferior": {
            "low":  round(ci_low  / (_N1_DENUE + ci_low)  * 100, 1),
            "high": round(ci_high / (_N1_DENUE + ci_high) * 100, 1),
        },
        "central_indice_pct": escenarios[2]["indice_pct"],
        "fuentes": {
            "gmaps_csv":     _N_GMAPS_CSV,               # 29,234 — GMaps + OSM crudo
            "gmaps_raw":     _N_GMAPS_CSV - _OSM_TOTAL,  # 26,678 — solo GMaps, sin limpiar
            "gmaps_limpio":  n1_chapman,                 # 20,736 — GMaps sin parques/escuelas/iglesias
            "osm_total":     _OSM_TOTAL,                 # 2,556
            "osm_denue":     _OSM_N_DENUE,                # 1,010
            "osm_canaco":    _OSM_N_CANACO,               # 243
            "gm_denue":      _M_OVERLAP - _OSM_N_DENUE,   # 7,891
            "gm_canaco":     _N_FORMALES_BASE - _OSM_N_CANACO,  # 3,566
            "denue_total":   _N1_DENUE,                  # 144,576 — zona metropolitana completa
            "canaco_total":  _N_CANACO_TOTAL,             # 11,968
            "gm_osm_overlap": _OSM_OVERLAP,               # 402
        },
        "chapman": {
            "n1_gmaps_limpio":  n1_chapman,
            "n2_osm":           _OSM_TOTAL,
            "overlap":          _OSM_OVERLAP,
            "n_denue_ancla":    _N_DENUE_MERIDA,
            "N_estimado_total": n_estimado_chapman,
            "N_inf_estimado":   max(0, n_inf_chapman),
            "indice_pct":       chapman_indice_pct,
        },
        "referencia_inegi":   "57–60% informalidad laboral Yucatán (INEGI 2023)",
        "metodo":             "Estimador de Razón / Multiplier Method",
        "referencias": [
            "UNAIDS (2010) Guidelines on Estimating the Size of Populations Most at Risk",
            "Thompson (2002) Sampling — Ratio Estimation",
            "CEPAL (2018) Medición de la economía informal",
        ],
    }
