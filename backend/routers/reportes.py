from fastapi import APIRouter, HTTPException, Form, File, UploadFile, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid
from pathlib import Path
import db.firestore as fs
from db.database import ROOT

router = APIRouter()

UPLOADS_DIR = ROOT / "data" / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

TIPOS_VALIDOS  = ("bache", "luminaria", "basura", "arbol", "vandalism", "otro")
STATUS_VALIDOS = ("pendiente", "en_proceso", "resuelto")


# ── Modelos ───────────────────────────────────────────────────────────────────

class ReporteOut(BaseModel):
    id: int
    tipo: str = Field(..., description="Categoría del problema reportado")
    descripcion: Optional[str] = Field(None, description="Descripción libre del problema")
    lat: float = Field(..., description="Latitud donde ocurre el problema")
    lng: float = Field(..., description="Longitud donde ocurre el problema")
    direccion: Optional[str] = Field(None, description="Dirección aproximada (reverse geocoding)")
    fecha: str = Field(..., description="Fecha y hora del reporte (ISO)")
    status: str = Field(..., description="Estado: pendiente | en_proceso | resuelto")
    foto_url: Optional[str] = Field(None, description="URL relativa de la foto adjunta (si se subió)")

class ActualizarStatusBody(BaseModel):
    status: str = Field(..., description="Nuevo estado: pendiente | en_proceso | resuelto")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post(
    "/api/reportes",
    response_model=ReporteOut,
    summary="Crear reporte ciudadano con geolocalización",
    description="""
Registra un reporte de problema urbano (bache, luminaria rota, basura, etc.)
con su ubicación geográfica y una foto opcional.

**Tipos permitidos:** `bache`, `luminaria`, `basura`, `arbol`, `vandalism`, `otro`

**Cómo usar desde el mapa:**
1. Ir a la pestaña Reportes
2. Hacer clic en el mapa para colocar el pin de ubicación
3. Seleccionar el tipo de problema
4. Agregar descripción y foto opcional
5. Enviar — el reporte aparece en el mapa inmediatamente

**Foto:** campo opcional, se acepta imagen JPG/PNG hasta 5 MB.
El campo `foto_url` de la respuesta es la URL para visualizar la foto.
""",
    status_code=201,
)
async def crear_reporte(
    tipo:        str           = Form(..., description="Tipo de problema"),
    lat:         float         = Form(..., description="Latitud del problema"),
    lng:         float         = Form(..., description="Longitud del problema"),
    descripcion: Optional[str] = Form(None, description="Descripción del problema"),
    direccion:   Optional[str] = Form(None, description="Dirección aproximada"),
    foto:        Optional[UploadFile] = File(None, description="Foto del problema (JPG/PNG)"),
):
    if tipo not in TIPOS_VALIDOS:
        raise HTTPException(status_code=400, detail=f"tipo inválido. Usa: {', '.join(TIPOS_VALIDOS)}")

    foto_url = None
    if foto and foto.filename:
        ext      = Path(foto.filename).suffix.lower() or ".jpg"
        filename = f"reporte_{uuid.uuid4().hex}{ext}"
        dest     = UPLOADS_DIR / filename
        content  = await foto.read()
        if len(content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="La foto no puede superar 5 MB")
        dest.write_bytes(content)
        foto_url = f"/uploads/{filename}"

    fecha = datetime.utcnow().isoformat()
    return fs.create_reporte({
        "tipo": tipo, "descripcion": descripcion, "lat": lat, "lng": lng,
        "direccion": direccion, "fecha": fecha, "status": "pendiente", "foto_url": foto_url,
    })


@router.get(
    "/api/reportes",
    response_model=List[ReporteOut],
    summary="Listar reportes ciudadanos",
    description="""
Retorna todos los reportes registrados con filtros opcionales.

**Filtros:**
- `tipo`: filtra por categoría (`bache`, `luminaria`, `basura`, `arbol`, `vandalism`, `otro`)
- `status`: filtra por estado (`pendiente`, `en_proceso`, `resuelto`)
- `limit`: máximo de resultados (default 200)

Los reportes se retornan ordenados del más reciente al más antiguo.

**Usado por:** la pestaña Reportes para mostrar la lista y los marcadores en el mapa.
""",
)
def listar_reportes(
    tipo:   Optional[str] = Query(None, description="Filtrar por tipo de problema"),
    status: Optional[str] = Query(None, description="Filtrar por estado"),
    limit:  int           = Query(200, description="Máximo de reportes a retornar"),
):
    if tipo and tipo not in TIPOS_VALIDOS:
        raise HTTPException(status_code=400, detail=f"tipo inválido. Usa: {', '.join(TIPOS_VALIDOS)}")
    if status and status not in STATUS_VALIDOS:
        raise HTTPException(status_code=400, detail=f"status inválido. Usa: {', '.join(STATUS_VALIDOS)}")
    return fs.list_reportes(status=status, tipo=tipo, limit=limit)


@router.patch(
    "/api/reportes/{reporte_id}",
    response_model=ReporteOut,
    summary="Actualizar el estado de un reporte",
    description="""
Cambia el estado de un reporte ciudadano.

**Flujo de estados:**
`pendiente` → `en_proceso` → `resuelto`

Un inspector o supervisor usa este endpoint para marcar el avance
en la atención del problema reportado.

**Ejemplo:** el inspector sale a reparar un bache →
primero actualiza a `en_proceso`, luego a `resuelto` una vez reparado.
""",
    responses={
        404: {"description": "No existe un reporte con ese ID"},
        400: {"description": "Status inválido"},
    },
)
def actualizar_status(reporte_id: int, body: ActualizarStatusBody):
    if body.status not in STATUS_VALIDOS:
        raise HTTPException(status_code=400, detail=f"status inválido. Usa: {', '.join(STATUS_VALIDOS)}")
    ref = fs.col("reportes").document(str(reporte_id))
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail=f"No existe reporte con id={reporte_id}")
    ref.update({"status": body.status})
    return fs.doc_to_dict(ref.get())


@router.delete(
    "/api/reportes/{reporte_id}",
    summary="Eliminar un reporte",
    description="Elimina permanentemente un reporte ciudadano por su ID.",
    responses={404: {"description": "No existe un reporte con ese ID"}},
)
def eliminar_reporte(reporte_id: int):
    ref = fs.col("reportes").document(str(reporte_id))
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail=f"No existe reporte con id={reporte_id}")
    ref.delete()
    return {"ok": True, "eliminado": reporte_id}
