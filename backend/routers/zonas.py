from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List
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
    id: int = Field(..., description="ID único de la colonia en la base de datos")
    nombre: str = Field(..., description="Nombre de la colonia según OpenStreetMap")
    geometry: str = Field(..., description="Geometría del polígono de la colonia en formato GeoJSON string")


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
    summary="Colonias de Mérida con sus polígonos geográficos",
    description="""
Retorna la lista de colonias de Mérida junto con su geometría GeoJSON para
dibujarlas como polígonos sobre el mapa Leaflet.

**Nota:** Esta lista estará **vacía** hasta que corras el script de importación:
```bash
python scripts/importar_colonias.py
```
Ese script descarga los polígonos de colonias desde OpenStreetMap y los guarda
en la base de datos. Solo necesitas correrlo una vez.

**Usado por:** el select de filtro por colonia en el mapa y la sección de
ruta automática por colonia.
""",
)
def get_colonias(con_candidatos: bool = Query(False, description="Si es true, retorna solo colonias que tienen candidatos informales")):
    rows = fs.get_colonias(con_candidatos=con_candidatos)
    return [{"id": r["id"], "nombre": r["nombre"], "geometry": r.get("geometry_geojson", "")} for r in rows]
