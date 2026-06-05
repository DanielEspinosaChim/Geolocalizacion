from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
import pandas as pd
from db.database import get_db, haversine, ROOT

router = APIRouter()

PRED_CSV = ROOT / "data" / "procesado" / "predicciones_zonas.csv"


# ── Modelos de respuesta ──────────────────────────────────────────────────────

class PrediccionNegocioResponse(BaseModel):
    status: str = Field(..., description="'formal' o 'informal' — encontramos un negocio cercano")
    nombre: str = Field(..., description="Nombre del negocio más cercano al punto consultado")
    tipos: str = Field(..., description="Categorías del negocio (ej: 'restaurant,food')")
    distancia_m: float = Field(..., description="Distancia en metros entre el punto consultado y el negocio encontrado")

class PrediccionZonaResponse(BaseModel):
    status: str = Field("zona", description="'zona' — no hay negocios individuales cerca, se muestra el score de la zona")
    zona_score: int = Field(..., description="Score de la zona según el modelo ML (0–100). Más alto = más informalidad potencial")
    zona_nivel: str = Field(..., description="Nivel de riesgo: 'Bajo' | 'Medio' | 'Alto' | 'Muy Alto'")
    dist_zona_m: float = Field(..., description="Distancia en metros al centro de la zona ML más cercana")

class SinDatosResponse(BaseModel):
    status: str = Field("sin_datos", description="No hay negocios ni zonas con datos en ese punto")


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.get(
    "/api/predecir",
    summary="Consultar el estatus de formalización en unas coordenadas",
    description="""
Dado un punto geográfico (lat/lng), busca el negocio más cercano en la base de datos
y retorna si es formal o informal. Si no hay negocios cerca, cae al score de zona del modelo ML.

**Lógica de respuesta (en orden de prioridad):**

1. **Negocio encontrado dentro del radio** → retorna `status: 'formal'` o `status: 'informal'`
   con el nombre del negocio y la distancia exacta en metros.

2. **Sin negocios en el radio, pero hay datos de zona ML** → retorna `status: 'zona'`
   con el score (0–100) y nivel de informalidad predicho por el modelo para esa área.

3. **Sin datos de ningún tipo** → retorna `status: 'sin_datos'`.

**Parámetros:**
- `lat` / `lng`: coordenadas del punto a consultar
- `radio`: distancia máxima en metros para buscar negocios individuales (default: 300m).
  Si no hay ninguno dentro del radio, usa el score de zona.

**Caso de uso:** el inspector hace click en cualquier punto del mapa y obtiene
inmediatamente si ahí hay un negocio registrado o informal, o qué tan probable es
que haya informalidad en esa zona.

**Ejemplo:**
```
GET /api/predecir?lat=20.9674&lng=-89.5926&radio=200
```
""",
    responses={
        200: {
            "description": "Puede retornar uno de tres formatos según lo que se encuentre cerca del punto",
            "content": {
                "application/json": {
                    "examples": {
                        "negocio_informal": {
                            "summary": "Negocio informal encontrado cerca",
                            "value": {"status": "informal", "nombre": "Taquería El Güero", "tipos": "restaurant,food", "distancia_m": 45.3},
                        },
                        "negocio_formal": {
                            "summary": "Negocio registrado en DENUE encontrado cerca",
                            "value": {"status": "formal", "nombre": "Farmacia del Ahorro", "tipos": "pharmacy", "distancia_m": 120.1},
                        },
                        "zona_ml": {
                            "summary": "Sin negocios individuales — score de zona ML",
                            "value": {"status": "zona", "zona_score": 74, "zona_nivel": "Alto", "dist_zona_m": 210.5},
                        },
                        "sin_datos": {
                            "summary": "Zona sin información",
                            "value": {"status": "sin_datos"},
                        },
                    }
                }
            },
        }
    },
)
def predecir(
    lat: float = 20.9674,
    lng: float = -89.5926,
    radio: float = 300,
):
    conn = get_db()
    try:
        df_form = pd.read_sql("SELECT nombre, lat, lng, tipos FROM formales", conn)
    except Exception:
        df_form = pd.DataFrame(columns=["nombre", "lat", "lng", "tipos"])
    try:
        df_inf = pd.read_sql("SELECT nombre, lat, lng, tipos FROM candidatos", conn)
    except Exception:
        df_inf = pd.DataFrame(columns=["nombre", "lat", "lng", "tipos"])
    conn.close()

    mejor        = None
    mejor_dist   = 9999.0
    mejor_status = "sin_datos"

    for _, r in df_form.iterrows():
        d = haversine(lat, lng, float(r.lat), float(r.lng))
        if d < mejor_dist:
            mejor_dist, mejor, mejor_status = d, r.copy(), "formal"

    for _, r in df_inf.iterrows():
        d = haversine(lat, lng, float(r.lat), float(r.lng))
        if d < mejor_dist:
            mejor_dist, mejor, mejor_status = d, r.copy(), "informal"

    # Si no hay nada dentro del radio, mostrar score de zona ML
    if mejor is None or mejor_dist > radio:
        if PRED_CSV.exists():
            df_z  = pd.read_csv(PRED_CSV)
            dz    = df_z.apply(
                lambda r2: haversine(lat, lng, float(r2.lat_centro), float(r2.lon_centro)), axis=1
            )
            idx_z = dz.idxmin()
            z     = df_z.loc[idx_z]
            return {
                "status":      "zona",
                "zona_score":  int(z.score_100),
                "zona_nivel":  str(z.nivel),
                "dist_zona_m": round(float(dz[idx_z]), 1),
            }
        return {"status": "sin_datos"}

    return {
        "status":      mejor_status,
        "nombre":      str(mejor["nombre"]),
        "tipos":       str(mejor["tipos"]),
        "distancia_m": round(mejor_dist, 1),
    }
