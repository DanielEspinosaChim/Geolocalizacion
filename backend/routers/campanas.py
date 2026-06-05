from fastapi import APIRouter, HTTPException, Query, Depends, Request
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import requests as _req
import db.firestore as fs
from db.database import nearest_neighbor_tsp
from auth import require_any, require_admin

router = APIRouter()


# ── Modelos ───────────────────────────────────────────────────────────────────

class CampanaCreate(BaseModel):
    nombre:      str            = Field(..., description="Nombre descriptivo de la campaña (ej: 'Centro Mayo 2026')")
    descripcion: Optional[str]  = Field(None, description="Descripción del objetivo de la campaña")
    colonia:     Optional[str]  = Field(None, description="Nombre de la colonia objetivo")
    fecha_inicio: Optional[str] = Field(None, description="Fecha de inicio (YYYY-MM-DD)")
    fecha_fin:    Optional[str] = Field(None, description="Fecha de cierre (YYYY-MM-DD)")

class CampanaOut(BaseModel):
    id:           int
    nombre:       str
    descripcion:  Optional[str]
    colonia:      Optional[str]
    fecha_inicio: Optional[str]
    fecha_fin:    Optional[str]
    status:       str
    created_at:   str
    total_negocios:   Optional[int] = Field(None, description="Total de negocios asignados a esta campaña")
    total_completados: Optional[int] = Field(None, description="Negocios ya visitados/completados")
    asignado_a:      Optional[str]  = Field(None, description="UID del técnico asignado")
    asignado_nombre: Optional[str]  = Field(None, description="Nombre del técnico asignado")

class NegociosCampanaBody(BaseModel):
    negocio_ids:    List[str] = Field(..., description="Lista de place_ids de los negocios a agregar a la campaña")
    checklist_json: Optional[str] = Field(
        None,
        description='JSON con los ítems del checklist para cada visita. Ej: ["Verificar nombre", "Tomar foto fachada", "Entregar volante"]',
    )

class ActualizarNegocioBody(BaseModel):
    completado:  Optional[bool] = Field(None, description="true = visita completada, false = pendiente")
    notas:       Optional[str]  = Field(None, description="Observaciones del inspector durante la visita")
    fecha_visita: Optional[str] = Field(None, description="Fecha real de visita (YYYY-MM-DD)")
    checklist_json: Optional[str] = Field(None, description="JSON actualizado con el estado del checklist")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _enrich_campana(row: dict) -> dict:
    negs = fs.get_campana_negocios(row["id"])
    row["total_negocios"]    = len(negs)
    row["total_completados"] = sum(1 for n in negs if n.get("completado"))
    return row


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post(
    "/api/campanas",
    response_model=CampanaOut,
    summary="Crear una nueva campaña de visitas",
    description="""
Una **campaña** es un conjunto organizado de visitas de campo a negocios informales,
con fechas definidas, una colonia objetivo y un checklist de actividades por visita.

**Flujo típico:**
1. Crear la campaña con nombre, colonia y fechas
2. Agregar los negocios a visitar con `POST /api/campanas/{id}/negocios`
3. Los inspectores salen a campo y actualizan cada negocio con `PATCH /api/campanas/{id}/negocios/{negocio_id}`
4. Ver el progreso con `GET /api/campanas/{id}`
5. Descargar el reporte final con `POST /api/reporte-visita`
""",
    status_code=201,
)
def crear_campana(body: CampanaCreate):
    now  = datetime.utcnow().isoformat()
    data = {
        "nombre": body.nombre, "descripcion": body.descripcion,
        "colonia": body.colonia, "fecha_inicio": body.fecha_inicio,
        "fecha_fin": body.fecha_fin, "status": "activa", "created_at": now,
    }
    row = fs.create_campana(data)
    row["total_negocios"] = 0
    row["total_completados"] = 0
    return row


@router.get(
    "/api/campanas",
    response_model=List[CampanaOut],
    summary="Listar campañas",
    description="""
Retorna todas las campañas con su progreso (negocios totales vs completados).

**Filtro `status`:** `activa` | `cerrada` | `cancelada`

Cada campaña incluye:
- `total_negocios`: cuántos negocios tiene asignados
- `total_completados`: cuántos ya fueron visitados

Úsalo para mostrar la barra de progreso en la lista de campañas.
""",
)
def listar_campanas(status: Optional[str] = Query(None), user=Depends(require_any)):
    # Admin ve todo; tecnico solo ve las que le asignaron (o sin asignar)
    uid = None if user["role"] == "admin" else user["uid"]
    return fs.list_campanas(status=status, uid=uid)


