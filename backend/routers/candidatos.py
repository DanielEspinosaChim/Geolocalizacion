import threading
from collections import Counter
from typing import Optional

from fastapi import APIRouter, HTTPException, Body, Request, Response

from backend.core import cache
from backend.core.config import SLIM_FIELDS
from backend.core.firebase import fdb

router = APIRouter()


@router.get("/api/cache-status")
def cache_status():
    """Devuelve el estado de carga del cache de candidatos."""
    return {
        "status":  cache._cache_progress,
        "count":   len(cache._cands_cache),
        "ready":   cache._cache_progress.startswith("ready"),
        "loading": cache._cache_loading,
    }


@router.get("/api/candidatos")
def get_candidatos(request: Request, limit: int = 0,
                   colonia: Optional[str] = None, tipo: Optional[str] = None):
    """Devuelve candidatos.
    - Sin filtros: respuesta pre-comprimida (O(1) CPU, ~380 KB con gzip).
    - Con filtros: filtra el cache en memoria y proyecta campos slim.
    """
    cache.get_candidatos()  # dispara carga en bg si es necesario

    if not colonia and not tipo and limit == 0:
        accept = request.headers.get("Accept-Encoding", "")
        with cache._slim_json_lock:
            if "gzip" in accept and cache._slim_json_gz:
                return Response(
                    content=cache._slim_json_gz,
                    media_type="application/json",
                    headers={"Content-Encoding": "gzip"},
                )
            return Response(content=cache._slim_json, media_type="application/json")

    # Ruta filtrada
    cands      = cache.get_candidatos()
    colonia_up = colonia.upper() if colonia else None
    result     = []
    for c in cands:
        if not c.get("es_informal"):
            continue
        if colonia_up:
            nombre_real = (c.get("colonia_nombre") or c.get("colonia_denue") or "").upper()
            if nombre_real != colonia_up:
                continue
        if tipo and c.get("tipo", "informal") != tipo:
            continue
        result.append({f: c[f] for f in SLIM_FIELDS if f in c})
        if limit > 0 and len(result) >= limit:
            break
    return result


@router.patch("/api/candidatos/{place_id:path}/tipo")
def guardar_tipo(place_id: str, body: dict = Body(...)):
    tipo = body.get("tipo")
    if not tipo:
        raise HTTPException(400, "tipo requerido")
    if fdb is None:
        raise HTTPException(503, "Firestore no disponible")
    fdb.collection("candidatos").document(place_id.replace("/", "__")).update({"tipo": tipo})
    # Mutar el cache en memoria directamente
    with cache._cache_lock:
        snap = list(cache._cands_cache)
    for c in snap:
        if c.get("place_id") == place_id:
            c["tipo"] = tipo
            break
    with cache._cache_lock:
        cache._cands_cache[:] = snap
    threading.Thread(target=cache.rebuild_slim_json, args=(snap,), daemon=True).start()
    return {"ok": True}


@router.get("/api/colonias")
def get_colonias():
    """Devuelve nombres reales de colonia OSM con conteo de candidatos informales."""
    cands  = cache.get_candidatos()
    counts = Counter(
        (c.get("colonia_nombre") or c.get("colonia_denue") or "").strip().upper()
        for c in cands if c.get("es_informal")
    )
    return [
        {"id": nombre, "nombre": nombre.title(), "count": cnt}
        for nombre, cnt in sorted(counts.items())
        if nombre
    ]
