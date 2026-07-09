import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Body, Form, UploadFile, File
from firebase_admin import auth as fb_auth

from backend.core.cache import get_candidatos
from backend.core.config import UPLOADS_DIR, GCS_BUCKET
from backend.core.firebase import fdb, gcs_client, firebase_ok

router = APIRouter()

_CAMPOS_DEFAULT = [
    {"key": "resultado",      "label": "Resultado",                     "tipo": "opciones",
     "opciones": ["Contactado", "No encontrado", "Rechazó"], "requerido": True},
    {"key": "tiene_internet", "label": "¿Tiene internet?",             "tipo": "bool"},
    {"key": "tiene_local",    "label": "¿Tiene local fijo?",           "tipo": "bool"},
    {"key": "num_empleados",  "label": "No. empleados",                 "tipo": "numero"},
    {"key": "tiene_rfc",      "label": "¿Tiene RFC?",                  "tipo": "bool"},
    {"key": "interesado",     "label": "¿Interesado en formalizarse?", "tipo": "opciones",
     "opciones": ["Sí", "Tal vez", "No"]},
    {"key": "telefono",       "label": "Teléfono de contacto",         "tipo": "texto"},
    {"key": "notas",          "label": "Notas",                        "tipo": "textarea"},
    {"key": "foto",           "label": "Foto del negocio",             "tipo": "foto"},
]


# ── Campañas ──────────────────────────────────────────────────────────────────

@router.get("/api/campanas")
def get_campanas(status: Optional[str] = None):
    if fdb is None:
        raise HTTPException(503, "Firestore no disponible")
    try:
        docs   = list(fdb.collection("campanas").stream())
        result = []
        for doc in docs:
            c = {**doc.to_dict(), "id": doc.id}
            if status and c.get("status") != status:
                continue
            nds = list(fdb.collection("campanas").document(doc.id)
                          .collection("negocios").stream())
            c["total_negocios"]    = len(nds)
            c["total_completados"] = sum(1 for nd in nds if nd.to_dict().get("completado"))
            result.append(c)
        result.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return result
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/api/campanas")
def crear_campana(body: dict = Body(...)):
    if fdb is None:
        raise HTTPException(503, "Firestore no disponible")
    try:
        _, doc_ref = fdb.collection("campanas").add({
            "nombre":       body.get("nombre"),
            "descripcion":  body.get("descripcion"),
            "colonia":      body.get("colonia"),
            "fecha_inicio": body.get("fecha_inicio"),
            "fecha_fin":    body.get("fecha_fin"),
            "status":       "activa",
            "created_at":   datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        })
        return {"ok": True, "id": doc_ref.id}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/api/campanas/{campana_id}")
def get_campana(campana_id: str):
    if fdb is None:
        raise HTTPException(503, "Firestore no disponible")
    try:
        doc = fdb.collection("campanas").document(campana_id).get()
        if not doc.exists:
            raise HTTPException(404, "Campaña no encontrada")
        campana  = {**doc.to_dict(), "id": doc.id}
        nds      = list(fdb.collection("campanas").document(campana_id)
                           .collection("negocios").stream())
        negocios = []
        for nd in nds:
            d       = nd.to_dict()
            real_id = d.get("negocio_id") or nd.id.replace("__", "/")
            negocios.append({**d, "cn_id": real_id, "negocio_id": real_id,
                             "nombre": d.get("nombre", real_id),
                             "tipo":   d.get("tipo", "informal"),
                             "tipos":  d.get("tipos", "")})
        campana["total_negocios"]    = len(negocios)
        campana["total_completados"] = sum(1 for n in negocios if n.get("completado"))
        return {"campana": campana, "negocios": negocios, "ruta": None}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/api/campanas/{campana_id}/negocios")
def agregar_negocios_campana(campana_id: str, body: dict = Body(...)):
    if fdb is None:
        raise HTTPException(503, "Firestore no disponible")
    negocio_ids = body.get("negocio_ids", [])
    cand_map    = {c["place_id"]: c for c in get_candidatos() if c.get("place_id")}
    try:
        col              = fdb.collection("campanas").document(campana_id).collection("negocios")
        added = duplicados = 0
        for nid in negocio_ids:
            safe_id = nid.replace("/", "__")
            ref     = col.document(safe_id)
            if ref.get().exists:
                duplicados += 1
                continue
            cand = cand_map.get(nid, {})
            ref.set({
                "negocio_id":  nid,
                "completado":  False,
                "notas":       "",
                "fecha_visita": "",
                "checklist_json": "[]",
                "nombre":   cand.get("nombre", nid),
                "tipo":     cand.get("tipo", "informal"),
                "tipos":    cand.get("tipos", ""),
                "lat":      cand.get("lat"),
                "lng":      cand.get("lng"),
                "colonia":  cand.get("colonia_nombre") or cand.get("colonia_denue") or "",
                "direccion": cand.get("direccion") or cand.get("address") or "",
            })
            added += 1
        return {"ok": True, "insertados": added, "duplicados_ignorados": duplicados}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.patch("/api/campanas/{campana_id}/negocios/{negocio_id:path}")
def actualizar_negocio_campana(campana_id: str, negocio_id: str, body: dict = Body(...)):
    if fdb is None:
        raise HTTPException(503, "Firestore no disponible")
    try:
        safe_id = negocio_id.replace("/", "__")
        # Normalizar completado a bool (el frontend a veces envía 1/0)
        if "completado" in body:
            body["completado"] = bool(body["completado"])
        fdb.collection("campanas").document(campana_id) \
           .collection("negocios").document(safe_id).update(body)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.patch("/api/campanas/{campana_id}/status")
