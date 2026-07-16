from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import pandas as pd
import db.firestore as fs
from db.database import ROOT

router = APIRouter()

CRUCE_CSV = ROOT / "data" / "procesado" / "cruce_completo.csv"

# ── Modelos de respuesta ──────────────────────────────────────────────────────

class Candidato(BaseModel):
    place_id: str = Field(..., description="ID único del negocio en Google Maps")
    nombre: str = Field(..., description="Nombre del negocio tal como aparece en Google Maps")
    lat: float = Field(..., description="Latitud geográfica")
    lng: float = Field(..., description="Longitud geográfica")
    tipos: Optional[str] = Field(None, description="Categorías del negocio separadas por coma (ej: 'restaurant,food')")
    tipo: Optional[str] = Field("informal", description="Estado de formalización: 'informal' | 'en_proceso' | 'formal'")
    fecha_actualizacion: Optional[str] = Field(None, description="Última vez que se actualizó el tipo (ISO timestamp)")
    # La colonia viaja como texto: es la clave con la que el frontend filtra y con la
    # que se pide una ruta (ver GET /api/colonias). Sin declararlos aquí, el
    # response_model los borraba de la respuesta y el filtro por colonia quedaba muerto.
    colonia_nombre: Optional[str] = Field(None, description="Colonia según OpenStreetMap (preferida)")
    colonia_denue: Optional[str] = Field(None, description="Colonia según DENUE (respaldo si falta la de OSM)")

class MetricasResponse(BaseModel):
    total: int = Field(..., description="Total de negocios analizados en el cruce GMaps vs DENUE")
    formales: int = Field(..., description="Negocios con match confirmado en el padrón DENUE")
    informales: int = Field(..., description="Negocios sin match en DENUE — candidatos a formalización")
    pct_informal: float = Field(..., description="Porcentaje de negocios sin registro (%)")
    score_prom: float = Field(..., description="Score promedio de similitud de nombre en los matches (0–100)")
    dist_prom_m: float = Field(..., description="Distancia promedio en metros entre el punto de GMaps y el registro en DENUE")
    top_tipos: List = Field(..., description="Top 8 tipos de negocios informales detectados [[tipo, cantidad], ...]")

class ActualizarTipoBody(BaseModel):
    tipo: str = Field(
        ...,
        description="Nuevo estado de formalización del negocio",
        examples=["informal", "en_proceso", "formal"],
    )

class ActualizarTipoResponse(BaseModel):
    ok: bool
    place_id: str
    tipo: str
    fecha_actualizacion: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/api/cache-status", summary="Estado del cache de candidatos")
def cache_status():
    """Devuelve el estado del cache en memoria — sin leer Firestore."""
    return fs.get_cache_status()


@router.get(
    "/api/candidatos",
    response_model=List[Candidato],
    summary="Listar candidatos informales",
    description="""
Retorna la lista de negocios que aparecen en Google Maps pero **no tienen match
en el DENUE** (padrón oficial del INEGI), es decir, candidatos a ser negocios informales.

**Filtros disponibles:**
- `tipo`: filtra por estado de formalización (`informal`, `en_proceso`, `formal`)
- `limit`: máximo de registros a retornar (default 10000 — cubre el total actual sin truncar)

Cada candidato trae su colonia como texto (`colonia_nombre`, o `colonia_denue` si
falta la primera). El filtrado por colonia se hace en el cliente contra ese nombre;
el catálogo con los conteos está en `GET /api/colonias`.

**Caso de uso principal:** el mapa los consume para pintar los marcadores de colores.
""",
)
def get_candidatos(
    limit: int = 10_000,
    tipo: Optional[str] = None,
):
    if tipo and tipo not in ("informal", "en_proceso", "formal"):
        raise HTTPException(status_code=400, detail="tipo debe ser: informal, en_proceso o formal")
    return fs.get_candidatos(tipo=tipo, limit=limit)


