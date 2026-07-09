import json

from fastapi import APIRouter, Request

from backend.core.auth import require_admin
from backend.core.config import (COLONIAS_GEOJSON, MUNICIPIO_GEOJSON,
                                  AGEBS_GEOJSON, MUNICIPIOS_YUC)
from backend.core.firebase import fdb

router = APIRouter()

# ── Caches en memoria de GeoJSON ──────────────────────────────────────────────
_colonias_geojson_cache:  dict | None = None
_municipio_geojson_cache: dict | None = None
_agebs_geojson_cache:     dict | None = None
_municipios_yuc_cache:    dict | None = None


def _load_geojson(path) -> dict:
    if not path.exists():
        return {"type": "FeatureCollection", "features": []}
    with open(path, encoding="utf-8") as f:
        return json.load(f)


# ── Zonas (polígonos de colonias para el mapa) ────────────────────────────────

@router.get("/api/zonas")
def get_zonas():
    if fdb is None:
        return []
    result = []
    for doc in fdb.collection("zonas").stream():
        d    = doc.to_dict()
        geom = None
        if d.get("geometry_json"):
            try:
                geom = json.loads(d["geometry_json"])
            except Exception:
                pass
        result.append({"id": d.get("id"), "nombre": d.get("nombre"), "geometry": geom})
    return result


# ── Colonias reales OSM (GeoJSON) ─────────────────────────────────────────────

@router.get("/api/colonias-geojson")
def get_colonias_geojson():
    """GeoJSON con polígonos de colonias de Mérida (OSM + generados desde candidatos)."""
    global _colonias_geojson_cache
    if _colonias_geojson_cache is None:
        _colonias_geojson_cache = _load_geojson(COLONIAS_GEOJSON)
    return _colonias_geojson_cache


@router.get("/api/municipio-geojson")
def get_municipio_geojson():
    """GeoJSON con el contorno de la ciudad de Mérida."""
    global _municipio_geojson_cache
    if _municipio_geojson_cache is None:
        _municipio_geojson_cache = _load_geojson(MUNICIPIO_GEOJSON)
    return _municipio_geojson_cache


@router.post("/api/admin/reload-colonias")
def reload_colonias(request: Request):
    """Fuerza recarga del GeoJSON de colonias desde disco (sin reiniciar servidor)."""
    require_admin(request)
    global _colonias_geojson_cache, _municipio_geojson_cache
    _colonias_geojson_cache  = _load_geojson(COLONIAS_GEOJSON)
    _municipio_geojson_cache = _load_geojson(MUNICIPIO_GEOJSON)
    return {
        "ok":       True,
        "colonias": len(_colonias_geojson_cache.get("features", [])),
        "municipio": len(_municipio_geojson_cache.get("features", [])),
    }


# ── AGEBs de INEGI ───────────────────────────────────────────────────────────

@router.get("/api/agebs-geojson")
def get_agebs_geojson():
    """GeoJSON con 545 AGEBs urbanos de Mérida (INEGI 2025) + datos del Censo 2020."""
    global _agebs_geojson_cache
    if _agebs_geojson_cache is None:
        _agebs_geojson_cache = _load_geojson(AGEBS_GEOJSON)
    return _agebs_geojson_cache


@router.get("/api/municipios-yucatan-geojson")
def get_municipios_yucatan():
    """GeoJSON con los 106 municipios de Yucatán (INEGI 2025)."""
    global _municipios_yuc_cache
    if _municipios_yuc_cache is None:
        _municipios_yuc_cache = _load_geojson(MUNICIPIOS_YUC)
    return _municipios_yuc_cache


@router.get("/api/datos-geograficos")
def get_datos_geograficos():
    """Resumen de todos los datos geográficos disponibles."""
    return {
        "colonias": {
            "endpoint":    "/api/colonias-geojson",
            "descripcion": "640 polígonos de colonias por código postal (SEPOMEX)",
            "features":    len(_load_geojson(COLONIAS_GEOJSON).get("features", [])),
        },
        "municipio_merida": {
            "endpoint":    "/api/municipio-geojson",
            "descripcion": "Polígono del municipio de Mérida (INEGI)",
            "features":    len(_load_geojson(MUNICIPIO_GEOJSON).get("features", [])),
        },
        "agebs": {
            "endpoint":    "/api/agebs-geojson",
            "descripcion": "545 AGEBs urbanos con datos del Censo 2020 (INEGI)",
            "features":    len(_load_geojson(AGEBS_GEOJSON).get("features", [])),
        },
        "municipios_yucatan": {
            "endpoint":    "/api/municipios-yucatan-geojson",
            "descripcion": "106 municipios de Yucatán (INEGI)",
            "features":    len(_load_geojson(MUNICIPIOS_YUC).get("features", [])),
        },
        "fuentes": {
            "inegi":    "https://gaia.inegi.org.mx/wscatgeo/v2/",
            "sepomex":  "Correos de México - Datos Abiertos",
        },
    }
