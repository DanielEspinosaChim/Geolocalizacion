"""
GeoFormal — servidor FastAPI
============================
Instancia de la aplicación, middleware, lifespan y registro de routers.
Punto de entrada para uvicorn: backend.server:app
"""

import sys
import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.openapi.utils import get_openapi
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from firebase_admin import auth as fb_auth

from backend.core import cache
from backend.core.config import FRONT, UPLOADS_DIR, GCS_BUCKET
from backend.core.firebase import firebase_ok, gcs_client
from backend.routers import admin, campanas, candidatos, canasta, geo, metricas, reportes, ruta


# ── Lifespan: warm-start desde disco y carga Firestore en background ──────────

@asynccontextmanager
async def _lifespan(app: FastAPI):
    cache.load_disk_cache()
    if firebase_ok:
        with cache._cache_lock:
            if not cache._cache_loading:
                cache._cache_loading = True
                threading.Thread(target=cache.load_cache_background, daemon=True).start()
                print("  [Cache] Pre-carga Firestore iniciada en background")
    yield


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="GeoFormal", lifespan=_lifespan)


# ── Barrera de autenticación ──────────────────────────────────────────────────
# Todos los endpoints /api/ requieren token Firebase válido.
# Excepción: /api/cache-status (usado antes del login para mostrar progreso).

_API_PUBLIC = {"/api/cache-status"}

@app.middleware("http")
async def _auth_barrier(request: Request, call_next):
    if request.url.path.startswith("/api/") and request.url.path not in _API_PUBLIC:
        if firebase_ok:
            hdr = request.headers.get("Authorization", "")
            if not hdr.startswith("Bearer "):
                return JSONResponse({"detail": "No autenticado"}, status_code=401)
            try:
                fb_auth.verify_id_token(hdr[7:])
            except Exception:
                return JSONResponse({"detail": "Token inválido o expirado"}, status_code=401)
    try:
        return await call_next(request)
    except Exception:
        return JSONResponse({"detail": "Error interno del servidor"}, status_code=500)


# ── Static files ──────────────────────────────────────────────────────────────

app.mount("/css", StaticFiles(directory=str(FRONT / "css")), name="css")
app.mount("/js",  StaticFiles(directory=str(FRONT / "js")),  name="js")


@app.get("/uploads/{filename:path}")
def serve_upload(filename: str):
    """Sirve imágenes desde GCS (Cloud Run) o disco local (dev)."""
    from fastapi import HTTPException
    try:
        blob = gcs_client.bucket(GCS_BUCKET).blob(filename)
        data = blob.download_as_bytes()
        mime = blob.content_type or "image/jpeg"
        return Response(content=data, media_type=mime,
                        headers={"Cache-Control": "public, max-age=86400"})
    except Exception as e:
        print(f"  [serve_upload] GCS error for {filename}: {type(e).__name__}: {e}",
              file=sys.stderr, flush=True)
    local = UPLOADS_DIR / filename
    if local.exists():
        return FileResponse(str(local))
    raise HTTPException(404, "Imagen no encontrada")


@app.get("/", response_class=FileResponse)
def index():
    return FileResponse(str(FRONT / "index.html"))


# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(candidatos.router)
app.include_router(geo.router)
app.include_router(metricas.router)
app.include_router(ruta.router)
app.include_router(reportes.router)
app.include_router(campanas.router)
app.include_router(canasta.router)
app.include_router(admin.router)


# ── OpenAPI schema con candados en Swagger ────────────────────────────────────
# Se genera DESPUÉS de registrar rutas para que aparezcan todos los endpoints.

_OPENAPI_TAGS = [
    {"name": "Canasta Básica", "description": "Comparativo de costos de la canasta básica · CANACO SERVYTUR Mérida. Precios mensuales, exportación Excel e infografía, escaneo de facturas con Gemini 3.5 Flash."},
]

def _build_secure_schema():
    schema = get_openapi(title="GeoFormal", version="1.0.0", routes=app.routes, tags=_OPENAPI_TAGS)
    schema.setdefault("components", {})["securitySchemes"] = {
        "BearerAuth": {"type": "http", "scheme": "bearer", "bearerFormat": "JWT (Firebase)"}
    }
    _sin_auth = {"/", "/uploads/{filename:path}", "/api/cache-status"}
    for path, methods in schema.get("paths", {}).items():
        if path not in _sin_auth:
            for op in methods.values():
                if isinstance(op, dict):
                    op["security"] = [{"BearerAuth": []}]
    return schema

app.openapi_schema = _build_secure_schema()
