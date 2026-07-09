"""
GeoFormal — Mapa de Candidatos Informales
=========================================
Corre con:  python app.py
Abre en:    http://localhost:8765
"""
import uvicorn
from backend.server import app  # noqa: F401 — expuesto para uvicorn string import

if __name__ == "__main__":
    print("=" * 52)
    print("  GeoFormal - Merida, Yucatan")
    print("=" * 52)
    print("  >> http://localhost:8765")
    print("=" * 52)
    uvicorn.run(app, host="0.0.0.0", port=8765)