@router.get(
    "/api/metricas",
    response_model=MetricasResponse,
    summary="Métricas generales del cruce DENUE vs Google Maps",
    description="""
Retorna un resumen estadístico del cruce entre los negocios de Google Maps y el
padrón oficial DENUE (INEGI).

**Qué significa cada campo:**
- `total`: todos los negocios evaluados
- `formales`: los que sí están registrados en el DENUE (match por proximidad + nombre similar)
- `informales`: los que **no** tienen match → candidatos a formalización
- `pct_informal`: qué porcentaje del total son candidatos informales
- `score_prom`: qué tan buenos son los matches encontrados (100 = nombre idéntico)
- `dist_prom_m`: qué tan cerca están el punto de GMaps y el registro DENUE
- `top_tipos`: los tipos de negocio más frecuentes entre los informales

**Usado por:** el panel lateral del mapa para mostrar el resumen general.
""",
)
def get_metricas():
    if not CRUCE_CSV.exists():
        raise HTTPException(status_code=404, detail="No se encontró cruce_completo.csv — corre primero: python cruce.py")

    df         = pd.read_csv(CRUCE_CSV)
    total      = len(df)
    formales   = int(df["match_denue"].sum())
    informales = total - formales
    df_match   = df[df["match_denue"] == True]
    score_prom = round(df_match["fuzzy_score"].mean(), 1) if len(df_match) else 0
    df_dist    = df_match[df_match["distancia_m"] < 9999]
    dist_prom  = round(df_dist["distancia_m"].mean(), 1) if len(df_dist) else 0

    df_inf       = df[df["es_informal"] == True]
    tipos_counts: dict = {}
    for tipos in df_inf["tipos"].dropna():
        for t in str(tipos).split(","):
            t = t.strip()
            if t and t not in ("point_of_interest", "establishment", "service"):
                tipos_counts[t] = tipos_counts.get(t, 0) + 1
    top_tipos = sorted(tipos_counts.items(), key=lambda x: -x[1])[:8]

    return {
        "total": total, "formales": formales, "informales": informales,
        "pct_informal": round(informales / total * 100, 1) if total else 0,
        "score_prom": score_prom, "dist_prom_m": dist_prom,
        "top_tipos": top_tipos,
    }


@router.get(
    "/api/muestra-validacion",
    summary="Muestra de matches y no-matches para validación manual",
    description="""
Retorna dos listas para que un supervisor pueda validar visualmente que el cruce
entre Google Maps y el DENUE está funcionando bien.

**`matches`** — los 15 mejores matches encontrados:
- `nombre`: nombre en Google Maps
- `nombre_denue`: nombre en el padrón DENUE
- `fuzzy_score`: similitud del nombre (0–100). Un match se considera válido con ≥72
- `distancia_m`: distancia en metros entre ambos puntos

**`no_matches`** — 15 candidatos informales para revisión:
- Son negocios que aparecen en GMaps pero no encontramos ningún registro en DENUE a 50 metros con nombre similar
- Se recomienda buscar 3 o 4 de estos en Google para confirmar manualmente que efectivamente no están registrados

**Usado por:** la pestaña "Validación" del mapa.
""",
)
def muestra_validacion():
    if not CRUCE_CSV.exists():
        raise HTTPException(status_code=404, detail="No se encontró cruce_completo.csv — corre primero: python cruce.py")

    df = pd.read_csv(CRUCE_CSV)
    matches = (
        df[df["match_denue"] == True]
        [["nombre", "nombre_denue", "fuzzy_score", "distancia_m"]]
        .sort_values("fuzzy_score", ascending=False)
        .head(15).to_dict(orient="records")
    )
    no_matches = (
        df[df["es_informal"] == True]
        [["nombre", "tipos", "lat", "lng"]]
        .head(15).to_dict(orient="records")
    )
    return {"matches": matches, "no_matches": no_matches}


@router.patch(
    "/api/candidatos/{place_id}/tipo",
    response_model=ActualizarTipoResponse,
    summary="Actualizar el tipo de formalización de un negocio",
    description="""
Permite a un inspector o supervisor marcar manualmente el estado de formalización
de un negocio candidato.

**Estados posibles:**
- `informal` — no está registrado ante el gobierno (estado inicial por defecto)
- `en_proceso` — ya inició su trámite de formalización
- `formal` — se confirmó que está debidamente registrado

El cambio se refleja inmediatamente en el mapa (el marcador cambia de color)
y queda guardado en la base de datos con la fecha y hora de la actualización.

**`place_id`** es el ID de Google Maps del negocio. Lo puedes obtener del listado
en `GET /api/candidatos`.
""",
    responses={
        400: {"description": "Tipo inválido — debe ser informal, en_proceso o formal"},
        404: {"description": "No se encontró ningún negocio con ese place_id"},
    },
)
def actualizar_tipo(place_id: str, body: ActualizarTipoBody):
    if body.tipo not in ("informal", "en_proceso", "formal"):
        raise HTTPException(status_code=400, detail="tipo debe ser: informal, en_proceso o formal")

    now = datetime.utcnow().isoformat()
    ok  = fs.update_candidato_tipo(place_id, body.tipo, now)
    if not ok:
        raise HTTPException(status_code=404, detail=f"No se encontró el negocio con place_id: {place_id}")

    fs.update_candidato_tipo_local(place_id, body.tipo, now)  # sincroniza cache sin releer Firestore

    return {"ok": True, "place_id": place_id, "tipo": body.tipo, "fecha_actualizacion": now}
