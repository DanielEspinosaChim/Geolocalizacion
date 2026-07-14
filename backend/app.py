"""
Backend — Mapa de Candidatos Informales + Predicción + Rutas
=============================================================
Correr desde la raíz del proyecto:
    python backend/app.py

O desde la carpeta backend/:
    python app.py

Abre en:  http://localhost:8765
Swagger:  http://localhost:8765/docs
"""
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn

from db.migrations import run_migrations
from routers import candidatos, zonas, geo, ruta, prediccion, reportes, visitas, campanas, plantillas, admin, canasta
from auth import require_any, require_admin

ROOT_DIR     = Path(__file__).parent.parent
FRONTEND_DIR = ROOT_DIR / "frontend" / "dist"   # build de Vite (ver docs/CUTOVER.md)
UPLOADS_DIR  = ROOT_DIR / "data" / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    run_migrations()
    import db.firestore as fs
    fs.prewarm()  # carga candidatos en background desde el arranque
    yield


app = FastAPI(
    title="Mapa Negocios Informales — Mérida, Yucatán",
    description="""
## Sistema de Geolocalización de Informalidad Económica

Identifica negocios informales en Mérida cruzando datos de **Google Maps** contra el
padrón oficial **DENUE (INEGI)**. Los que aparecen en Google Maps pero **no están
registrados** ante el gobierno son los candidatos informales.

### Cómo funciona el sistema

1. **Cruce de datos** (`cruce.py`): compara ~2,000 negocios de Google Maps con ~11,000
   registros del DENUE usando proximidad (50m) + similitud de nombre (fuzzy matching ≥72).
   Los sin match quedan en la tabla `candidatos`.

2. **Modelo ML** (`src/modelo.py`): entrena Random Forest + XGBoost sobre una cuadrícula
   de celdas de 500m × 500m para predecir qué zonas tienen mayor informalidad potencial.

3. **Esta API**: sirve los datos al mapa interactivo y permite a los inspectores
   planificar rutas de visita, reportar problemas urbanos y gestionar campañas de campo.

### Grupos de endpoints

| Tag | Qué hace |
|-----|----------|
| **Candidatos** | Listar, filtrar y actualizar el tipo de negocios candidatos |
| **Zonas** | Scores ML por zona y polígonos de colonias |
| **Ruta** | Calcular rutas optimizadas para visitas de campo |
| **Predicción** | Consultar el estatus de formalización en cualquier punto del mapa |
| **Reportes** | Reportes ciudadanos geolocalizados (baches, luminarias, etc.) |
| **Visitas** | Generación de reportes HTML de visitas de campo |
| **Campañas** | Gestión de campañas de visita con checklist por negocio |

### Datos requeridos
```bash
python main.py    # pipeline ML completo
python cruce.py   # genera negocios.db
python scripts/importar_colonias.py  # carga colonias de OSM (solo una vez)
```
""",
    version="2.1.0",
    lifespan=lifespan,
    contact={"name": "Proyecto Geolocalizacion Mérida"},
    license_info={"name": "Uso interno"},
)

# ── Routers ───────────────────────────────────────────────────────────────────
# Lectura: cualquier usuario autenticado
app.include_router(candidatos.router, tags=["Candidatos"],  dependencies=[Depends(require_any)])
app.include_router(zonas.router,      tags=["Zonas"],       dependencies=[Depends(require_any)])
app.include_router(geo.router,        tags=["Geo"],         dependencies=[Depends(require_any)])
app.include_router(ruta.router,       tags=["Ruta"],        dependencies=[Depends(require_any)])
app.include_router(prediccion.router, tags=["Predicción"],  dependencies=[Depends(require_any)])
app.include_router(reportes.router,   tags=["Reportes"],    dependencies=[Depends(require_any)])
app.include_router(visitas.router,    tags=["Visitas"],     dependencies=[Depends(require_any)])
app.include_router(campanas.router,   tags=["Campañas"],    dependencies=[Depends(require_any)])
app.include_router(plantillas.router, tags=["Plantillas"],   dependencies=[Depends(require_any)])
app.include_router(admin.router,      tags=["Admin"])
app.include_router(canasta.router,    tags=["Canasta Básica"], dependencies=[Depends(require_any)])

# ── Endpoint: info del usuario actual ────────────────────────────────────────
@app.get("/api/me", tags=["Auth"])
def me(user=Depends(require_any)):
    return user

# ── Archivos estáticos ────────────────────────────────────────────────────────
# /assets: build de Vite (check_dir=False → en dev se usa el server de Vite).
app.mount("/assets",  StaticFiles(directory=str(FRONTEND_DIR / "assets"), check_dir=False), name="assets")
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)),            name="uploads")


@app.get("/", include_in_schema=False)
def index():
    return FileResponse(str(FRONTEND_DIR / "index.html"))


# SPA fallback: rutas de cliente (React Router) devuelven index.html.
@app.get("/{full_path:path}", include_in_schema=False)
def spa_fallback(full_path: str):
    if full_path.startswith(("api/", "uploads/", "assets/")):
        raise HTTPException(404, "No encontrado")
    return FileResponse(str(FRONTEND_DIR / "index.html"))


# ── Arranque ──────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    from db.database import DB
    if not DB.exists():
        print("[ERROR] No existe negocios.db — corre primero: python cruce.py")
    else:
        port = int(os.environ.get("PORT", 8765))
        print("=" * 52)
        print("  Mapa de Candidatos Informales — Mérida v2.1")
        print("=" * 52)
        print(f"  >> Frontend: http://localhost:{port}")
        print(f"  >> Swagger:  http://localhost:{port}/docs")
        print("  Ctrl+C para detener")
        print("=" * 52)
        uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