def actualizar_status_campana(campana_id: str, body: dict = Body(...)):
    if fdb is None:
        raise HTTPException(503, "Firestore no disponible")
    try:
        fdb.collection("campanas").document(campana_id).update({"status": body.get("status")})
        return {"ok": True}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.patch("/api/campanas/{campana_id}/asignar")
def asignar_campana(campana_id: str, body: dict = Body(...)):
    """Asigna (o desasigna) un técnico a una campaña."""
    if fdb is None:
        raise HTTPException(503, "Firestore no disponible")
    try:
        uid         = body.get("asignado_a")  # None o uid del técnico
        update_data: dict = {"asignado_a": uid}
        # Intentar obtener nombre del técnico desde Firebase Auth
        if uid and firebase_ok:
            try:
                u = fb_auth.get_user(uid)
                update_data["asignado_nombre"] = u.display_name or u.email or uid
            except Exception:
                update_data["asignado_nombre"] = uid
        else:
            update_data["asignado_nombre"] = None
        fdb.collection("campanas").document(campana_id).update(update_data)
        return {"ok": True, "asignado_a": uid,
                "asignado_nombre": update_data.get("asignado_nombre")}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.delete("/api/campanas/{campana_id}")
def eliminar_campana(campana_id: str):
    if fdb is None:
        raise HTTPException(503, "Firestore no disponible")
    try:
        col = fdb.collection("campanas").document(campana_id).collection("negocios")
        for nd in col.stream():
            nd.reference.delete()
        fdb.collection("campanas").document(campana_id).delete()
        return {"ok": True}
    except Exception as e:
        raise HTTPException(500, str(e))


# ── Plantillas de visita ──────────────────────────────────────────────────────

@router.get("/api/plantillas")
def get_plantillas():
    if fdb is None:
        raise HTTPException(503, "Firestore no disponible")
    try:
        docs   = list(fdb.collection("plantillas_visita").stream())
        result = [{**doc.to_dict(), "id": doc.id} for doc in docs]
        if not result:
            _, ref = fdb.collection("plantillas_visita").add({
                "nombre":      "Visita estándar",
                "descripcion": "Campos básicos para registro de visita",
                "campos":      _CAMPOS_DEFAULT,
                "es_default":  True,
                "created_at":  datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            })
            result = [{"id": ref.id, "nombre": "Visita estándar", "es_default": True,
                       "descripcion": "Campos básicos para registro de visita",
                       "campos": _CAMPOS_DEFAULT}]
        return result
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/api/plantillas")
def crear_plantilla(body: dict = Body(...)):
    if fdb is None:
        raise HTTPException(503, "Firestore no disponible")
    try:
        _, ref = fdb.collection("plantillas_visita").add({
            "nombre":      body.get("nombre", "Nueva plantilla"),
            "descripcion": body.get("descripcion", ""),
            "campos":      body.get("campos", []),
            "es_default":  False,
            "created_at":  datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        })
        return {"ok": True, "id": ref.id}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.put("/api/plantillas/{plantilla_id}")
def actualizar_plantilla(plantilla_id: str, body: dict = Body(...)):
    if fdb is None:
        raise HTTPException(503, "Firestore no disponible")
    try:
        upd = {k: body[k] for k in ("nombre", "descripcion", "campos") if k in body}
        fdb.collection("plantillas_visita").document(plantilla_id).update(upd)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.delete("/api/plantillas/{plantilla_id}")
def eliminar_plantilla(plantilla_id: str):
    if fdb is None:
        raise HTTPException(503, "Firestore no disponible")
    try:
        doc = fdb.collection("plantillas_visita").document(plantilla_id).get()
        if doc.exists and doc.to_dict().get("es_default"):
            raise HTTPException(400, "No puedes eliminar la plantilla por defecto")
        fdb.collection("plantillas_visita").document(plantilla_id).delete()
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/api/campanas/{campana_id}/negocios/{negocio_id:path}/visita")
async def guardar_visita_negocio(
    campana_id:   str,
    negocio_id:   str,
    foto:         Optional[UploadFile] = File(None),
    datos_json:   str                  = Form("{}"),
    plantilla_id: str                  = Form(""),
    completado:   str                  = Form("true"),
):
    if fdb is None:
        raise HTTPException(503, "Firestore no disponible")
    try:
        datos = json.loads(datos_json)
    except Exception:
        datos = {}

    foto_url = None
    if foto and foto.filename:
        data_bytes = await foto.read()
        fname      = f"visita_{campana_id[:8]}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
        try:
            blob = gcs_client.bucket(GCS_BUCKET).blob(fname)
            blob.upload_from_string(data_bytes, content_type=foto.content_type or "image/jpeg")
            foto_url = f"/uploads/{fname}"
            print(f"  [Storage] Visita subida a GCS: {fname}")
        except Exception as e:
            print(f"  [Storage] Visita upload fallido: {e}")
            dest = UPLOADS_DIR / fname
            dest.write_bytes(data_bytes)
            foto_url = f"/uploads/{fname}"

    safe_id = negocio_id.replace("/", "__")
    upd = {
        "completado":   completado.lower() not in ("false", "0", ""),
        "fecha_visita": datetime.now().strftime("%Y-%m-%d"),
        "visita_datos": datos,
        "notas":        datos.get("notas", ""),
    }
    if foto_url:
        upd["foto_visita_url"] = foto_url
    if plantilla_id:
        upd["plantilla_id"] = plantilla_id
    fdb.collection("campanas").document(campana_id) \
       .collection("negocios").document(safe_id).update(upd)
    return {"ok": True, "foto_url": foto_url}
