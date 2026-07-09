import math


def haversine(lat1, lon1, lat2, lon2) -> float:
    """Distancia en metros entre dos puntos geográficos (fórmula de Haversine)."""
    R  = 6371000
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a  = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def extract_lat(val):
    """Convierte cualquier formato de Firestore (float, str, GeoPoint) a float lat, o None."""
    if val is None:
        return None
    if hasattr(val, "latitude"):   # GeoPoint de Firestore
        return float(val.latitude)
    try:
        f = float(val)
        return None if math.isnan(f) else f
    except (TypeError, ValueError):
        return None


def extract_lng(val):
    """Convierte cualquier formato de Firestore (float, str, GeoPoint) a float lng, o None."""
    if val is None:
        return None
    if hasattr(val, "longitude"):  # GeoPoint de Firestore
        return float(val.longitude)
    try:
        f = float(val)
        return None if math.isnan(f) else f
    except (TypeError, ValueError):
        return None
