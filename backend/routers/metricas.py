import math
from collections import Counter

from fastapi import APIRouter, HTTPException

from backend.core.cache import get_candidatos
from backend.core.config import PRED, CRUCE
from backend.core.helpers import haversine, extract_lat, extract_lng

router = APIRouter()


@router.get("/api/predicciones")
def get_predicciones():
    """Devuelve las predicciones de zonas del modelo ML (CSV predicciones_zonas.csv)."""
    if not PRED.exists():
        return []
    try:
        import csv
        result = []
        with open(PRED, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    result.append({
                        "zona_id":    row.get("zona_id", ""),
                        "lat_centro": float(row.get("lat_centro", 0)),
                        "lon_centro": float(row.get("lon_centro", 0)),
                        "score_100":  float(row.get("score_100", 50)),
                        "nivel":      row.get("nivel", "Medio"),
                    })
                except (ValueError, KeyError):
                    continue
        return result
    except Exception as e:
        print(f"  [predicciones] Error leyendo CSV: {e}")
        return []


@router.get("/api/indice")
def get_indice():
    """Índice de informalidad usando Estimador de Razón (Multiplier Method)."""
    import math as _math

    # Datos fijos del cruce (valores del último cruce ejecutado)
    N1               = 144_576  # DENUE Mérida — formales registrados (ancla)
    m                = 8_901    # overlap GM∩DENUE (decision_fuente=formal_denue)
    n_formales_otros = 4_616    # formal_cadena(2427) + formal_tipo_gmaps(1142) + formal_institucion(1047)
    n_formales_base  = 3_809    # formal_base: match BASE.xlsx (RFC + licencias municipales)
    n_formales_total = m + n_formales_otros + n_formales_base
    n_inf_obs        = 5_966    # informales confirmados (es_informal=True)
    n_gmaps          = 23_292   # negocios reales en Google Maps (sin excluidos)

    p_formal      = m / N1
    multiplicador = N1 / m

    escenarios = []
    for alpha, etiqueta in [(1.0, "Límite inferior"), (0.80, "Conservador"),
                             (0.65, "Estimación central"), (0.50, "Límite superior")]:
        p_inf  = alpha * p_formal
        N_inf  = n_inf_obs / p_inf
        indice = N_inf / (N1 + N_inf)
        escenarios.append({
            "alpha":           alpha,
            "etiqueta":        etiqueta,
            "N_inf_estimado":  round(N_inf),
            "indice_pct":      round(indice * 100, 1),
        })

    var_p       = p_formal * (1 - p_formal) / N1
    se_N        = (n_inf_obs / p_formal ** 2) * _math.sqrt(var_p)
    ci_low      = max(0, n_inf_obs * multiplicador - 1.96 * se_N)
    ci_high     = n_inf_obs * multiplicador + 1.96 * se_N
    ic_low_pct  = round(ci_low  / (N1 + ci_low)  * 100, 1)
    ic_high_pct = round(ci_high / (N1 + ci_high) * 100, 1)

    return {
        "datos_entrada": {
            "N1_denue":         N1,
            "m_overlap":        m,
            "n_formales_total": n_formales_total,
            "n_formales_otros": n_formales_otros,
            "n_formales_base":  n_formales_base,
            "n_inf_observados": n_inf_obs,
            "n_gmaps_negocios": n_gmaps,
            "n_gmaps_csv":      29_234,
        },
        "cobertura_gmaps_pct":   round(p_formal * 100, 2),
        "multiplicador":          round(multiplicador, 2),
        "escenarios":             escenarios,
        "ic95_indice_inferior":   {"low": ic_low_pct, "high": ic_high_pct},
        "central_indice_pct":     escenarios[2]["indice_pct"],
        "referencia_inegi":       "57–60% informalidad laboral Yucatán (INEGI 2023)",
        "metodo":                 "Estimador de Razón / Multiplier Method",
        "referencias": [
            "UNAIDS (2010) Guidelines on Estimating the Size of Populations Most at Risk",
            "Thompson (2002) Sampling — Ratio Estimation",
            "CEPAL (2018) Medición de la economía informal",
        ],
    }


@router.get("/api/metricas")
def get_metricas():
    cands = get_candidatos()
    if not cands:
        return {"total": 0, "formales": 0, "informales": 0, "pct_informal": 0,
                "score_prom": 0, "dist_prom_m": 0, "top_tipos": []}

    total           = len(cands)
    FORMALES_CRUCE  = 13_680  # formal_denue(8902) + formal_cadena(2428) + formal_tipo_gmaps(1171) + formal_institucion(1179)
    formales_manual = sum(1 for c in cands if c.get("tipo") == "formal")
    en_proceso      = sum(1 for c in cands if c.get("tipo") == "en_proceso")
    informales      = total - formales_manual - en_proceso
    formales_total  = FORMALES_CRUCE + formales_manual
    total_universo  = FORMALES_CRUCE + total
    scores = [float(c["fuzzy_score"]) for c in cands if c.get("fuzzy_score")]
    dists  = [float(c["distancia_m"]) for c in cands
              if c.get("distancia_m") and float(c.get("distancia_m", 9999)) < 9999]
    SKIP = {"point_of_interest", "establishment", "service", ""}
    tipos_counts = Counter()
    for c in cands:
        if c.get("tipo", "informal") == "informal":
            for t in (c.get("tipos") or "").split(","):
                t = t.strip()
                if t not in SKIP:
                    tipos_counts[t] += 1
    return {
        "total":           total,
        "formales":        formales_total,
        "formales_cruce":  FORMALES_CRUCE,
        "formales_manual": formales_manual,
        "en_proceso":      en_proceso,
        "informales":      informales,
        "total_universo":  total_universo,
        "pct_informal":    round(informales / total * 100, 1) if total else 0,
        "score_prom":      round(sum(scores) / len(scores), 1) if scores else 0,
        "dist_prom_m":     round(sum(dists) / len(dists), 1) if dists else 0,
        "top_tipos":       tipos_counts.most_common(8),
    }


@router.get("/api/muestra-validacion")
def muestra_validacion(limit: int = 2000):
    import csv as _csv

    # Formales: leer del CSV de cruce completo (nunca se subieron a Firestore)
    matches = []
    if CRUCE.exists():
        with open(CRUCE, encoding="utf-8") as f:
            for row in _csv.DictReader(f):
                if row.get("es_informal") != "False":
                    continue
                score = float(row.get("fuzzy_score") or 0)
                if score < 50:
                    continue
                matches.append({
                    "nombre":       row.get("nombre", ""),
                    "nombre_denue": row.get("nombre_denue", ""),
                    "fuzzy_score":  round(score, 1),
                    "distancia_m":  row.get("distancia_m", ""),
                })
        matches.sort(key=lambda x: -x["fuzzy_score"])
        matches = matches[:limit]

    # Informales: desde Firestore
    cands      = get_candidatos()
    no_matches = [c for c in cands if c.get("es_informal")][:limit]

    return {
        "matches":    matches,
        "no_matches": [{"nombre": c.get("nombre"), "tipos": c.get("tipos"),
                        "lat": c.get("lat"), "lng": c.get("lng")}
                       for c in no_matches],
    }


@router.get("/api/predecir")
def predecir(lat: float, lng: float):
    try:
        # 1. Buscar candidato cercano en cache (radio 300 m)
        cands    = get_candidatos()
        mejor    = None
        dist_min = 9999.0
        for c in cands:
            clat = extract_lat(c.get("lat"))
            clng = extract_lng(c.get("lng"))
            if clat is None or clng is None:
                continue
            d = haversine(lat, lng, clat, clng)
            if d < dist_min:
                dist_min = d
                mejor    = c
        if mejor and dist_min <= 300:
            return {"status":      mejor.get("tipo") or "informal",
                    "nombre":      mejor.get("nombre"),
                    "tipos":       mejor.get("tipos"),
                    "distancia_m": round(dist_min, 1)}

        # 2. Sin candidato cercano: usar predicción ML de la zona más cercana
        if PRED.exists():
            import pandas as pd
            df = pd.read_csv(PRED)
            if len(df):
                df["dist"] = df.apply(
                    lambda r: haversine(lat, lng, r["lat_centro"], r["lon_centro"]), axis=1)
                closest  = df.sort_values("dist").iloc[0]
                dist_val = float(closest["dist"])
                if math.isnan(dist_val):
                    return {"status": "sin_datos"}
                dist_m    = round(dist_val, 1)
                score_raw = closest.get("score_100", 50)
                try:
                    score = int(float(score_raw)) if not math.isnan(float(score_raw)) else 50
                except (TypeError, ValueError):
                    score = 50
                return {
                    "status":      "zona",
                    "zona_nivel":  str(closest.get("nivel", "Medio")),
                    "zona_score":  score,
                    "dist_zona_m": dist_m,
                    "estimado":    dist_m > 2000,
                }

        return {"status": "sin_datos"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
