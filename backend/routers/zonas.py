from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List
from collections import Counter
import pandas as pd
import db.firestore as fs
from db.database import ROOT

router = APIRouter()

PRED_CSV = ROOT / "data" / "procesado" / "predicciones_zonas.csv"


# ── Modelos de respuesta ──────────────────────────────────────────────────────

class Zona(BaseModel):
    zona_id: str   = Field(..., description="Identificador único de la zona (formato fila_columna, ej: '39_266')")
    lat_centro: float = Field(..., description="Latitud del centro de la celda (celdas de 500m × 500m)")
    lon_centro: float = Field(..., description="Longitud del centro de la celda")
    prob_formalizacion: float = Field(..., description="Probabilidad predicha por el modelo ML (0.0 a 1.0)")
    score_100: float = Field(..., description="Probabilidad en escala 0–100 para mostrar en el mapa (ej: 44.8)")
    nivel: str = Field(..., description="Nivel de riesgo: 'Bajo' | 'Medio' | 'Alto' | 'Muy Alto'")

class Colonia(BaseModel):
    id: str = Field(..., description="Nombre de la colonia en MAYÚSCULAS — es la clave con la que se filtran los candidatos")
    nombre: str = Field(..., description="Nombre de la colonia capitalizado, para mostrar")
    count: int = Field(..., description="Cuántos candidatos informales hay en esa colonia")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get(
    "/api/zonas",
    response_model=List[Zona],
    summary="Zonas de predicción del modelo ML",
    description="""
Retorna la cuadrícula de zonas de Mérida con el score de probabilidad de formalización
calculado por el modelo de Machine Learning (Random Forest + XGBoost).

**Cómo funciona:**
Mérida se divide en celdas de **500m × 500m** (~4,000 zonas en total).
Para cada celda el modelo calcula un score basado en:
- Densidad de negocios formales (DENUE) en la zona
- Porcentaje de micro-empresas (≤5 empleados)
- Sector económico predominante (algunos sectores tienen más informalidad)
- Antigüedad promedio de los registros
- **Brecha GMaps vs DENUE**: negocios visibles en Google Maps que no aparecen en el padrón

**Niveles de riesgo:**
- `Bajo` (0–25%) — zona bien formalizada
- `Medio` (25–50%) — formalización moderada
- `Alto` (50–75%) — bastantes negocios sin registro
- `Muy Alto` (75–100%) — zona prioritaria para intervención

**Usado por:** la capa de calor del mapa (botón 🔥 Probabilidad).
""",
)
def get_zonas():
    if not PRED_CSV.exists():
        raise HTTPException(
            status_code=404,
            detail="No se encontró predicciones_zonas.csv — corre primero: python main.py",
        )
    df   = pd.read_csv(PRED_CSV)
    cols = ["zona_id", "lat_centro", "lon_centro", "prob_formalizacion", "score_100", "nivel"]
    return df[cols].to_dict(orient="records")


@router.get(
    "/api/colonias",
    response_model=List[Colonia],
    summary="Catálogo de colonias con conteo de candidatos informales",
    description="""
Retorna el catálogo de colonias derivado de los propios candidatos, ordenado
alfabéticamente y con el conteo de informales en cada una.

**Importante — la colonia se identifica por nombre, no por un id numérico.**
Los candidatos traen la colonia como texto (`colonia_nombre` o, si falta,
`colonia_denue`); no existe una tabla de colonias con claves foráneas. Por eso
`id` es el nombre en MAYÚSCULAS: es exactamente la cadena contra la que el
frontend compara para filtrar, y la que espera `POST /api/ruta-colonia`.

Los polígonos para dibujar en el mapa son otra cosa y viven en
`GET /api/colonias-geojson`.

**Usado por:** el select de filtro por colonia en el mapa y la ruta automática
por colonia.
""",
)
def get_colonias():
    counts = Counter(
        (c.get("colonia_nombre") or c.get("colonia_denue") or "").strip().upper()
        for c in fs.get_candidatos(limit=1_000_000)
        if (c.get("tipo") or "informal") == "informal"
    )
    counts.pop("", None)
    return [
        {"id": nombre, "nombre": nombre.title(), "count": cnt}
        for nombre, cnt in sorted(counts.items())
    ]
