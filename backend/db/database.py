"""
Helpers compartidos de base de datos y utilidades geoespaciales.
"""
import sqlite3
import math
from pathlib import Path

# Ruta al DB relativa a la raíz del proyecto (un nivel arriba de backend/)
ROOT = Path(__file__).parent.parent.parent
DB   = ROOT / "data" / "procesado" / "negocios.db"


def get_db() -> sqlite3.Connection:
    """Retorna una conexión SQLite con WAL habilitado."""
    conn = sqlite3.connect(DB, check_same_thread=False)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.row_factory = sqlite3.Row
    return conn


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distancia en metros entre dos puntos (lat/lng en grados)."""
    R = 6_371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def nearest_neighbor_tsp(puntos: list[dict]) -> list[dict]:
    """Ordena puntos con el heurístico del vecino más cercano (TSP)."""
    if len(puntos) < 2:
        return puntos
    ordered   = [puntos[0]]
    restantes = puntos[1:]
    while restantes:
        ultimo  = ordered[-1]
        cercano = min(
            restantes,
            key=lambda p: haversine(ultimo["lat"], ultimo["lng"], p["lat"], p["lng"]),
        )
        ordered.append(cercano)
        restantes.remove(cercano)
    return ordered
