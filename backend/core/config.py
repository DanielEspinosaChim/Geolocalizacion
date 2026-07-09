from pathlib import Path

# ── Rutas base ────────────────────────────────────────────────────────────────
BASE  = Path(__file__).parent.parent.parent   # raíz del proyecto
FRONT = BASE / "frontend"

# ── Datos procesados ──────────────────────────────────────────────────────────
PRED              = BASE / "data/procesado/predicciones_zonas.csv"
CRUCE             = BASE / "data/procesado/cruce_completo.csv"
COLONIAS_GEOJSON  = BASE / "data/procesado/colonias_merida.geojson"
MUNICIPIO_GEOJSON = BASE / "data/procesado/municipio_merida.geojson"
AGEBS_GEOJSON     = BASE / "data/inegi/agebs_urbanos_merida.geojson"
MUNICIPIOS_YUC    = BASE / "data/inegi/municipios_yucatan.geojson"
DISK_CACHE        = BASE / "data/procesado/candidatos_slim_cache.json.gz"

# ── Storage ───────────────────────────────────────────────────────────────────
UPLOADS_DIR = BASE / "data/uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
GCS_BUCKET  = "canaco-info-reportes"

# ── Cache candidatos ──────────────────────────────────────────────────────────
SLIM_FIELDS = ("place_id", "nombre", "lat", "lng", "tipos", "tipo",
               "colonia_nombre", "colonia_denue")
