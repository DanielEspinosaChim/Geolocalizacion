from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
import requests as _req
import db.firestore as fs
from db.database import nearest_neighbor_tsp

router = APIRouter()


# ── Modelos ───────────────────────────────────────────────────────────────────

class OrigenBody(BaseModel):
    lat: float = Field(..., description="Latitud del punto de partida")
    lng: float = Field(..., description="Longitud del punto de partida")
    nombre: str = Field("Origen", description="Nombre para mostrar en el mapa (ej: 'Oficina municipal')")

class RutaBody(BaseModel):
    place_ids: List[str] = Field(
        ...,
        description="Lista de place_ids de Google Maps de los negocios a visitar. Mínimo 2, máximo 20.",
        examples=[["ChIJabc123", "ChIJdef456", "ChIJghi789"]],
    )
    origen: Optional[OrigenBody] = Field(
        None,
        description="Punto de partida opcional (ej: oficina del inspector). Si no se proporciona, la ruta empieza desde el primer negocio de la lista.",
    )

class RutaColoniaBody(BaseModel):
    colonia_id: int = Field(
        ...,
        description="ID de la colonia. Obtén los IDs con GET /api/colonias.",
    )
    limite: int = Field(
        20,
        ge=2,
        le=50,
        description="Máximo de negocios a incluir en la ruta (default 20, máximo 50). Se toman los primeros informales encontrados en esa colonia.",
    )

class Waypoint(BaseModel):
    place_id: str
    nombre: str
    lat: float
    lng: float
    tipos: Optional[str]

class RutaResponse(BaseModel):
    geometry: dict = Field(..., description="Geometría de la ruta en formato GeoJSON LineString para dibujar en el mapa")
    distancia_km: float = Field(..., description="Distancia total de la ruta en kilómetros")
    tiempo_min: int = Field(..., description="Tiempo estimado de recorrido en minutos (en auto, sin tráfico)")
    waypoints_ordenados: List[dict] = Field(..., description="Lista de paradas en el orden optimizado de visita")


# ── Función interna ───────────────────────────────────────────────────────────

def _calcular_con_osrm(puntos: list[dict]) -> dict:
    """Llama a la API pública de OSRM para obtener la ruta real en calles."""
    coords = ";".join(f"{p['lng']},{p['lat']}" for p in puntos)
    url    = (
        f"http://router.project-osrm.org/route/v1/driving/{coords}"
        f"?overview=full&geometries=geojson"
    )
    try:
        resp = _req.get(url, timeout=25)
        data = resp.json()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"No se pudo conectar con el servicio de rutas (OSRM): {e}")

    if data.get("code") != "Ok":
        raise HTTPException(status_code=502, detail=f"OSRM respondió con error: {data.get('message', 'error desconocido')}")

    route = data["routes"][0]
    return {
        "geometry":             route["geometry"],
        "distancia_km":         round(route["distance"] / 1000, 2),
        "tiempo_min":           int(route["duration"] / 60),
        "waypoints_ordenados":  puntos,
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post(
    "/api/ruta",
    response_model=RutaResponse,
    summary="Calcular ruta optimizada para una lista de negocios",
    description="""
Recibe una lista de `place_ids` de negocios candidatos y calcula la **ruta óptima
en auto** para visitarlos todos en el menor tiempo posible.

**Algoritmo:**
1. Busca las coordenadas de cada negocio en la base de datos
2. Ordena las paradas con el **heurístico del vecino más cercano** (TSP) para minimizar la distancia total
3. Llama a la **API pública de OSRM** (Open Source Routing Machine) para trazar la ruta real por las calles de Mérida

**Restricciones:**
- Mínimo 2 negocios, máximo 20 por ruta
- Los `place_ids` deben existir en la tabla `candidatos`

**Punto de origen opcional:**
Si envías `origen` con lat/lng, la ruta empieza desde ese punto (ej: la oficina del inspector)
y luego visita todos los negocios en orden óptimo.

**Usado por:** el botón "🗺️ Calcular mejor ruta" en la pestaña Ruta del mapa.
""",
)
def calcular_ruta(body: RutaBody):
    if len(body.place_ids) < 2:
        raise HTTPException(status_code=400, detail="Debes proporcionar al menos 2 place_ids")
    if len(body.place_ids) > 20:
        raise HTTPException(status_code=400, detail="Máximo 20 puntos por ruta")

    rows = fs.get_candidatos_by_place_ids(body.place_ids)
    puntos = [{"place_id": r["place_id"], "nombre": r.get("nombre",""), "lat": r["lat"], "lng": r["lng"], "tipos": r.get("tipos","")} for r in rows if r.get("lat") and r.get("lng")]

    if len(puntos) < 2:
        raise HTTPException(status_code=404, detail="No se encontraron suficientes negocios con esos place_ids en la base de datos")

    if body.origen:
        inicio    = [{"lat": body.origen.lat, "lng": body.origen.lng,
                      "nombre": body.origen.nombre, "tipos": "", "place_id": "__origen__"}]
        ordenados = inicio + nearest_neighbor_tsp(puntos)
    else:
        ordenados = nearest_neighbor_tsp(puntos)

    return _calcular_con_osrm(ordenados)


@router.post(
    "/api/ruta-colonia",
    response_model=RutaResponse,
    summary="Generar ruta automática para todos los informales de una colonia",
    description="""
Genera automáticamente una ruta de visita para los negocios **informales** de
una colonia específica, sin necesidad de seleccionarlos uno a uno.

**Flujo:**
1. Busca todos los candidatos con `tipo = 'informal'` y `colonia_id` igual al solicitado
2. Toma los primeros N según el parámetro `limite`
3. Aplica el mismo algoritmo TSP + OSRM que `POST /api/ruta`

**Caso de uso:** un inspector recibe la instrucción de visitar la Colonia Centro.
En lugar de seleccionar negocios manualmente, usa este endpoint para generar
la ruta completa de todos los informales de esa colonia en un solo paso.

**Nota:** requiere haber cargado las colonias primero con:
```bash
python scripts/importar_colonias.py
```
""",
    responses={
        400: {"description": "La colonia no tiene suficientes candidatos informales (mínimo 2)"},
        404: {"description": "No se encontraron negocios con colonia_id en la base de datos"},
    },
)
def ruta_por_colonia(body: RutaColoniaBody):
    rows = fs.get_candidatos(tipo="informal", colonia_id=body.colonia_id, limit=body.limite)
    puntos = [{"place_id": r["place_id"], "nombre": r.get("nombre",""), "lat": r["lat"], "lng": r["lng"], "tipos": r.get("tipos","")} for r in rows if r.get("lat") and r.get("lng")]

    if len(puntos) < 2:
        raise HTTPException(
            status_code=400,
            detail=f"La colonia con id={body.colonia_id} no tiene suficientes candidatos informales (mínimo 2).",
        )

    ordenados = nearest_neighbor_tsp(puntos)
    return _calcular_con_osrm(ordenados)
