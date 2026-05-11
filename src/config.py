# ============================================================
# CONFIGURACION DEL PROYECTO
# ============================================================

import os
from dotenv import load_dotenv
load_dotenv()

# Ruta al JSON de la service account de GCP.
# Descárgalo en: Cloud Console → IAM → Service Accounts →
#   marketing@videoimet.iam.gserviceaccount.com → Keys → Add Key → JSON
# Guarda el archivo en la raíz del proyecto y apunta aquí:
GOOGLE_SERVICE_ACCOUNT_FILE = os.getenv(
    "GOOGLE_APPLICATION_CREDENTIALS",
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                 "service_account.json")
)

# Fallback: API key clásica (si no usas service account)
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")

# Coordenadas del centro de Mérida, Yucatán
MERIDA_LAT = 20.9674
MERIDA_LON = -89.5926

# Clave INEGI del estado
CVE_ENT = "31"       # Yucatán

# Bounding box de todo Yucatán (con margen)
YUC_LAT_MIN, YUC_LAT_MAX = 19.7,  21.7
YUC_LON_MIN, YUC_LON_MAX = -90.5, -87.4

# Sectores con alta tasa de informalidad en México (códigos SCIAN primeros 2 dígitos)
SECTORES_INFORMALES = {
    "46": "Comercio al por menor",
    "72": "Alojamiento y alimentos (restaurantes, fondas)",
    "81": "Servicios personales (peluquerías, lavandería, etc.)",
    "56": "Servicios de apoyo a negocios",
    "43": "Comercio al por mayor (pequeño)",
    "49": "Transporte",
}

# Tamaño micro (0-10 empleados) — más propensos a ser o haber sido informales
ESTRATO_MICRO = ["1", "2"]  # 1=0-5 emp, 2=6-10 emp

# Rutas de datos
import os
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_RAW = os.path.join(BASE_DIR, "data", "raw")
DATA_PROC = os.path.join(BASE_DIR, "data", "procesado")
MAPAS_DIR = os.path.join(BASE_DIR, "mapas")
