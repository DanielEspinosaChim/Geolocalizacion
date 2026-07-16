from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Form, UploadFile, File, Body

from backend.core.config import UPLOADS_DIR, GCS_BUCKET
from backend.core.firebase import fdb, gcs_client

router = APIRouter()


@router.get("/api/reportes")
def get_reportes(limit: int = 200, status: Optional[str] = None):
    if fdb is None:
        raise HTTPException(503, "Firestore no disponible")
    try:
        docs   = fdb.collection("reportes").order_by("fecha", direction="DESCENDING").limit(limit).stream()
        result = [{**doc.to_dict(), "id": doc.id} for doc in docs]
        if status:
            result = [r for r in result if r.get("status") == status]
        return result
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/api/reportes")
async def crear_reporte(
    tipo:        str             = Form(...),
    lat:         float           = Form(...),
    lng:         float           = Form(...),
    descripcion: str             = Form(""),
    direccion:   str             = Form(""),
    foto:        Optional[UploadFile] = File(None),
):
    if fdb is None:
        raise HTTPException(503, "Firestore no disponible")
    foto_url = None
    if foto and foto.filename:
        import uuid as _uuid
        data_bytes   = await foto.read()
        content_type = foto.content_type or "image/jpeg"
        ext          = Path(foto.filename).suffix.lower() or ".jpg"
        fname        = f"reporte_{_uuid.uuid4().hex}{ext}"
        # Subir a GCS
        try:
            blob = gcs_client.bucket(GCS_BUCKET).blob(fname)
            blob.upload_from_string(data_bytes, content_type=content_type)
            foto_url = f"/uploads/{fname}"
            print(f"  [Storage] Foto subida a GCS: {fname}")
        except Exception as e:
            print(f"  [Storage] Upload fallido: {e}")
            dest = UPLOADS_DIR / fname
            dest.write_bytes(data_bytes)
            foto_url = f"/uploads/{fname}"
            print(f"  [Storage] Foto guardada local: {fname}")
    try:
        _, doc_ref = fdb.collection("reportes").add({
            "tipo": tipo, "descripcion": descripcion,
            "lat": lat, "lng": lng, "direccion": direccion,
            "foto_url": foto_url, "status": "pendiente",
            "fecha": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        })
        return {"ok": True, "id": doc_ref.id}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.patch("/api/reportes/{reporte_id}")
def actualizar_reporte(reporte_id: str, body: dict = Body(...)):
    if fdb is None:
        raise HTTPException(503, "Firestore no disponible")
    try:
        fdb.collection("reportes").document(reporte_id).update(body)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.delete("/api/reportes/{reporte_id}")
def eliminar_reporte(reporte_id: str):
    if fdb is None:
        raise HTTPException(503, "Firestore no disponible")
    try:
        fdb.collection("reportes").document(reporte_id).delete()
        return {"ok": True}
    except Exception as e:
        raise HTTPException(500, str(e))
