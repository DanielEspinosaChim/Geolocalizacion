"""
Plantillas de visita — los campos del formulario que el técnico llena al
registrar una visita a un negocio de la campaña.

El frontend (VisitaModal / CampoVisita) renderiza `campos` tal cual: cada campo
tiene `tipo` (texto, textarea, numero, bool, opciones, foto) y opcionalmente
`opciones`. Si la colección está vacía, el primer GET siembra la "Visita
estándar" para que el formulario no aparezca vacío en una instalación nueva.
"""
from datetime import datetime

from fastapi import APIRouter, Body, HTTPException

import db.firestore as fs

router = APIRouter()

_COLECCION = "plantillas"

# Campos de la plantilla por defecto. Deben coincidir con los tipos que entiende
# `CampoVisita` en el frontend; `notas` y `foto` los pinta el modal aparte.
_CAMPOS_DEFAULT = [
    {"key": "resultado",      "label": "Resultado",                     "tipo": "opciones",
     "opciones": ["Contactado", "No encontrado", "Rechazó"]},
    {"key": "num_empleados",  "label": "No. de empleados",              "tipo": "numero"},
    {"key": "tiene_rfc",      "label": "¿Tiene RFC?",                   "tipo": "bool"},
    {"key": "interesado",     "label": "¿Interesado en formalizarse?",  "tipo": "opciones",
     "opciones": ["Sí", "Tal vez", "No"]},
    {"key": "telefono",       "label": "Teléfono de contacto",          "tipo": "texto"},
    {"key": "notas",          "label": "Notas",                         "tipo": "textarea"},
    # Las dos fotos son campos de la plantilla para que el editor pueda
    # reordenarlas y renombrarlas como cualquier otro campo.
    {"key": "foto_local",     "label": "Foto del local",                "tipo": "foto"},
    {"key": "foto_negocio",   "label": "Foto del negocio",              "tipo": "foto"},
]

_PLANTILLA_DEFAULT = {
    "nombre":      "Visita estándar",
    "descripcion": "Campos básicos para registrar una visita",
    "campos":      _CAMPOS_DEFAULT,
    "es_default":  True,
}


@router.get("/api/plantillas", summary="Listar plantillas de visita")
def listar_plantillas():
    """Devuelve las plantillas; siembra la estándar si no hay ninguna."""
    rows = [fs.doc_to_dict(s) for s in fs.col(_COLECCION).stream()]
    if not rows:
        datos = {**_PLANTILLA_DEFAULT, "created_at": datetime.utcnow().isoformat()}
        ref = fs.col(_COLECCION).document()
        ref.set(datos)
        return [{**datos, "id": ref.id}]
    return rows


@router.post("/api/plantillas", status_code=201, summary="Crear plantilla")
def crear_plantilla(body: dict = Body(...)):
    datos = {
        "nombre":      body.get("nombre") or "Plantilla",
        "descripcion": body.get("descripcion"),
        "campos":      body.get("campos") or [],
        "es_default":  bool(body.get("es_default")),
        "created_at":  datetime.utcnow().isoformat(),
    }
    ref = fs.col(_COLECCION).document()
    ref.set(datos)
    return {**datos, "id": ref.id}


@router.put("/api/plantillas/{plantilla_id}", summary="Actualizar plantilla")
def actualizar_plantilla(plantilla_id: str, body: dict = Body(...)):
    ref = fs.col(_COLECCION).document(plantilla_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="No existe la plantilla")
    # Solo campos editables: el id y created_at no se tocan desde el cliente.
    ref.update({
        "nombre":      body.get("nombre") or "Plantilla",
        "descripcion": body.get("descripcion"),
        "campos":      body.get("campos") or [],
        "es_default":  bool(body.get("es_default")),
    })
    return fs.doc_to_dict(ref.get())


@router.delete("/api/plantillas/{plantilla_id}", summary="Eliminar plantilla")
def eliminar_plantilla(plantilla_id: str):
    ref = fs.col(_COLECCION).document(plantilla_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="No existe la plantilla")
    ref.delete()
    return {"ok": True, "eliminada": plantilla_id}