@router.get(
    "/api/campanas/{campana_id}",
    summary="Detalle de campaña con negocios, checklist y ruta",
    description="""
Retorna el detalle completo de una campaña incluyendo:
- Datos de la campaña (nombre, colonia, fechas, status, progreso)
- Lista de negocios asignados con su estado de checklist
- **Ruta optimizada** calculada automáticamente para todos los negocios pendientes

La ruta se genera usando el mismo algoritmo TSP + OSRM que `POST /api/ruta`.
Si todos los negocios ya están completados, `ruta` será `null`.

**Usado por:** la vista de detalle de campaña en el frontend para mostrar
el mapa de ruta y el checklist por negocio.
""",
    responses={404: {"description": "Campaña no encontrada"}},
)
def detalle_campana(campana_id: int):
    campana = fs.get_campana(campana_id)
    if not campana:
        raise HTTPException(status_code=404, detail=f"No existe campaña con id={campana_id}")

    negocios = fs.get_campana_negocios(campana_id)
    campana["total_negocios"]    = len(negocios)
    campana["total_completados"] = sum(1 for n in negocios if n.get("completado"))

    # Normalizar campo cn_id
    for n in negocios:
        n.setdefault("cn_id", n.get("id"))

    # Calcular ruta solo para negocios pendientes con coordenadas
    pendientes = [n for n in negocios if not n["completado"] and n["lat"] and n["lng"]]
    ruta = None
    if len(pendientes) >= 2:
        puntos    = [{"place_id": n["negocio_id"], "nombre": n["nombre"] or "?",
                      "lat": n["lat"], "lng": n["lng"], "tipos": n["tipos"] or ""} for n in pendientes]
        ordenados = nearest_neighbor_tsp(puntos)
        coords    = ";".join(f"{p['lng']},{p['lat']}" for p in ordenados)
        url       = f"http://router.project-osrm.org/route/v1/driving/{coords}?overview=full&geometries=geojson"
        try:
            resp = _req.get(url, timeout=20)
            data = resp.json()
            if data.get("code") == "Ok":
                rt = data["routes"][0]
                ruta = {
                    "geometry":            rt["geometry"],
                    "distancia_km":        round(rt["distance"] / 1000, 2),
                    "tiempo_min":          int(rt["duration"] / 60),
                    "waypoints_ordenados": ordenados,
                }
        except Exception:
            pass

    return {"campana": campana, "negocios": negocios, "ruta": ruta}


@router.post(
    "/api/campanas/{campana_id}/negocios",
    summary="Agregar negocios a una campaña",
    description="""
Asigna una lista de negocios candidatos a la campaña para ser visitados.

**`negocio_ids`**: lista de `place_id` de Google Maps (obtenlos de `GET /api/candidatos`).

**`checklist_json`** (opcional): JSON con los pasos a seguir en cada visita.
Se aplica igual a todos los negocios agregados en este llamado.
Ejemplo:
```json
["Verificar nombre del negocio", "Fotografiar fachada", "Entregar volante informativo", "Registrar respuesta del dueño"]
```

Los negocios duplicados (ya en la campaña) se ignoran silenciosamente.
""",
    responses={404: {"description": "Campaña no encontrada"}},
)
def agregar_negocios(campana_id: int, body: NegociosCampanaBody):
    if not fs.get_campana(campana_id):
        raise HTTPException(status_code=404, detail=f"No existe campaña con id={campana_id}")
    insertados = fs.add_negocios_to_campana(campana_id, body.negocio_ids, body.checklist_json)
    return {"ok": True, "campana_id": campana_id, "insertados": insertados, "duplicados_ignorados": len(body.negocio_ids) - insertados}


@router.patch(
    "/api/campanas/{campana_id}/negocios/{negocio_id}",
    summary="Actualizar visita / checklist de un negocio en la campaña",
    description="""
Actualiza el estado de la visita a un negocio específico dentro de la campaña.
Solo se actualizan los campos que envíes en el body (los demás quedan igual).

**Campos disponibles:**
- `completado`: `1` = visita realizada, `0` = pendiente
- `notas`: observaciones del inspector (ej: "dueño ausente, volver mañana")
- `fecha_visita`: fecha en que se realizó la visita (`YYYY-MM-DD`)
- `checklist_json`: JSON actualizado con los ítems del checklist marcados

**Caso de uso:** el inspector visita el negocio en campo, marca los ítems
del checklist como completados y agrega notas, todo desde la app móvil.
""",
    responses={404: {"description": "No se encontró ese negocio en esa campaña"}},
)
def actualizar_negocio_campana(campana_id: int, negocio_id: str, body: ActualizarNegocioBody):
    campos = {k: v for k, v in body.model_dump().items() if v is not None}
    updated = fs.update_negocio_campana(campana_id, negocio_id, campos)
    if updated is None:
        raise HTTPException(status_code=404, detail=f"Negocio '{negocio_id}' no está en la campaña {campana_id}")
    return updated


@router.patch(
    "/api/campanas/{campana_id}/status",
    summary="Cambiar el estado de una campaña",
    description="""
Cambia el estado general de la campaña.

**Estados posibles:** `activa` | `cerrada` | `cancelada`

Una campaña `cerrada` indica que las visitas fueron completadas.
Una campaña `cancelada` fue suspendida antes de completarse.
""",
    responses={404: {"description": "Campaña no encontrada"}},
)
def actualizar_status_campana(campana_id: int, body: dict):
    status_validos = ("activa", "cerrada", "cancelada")
    nuevo_status   = body.get("status", "")
    if nuevo_status not in status_validos:
        raise HTTPException(status_code=400, detail=f"status inválido. Usa: {', '.join(status_validos)}")
    ok = fs.update_campana_status(campana_id, nuevo_status)
    if not ok:
        raise HTTPException(status_code=404, detail=f"No existe campaña con id={campana_id}")
    return {"ok": True, "campana_id": campana_id, "status": nuevo_status}


@router.delete(
    "/api/campanas/{campana_id}",
    summary="Eliminar una campaña",
    description="""
Elimina permanentemente una campaña y todos sus registros de negocios/checklist.
Esta acción no se puede deshacer.
""",
    responses={404: {"description": "Campaña no encontrada"}},
)
def eliminar_campana(campana_id: int):
    ok = fs.delete_campana(campana_id)
    if not ok:
        raise HTTPException(status_code=404, detail=f"No existe campaña con id={campana_id}")
    return {"ok": True, "eliminada": campana_id}
