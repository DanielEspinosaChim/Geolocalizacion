"""
Capas geográficas (GeoJSON) para el mapa — colonias, AGEBs y municipios.

Restaura los endpoints que consumen ColoniasLayer / AgebsLayer / MunicipiosLayer
del frontend y que se perdieron al refactorizar el backend a routers. Sirve los
archivos GeoJSON de INEGI/OSM tal cual (Leaflet los pinta), cacheados en memoria.
"""
import json

from fastapi import APIRouter

from db.database import ROOT

router = APIRouter()

_DATA = ROOT / "data"
_FILES = {
    "colonias":   _DATA / "procesado" / "colonias_merida.geojson",
    "agebs":      _DATA / "inegi"     / "agebs_urbanos_merida.geojson",
    "municipios": _DATA / "inegi"     / "municipios_yucatan.geojson",
}
_cache: dict = {}


def _load(clave: str) -> dict:
    if clave not in _cache:
        ruta = _FILES[clave]
        _cache[clave] = (
            json.loads(ruta.read_text(encoding="utf-8"))
            if ruta.exists()
            else {"type": "FeatureCollection", "features": []}
        )
    return _cache[clave]


@router.get("/api/colonias-geojson", summary="GeoJSON de colonias de Mérida")
def colonias_geojson():
    """Polígonos de colonias de Mérida (OSM). Usado por la capa 'Colonias' del mapa."""
    return _load("colonias")


@router.get("/api/agebs-geojson", summary="GeoJSON de AGEBs urbanos de Mérida")
def agebs_geojson():
    """545 AGEBs urbanos con datos del Censo 2020 (INEGI). Capa 'AGEBs' del mapa."""
    return _load("agebs")


@router.get("/api/municipios-yucatan-geojson", summary="GeoJSON de municipios de Yucatán")
def municipios_yucatan_geojson():
    """106 municipios de Yucatán (INEGI). Usado por la capa 'Municipios' del mapa."""
    return _load("municipios")
