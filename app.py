"""
APP WEB — GeoFormal · Mapa de Candidatos Informales
====================================================
Corre con:  python app.py
Abre en:    http://localhost:8765
"""

import json, math, html, urllib.request, time
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Optional
from urllib.parse import quote

from fastapi import FastAPI, HTTPException, Form, UploadFile, File, Body, Request
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
import uvicorn

# ── Firebase Admin ────────────────────────────────────────────────────────────
import firebase_admin
from firebase_admin import credentials, auth as fb_auth

_SA = Path(__file__).parent / "service_account.json"
if _SA.exists() and not firebase_admin._apps:
    firebase_admin.initialize_app(
        credentials.Certificate(str(_SA)),
        {"storageBucket": "canaco-info.appspot.com"},
    )
    print("  [Firebase] Admin SDK inicializado OK")
else:
    if not firebase_admin._apps:
        print("  [Firebase] Sin service_account.json — modo local")

_firebase_ok = bool(firebase_admin._apps)

# ── Firestore + Storage ───────────────────────────────────────────────────────
if _firebase_ok:
    from firebase_admin import firestore as fb_firestore, storage as fb_storage
    _fdb     = fb_firestore.client()
    _storage = fb_storage
    print("  [Firestore] Cliente OK")
else:
    _fdb     = None
    _storage = None


# ── Auth helpers ──────────────────────────────────────────────────────────────
def _verify_token(request: Request) -> Optional[dict]:
    if not _firebase_ok:
        return {"uid": "local", "role": "admin", "email": "local@local"}
    hdr = request.headers.get("Authorization", "")
    if not hdr.startswith("Bearer "):
        return None
    try:
        return fb_auth.verify_id_token(hdr[7:])
    except Exception:
        return None

def require_auth(request: Request) -> dict:
    c = _verify_token(request)
    if not c:
        raise HTTPException(401, "No autenticado")
    return c

def require_admin(request: Request) -> dict:
    c = _verify_token(request)
    if not c:
        raise HTTPException(401, "No autenticado")
    if c.get("role") != "admin":
        raise HTTPException(403, "Solo administradores")
    return c


# ── Paths & App ───────────────────────────────────────────────────────────────
BASE  = Path(__file__).parent
FRONT = BASE / "frontend"
PRED  = BASE / "data/procesado/predicciones_zonas.csv"
COLONIAS_GEOJSON  = BASE / "data/procesado/colonias_merida.geojson"
MUNICIPIO_GEOJSON = BASE / "data/procesado/municipio_merida.geojson"
AGEBS_GEOJSON     = BASE / "data/inegi/agebs_urbanos_merida.geojson"
MUNICIPIOS_YUC    = BASE / "data/inegi/municipios_yucatan.geojson"

app = FastAPI(title="GeoFormal")
app.mount("/css", StaticFiles(directory=str(FRONT / "css")), name="css")
app.mount("/js",  StaticFiles(directory=str(FRONT / "js")),  name="js")


# ── Cache en memoria de candidatos ────────────────────────────────────────────
_cands_cache: list = []
_cands_ts: float   = 0.0
_CACHE_TTL = 300   # 5 minutos

def _get_candidatos() -> list:
    global _cands_cache, _cands_ts
    if not _cands_cache or time.time() - _cands_ts > _CACHE_TTL:
        if _fdb is None:
            return []
        docs = list(_fdb.collection("candidatos").stream())
        _cands_cache = [doc.to_dict() for doc in docs]
        _cands_ts    = time.time()
        print(f"  [Cache] {len(_cands_cache)} candidatos cargados")
    return _cands_cache

def _invalidate_cache():
    global _cands_ts
    _cands_ts = 0.0


# ── Haversine ─────────────────────────────────────────────────────────────────
def _haversine(lat1, lon1, lat2, lon2):
    R = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a  = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/", response_class=FileResponse)
def index():
    return FileResponse(str(FRONT / "index.html"))


# ── Candidatos ────────────────────────────────────────────────────────────────

@app.get("/api/candidatos")
def get_candidatos(limit: int = 2000, colonia: Optional[str] = None,
                   tipo: Optional[str] = None):
    cands  = _get_candidatos()
    result = []
    for c in cands:
        # Solo mostrar informales en el mapa
        if not c.get("es_informal"):
            continue
        # Filtrar por colonia (usa colonia_nombre real OSM; fallback a colonia_denue)
        if colonia:
            nombre_real = (c.get("colonia_nombre") or c.get("colonia_denue") or "").upper()
            if nombre_real != colonia.upper():
                continue
        # Filtrar por estado de formalización (informal / en_proceso / formal)
        # c.get("tipo") puede ser None → se trata como "informal" por defecto
        if tipo and c.get("tipo", "informal") != tipo:
            continue
        result.append(c)
        if not colonia and not tipo and len(result) >= limit:
            break
    return result


@app.patch("/api/candidatos/{place_id:path}/tipo")
def guardar_tipo(place_id: str, body: dict = Body(...)):
    tipo = body.get("tipo")
    if not tipo:
        raise HTTPException(400, "tipo requerido")
    if _fdb is None:
        raise HTTPException(503, "Firestore no disponible")
    _fdb.collection("candidatos").document(place_id.replace("/", "__")).update({"tipo": tipo})
    _invalidate_cache()
    return {"ok": True}


# ── Colonias (nombres reales para filtros) ────────────────────────────────────

@app.get("/api/colonias")
def get_colonias():
    """Devuelve nombres reales de colonia OSM con conteo de candidatos informales."""
    cands = _get_candidatos()
    counts = Counter(
        (c.get("colonia_nombre") or c.get("colonia_denue") or "").strip().upper()
        for c in cands if c.get("es_informal")
    )
    return [
        {"id": nombre, "nombre": nombre.title(), "count": cnt}
        for nombre, cnt in sorted(counts.items())
        if nombre
    ]


# ── Zonas (polígonos de colonias para el mapa) ────────────────────────────────

@app.get("/api/zonas")
def get_zonas():
    if _fdb is None:
        return []
    result = []
    for doc in _fdb.collection("zonas").stream():
        d = doc.to_dict()
        geom = None
        if d.get("geometry_json"):
            try:
                geom = json.loads(d["geometry_json"])
            except Exception:
                pass
        result.append({"id": d.get("id"), "nombre": d.get("nombre"), "geometry": geom})
    return result


# ── Colonias reales OSM (GeoJSON) ────────────────────────────────────────────

_colonias_geojson_cache  = None
_municipio_geojson_cache = None

def _load_geojson(path):
    if not path.exists():
        return {"type": "FeatureCollection", "features": []}
    with open(path, encoding="utf-8") as f:
        return json.load(f)

@app.get("/api/colonias-geojson")
def get_colonias_geojson():
    """GeoJSON con polígonos de colonias de Mérida (OSM + generados desde candidatos)."""
    global _colonias_geojson_cache
    if _colonias_geojson_cache is None:
        _colonias_geojson_cache = _load_geojson(COLONIAS_GEOJSON)
    return _colonias_geojson_cache

@app.get("/api/municipio-geojson")
def get_municipio_geojson():
    """GeoJSON con el contorno de la ciudad de Mérida."""
    global _municipio_geojson_cache
    if _municipio_geojson_cache is None:
        _municipio_geojson_cache = _load_geojson(MUNICIPIO_GEOJSON)
    return _municipio_geojson_cache

@app.post("/api/admin/reload-colonias")
def reload_colonias():
    """Fuerza recarga del GeoJSON de colonias desde disco (sin reiniciar servidor)."""
    global _colonias_geojson_cache, _municipio_geojson_cache
    _colonias_geojson_cache  = _load_geojson(COLONIAS_GEOJSON)
    _municipio_geojson_cache = _load_geojson(MUNICIPIO_GEOJSON)
    return {
        "ok": True,
        "colonias": len(_colonias_geojson_cache.get("features", [])),
        "municipio": len(_municipio_geojson_cache.get("features", [])),
    }


# ── AGEBs de INEGI (zonas censales con datos demográficos) ────────────────────

_agebs_geojson_cache = None
_municipios_yuc_cache = None

@app.get("/api/agebs-geojson")
def get_agebs_geojson():
    """GeoJSON con 545 AGEBs urbanos de Mérida (INEGI 2025) + datos del Censo 2020."""
    global _agebs_geojson_cache
    if _agebs_geojson_cache is None:
        _agebs_geojson_cache = _load_geojson(AGEBS_GEOJSON)
    return _agebs_geojson_cache

@app.get("/api/municipios-yucatan-geojson")
def get_municipios_yucatan():
    """GeoJSON con los 106 municipios de Yucatán (INEGI 2025)."""
    global _municipios_yuc_cache
    if _municipios_yuc_cache is None:
        _municipios_yuc_cache = _load_geojson(MUNICIPIOS_YUC)
    return _municipios_yuc_cache

@app.get("/api/datos-geograficos")
def get_datos_geograficos():
    """Resumen de todos los datos geográficos disponibles."""
    return {
        "colonias": {
            "endpoint": "/api/colonias-geojson",
            "descripcion": "640 polígonos de colonias por código postal (SEPOMEX)",
            "features": len(_load_geojson(COLONIAS_GEOJSON).get("features", [])),
        },
        "municipio_merida": {
            "endpoint": "/api/municipio-geojson",
            "descripcion": "Polígono del municipio de Mérida (INEGI)",
            "features": len(_load_geojson(MUNICIPIO_GEOJSON).get("features", [])),
        },
        "agebs": {
            "endpoint": "/api/agebs-geojson",
            "descripcion": "545 AGEBs urbanos con datos del Censo 2020 (INEGI)",
            "features": len(_load_geojson(AGEBS_GEOJSON).get("features", [])),
        },
        "municipios_yucatan": {
            "endpoint": "/api/municipios-yucatan-geojson",
            "descripcion": "106 municipios de Yucatán (INEGI)",
            "features": len(_load_geojson(MUNICIPIOS_YUC).get("features", [])),
        },
        "fuentes": {
            "inegi": "https://gaia.inegi.org.mx/wscatgeo/v2/",
            "sepomex": "Correos de México - Datos Abiertos",
        }
    }


# ── Predicciones ML por zona (CSV) ────────────────────────────────────────────

@app.get("/api/predicciones")
def get_predicciones():
    """Devuelve las predicciones de zonas del modelo ML (CSV predicciones_zonas.csv)."""
    if not PRED.exists():
        return []
    try:
        import csv
        result = []
        with open(PRED, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    result.append({
                        "zona_id":   row.get("zona_id", ""),
                        "lat_centro": float(row.get("lat_centro", 0)),
                        "lon_centro": float(row.get("lon_centro", 0)),
                        "score_100":  float(row.get("score_100", 50)),
                        "nivel":      row.get("nivel", "Medio"),
                    })
                except (ValueError, KeyError):
                    continue
        return result
    except Exception as e:
        print(f"  [predicciones] Error leyendo CSV: {e}")
        return []


# ── Métricas ──────────────────────────────────────────────────────────────────

@app.get("/api/metricas")
def get_metricas():
    cands = _get_candidatos()
    if not cands:
        return {"total": 0, "formales": 0, "informales": 0, "pct_informal": 0,
                "score_prom": 0, "dist_prom_m": 0, "top_tipos": []}
    total      = len(cands)
    informales = sum(1 for c in cands if c.get("es_informal"))
    formales   = total - informales
    scores = [float(c["fuzzy_score"]) for c in cands
              if c.get("fuzzy_score") and not c.get("es_informal")]
    dists  = [float(c["distancia_m"]) for c in cands
              if c.get("distancia_m") and float(c.get("distancia_m", 9999)) < 9999
              and not c.get("es_informal")]
    SKIP = {"point_of_interest", "establishment", "service", ""}
    tipos_counts = Counter()
    for c in cands:
        if c.get("es_informal"):
            for t in (c.get("tipos") or "").split(","):
                t = t.strip()
                if t not in SKIP:
                    tipos_counts[t] += 1
    return {
        "total":        total,
        "formales":     formales,
        "informales":   informales,
        "pct_informal": round(informales / total * 100, 1) if total else 0,
        "score_prom":   round(sum(scores) / len(scores), 1) if scores else 0,
        "dist_prom_m":  round(sum(dists) / len(dists), 1) if dists else 0,
        "top_tipos":    tipos_counts.most_common(8),
    }


# ── Muestra validación ────────────────────────────────────────────────────────

@app.get("/api/muestra-validacion")
def muestra_validacion():
    cands = _get_candidatos()
    matches = sorted(
        [c for c in cands if not c.get("es_informal") and c.get("fuzzy_score")],
        key=lambda c: -float(c.get("fuzzy_score", 0))
    )[:15]
    no_matches = [c for c in cands if c.get("es_informal")][:15]
    return {
        "matches": [{"nombre": c.get("nombre"), "nombre_denue": c.get("nombre_denue"),
                     "fuzzy_score": c.get("fuzzy_score"), "distancia_m": c.get("distancia_m")}
                    for c in matches],
        "no_matches": [{"nombre": c.get("nombre"), "tipos": c.get("tipos"),
                        "lat": c.get("lat"), "lng": c.get("lng")}
                       for c in no_matches],
    }


# ── Predicción por punto ──────────────────────────────────────────────────────

@app.get("/api/predecir")
def predecir(lat: float, lng: float):
    # 1. Buscar candidato cercano en Firestore (radio 300m)
    cands = _get_candidatos()
    mejor = None
    dist_min = 9999.0
    for c in cands:
        if c.get("lat") and c.get("lng"):
            d = _haversine(lat, lng, float(c["lat"]), float(c["lng"]))
            if d < dist_min:
                dist_min = d
                mejor = c
    if mejor and dist_min <= 300:
        return {"status": mejor.get("tipo") or "informal",
                "nombre": mejor.get("nombre"), "tipos": mejor.get("tipos"),
                "distancia_m": round(dist_min, 1)}

    # 2. Sin candidato cercano: usar predicción ML de la zona más cercana
    if PRED.exists():
        import pandas as pd
        df = pd.read_csv(PRED)
        if len(df):
            df["dist"] = df.apply(
                lambda r: _haversine(lat, lng, r["lat_centro"], r["lon_centro"]), axis=1)
            closest = df.sort_values("dist").iloc[0]
            dist_m = round(float(closest["dist"]), 1)
            return {
                "status": "zona",
                "zona_nivel": str(closest.get("nivel", "Medio")),
                "zona_score": int(closest.get("score_100", 50)),
                "dist_zona_m": dist_m,
                "estimado": dist_m > 2000,
            }

    return {"status": "sin_datos"}


# ── Ruta OSRM + TSP ───────────────────────────────────────────────────────────

def _osrm_route(coords):
    wp  = ";".join(f"{lng},{lat}" for lat, lng in coords)
    url = (f"https://router.project-osrm.org/route/v1/driving/{wp}"
           f"?overview=full&geometries=geojson&steps=false")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "GeoFormal/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())
    except Exception:
        return None

def _tsp_nn(pts):
    if len(pts) <= 2:
        return pts
    unvisited = list(pts)
    path = [unvisited.pop(0)]
    while unvisited:
        last = path[-1]
        nxt  = min(unvisited, key=lambda p: (last[0]-p[0])**2 + (last[1]-p[1])**2)
        unvisited.remove(nxt)
        path.append(nxt)
    return path

def _build_route(selected):
    pts = [(float(c["lat"]), float(c["lng"]), c)
           for c in selected if c.get("lat") and c.get("lng")]
    if len(pts) < 2:
        raise HTTPException(400, "Se necesitan al menos 2 puntos con coordenadas")
    ordered = _tsp_nn(pts)
    coords  = [(lat, lng) for lat, lng, _ in ordered]
    osrm    = _osrm_route(coords)
    if osrm and osrm.get("routes"):
        r          = osrm["routes"][0]
        geometry   = r["geometry"]
        dist_km    = round(r["distance"] / 1000, 2)
        tiempo_min = round(r["duration"] / 60)
    else:
        geometry   = {"type": "LineString",
                      "coordinates": [[lng, lat] for lat, lng, _ in ordered]}
        dist_km    = round(sum(
            math.sqrt((ordered[i][0]-ordered[i-1][0])**2 +
                      (ordered[i][1]-ordered[i-1][1])**2) * 111
            for i in range(1, len(ordered))), 2)
        tiempo_min = max(1, round(dist_km / 40 * 60))
    return {
        "geometry":            geometry,
        "waypoints_ordenados": [{**meta, "lat": lat, "lng": lng}
                                for lat, lng, meta in ordered],
        "distancia_km": dist_km,
        "tiempo_min":   tiempo_min,
    }


@app.post("/api/ruta")
def calcular_ruta(body: dict = Body(...)):
    place_ids = body.get("place_ids", [])
    if len(place_ids) < 2:
        raise HTTPException(400, "Se necesitan al menos 2 puntos")
    id_set   = set(place_ids)
    selected = [c for c in _get_candidatos() if c.get("place_id") in id_set]
    if not selected:
        raise HTTPException(404, "No se encontraron los candidatos")
    return _build_route(selected)


@app.post("/api/ruta-colonia")
def ruta_colonia(body: dict = Body(...)):
    colonia = (body.get("colonia") or body.get("colonia_id") or "").strip()
    limite  = min(int(body.get("limite", 20)), 20)
    if not colonia:
        raise HTTPException(400, "colonia requerido")
    en_zona = [c for c in _get_candidatos()
               if (c.get("colonia_nombre") or c.get("colonia_denue") or "").upper() == str(colonia).upper()][:limite]
    if not en_zona:
        raise HTTPException(404, "Sin candidatos en esta colonia")
    return _build_route(en_zona)


# ── Reporte HTML de visita ────────────────────────────────────────────────────

@app.post("/api/reporte-visita")
def reporte_visita(body: dict = Body(...)):
    place_ids = body.get("place_ids", [])
    fecha     = body.get("fecha_visita", datetime.now().strftime("%Y-%m-%d"))
    id_set    = set(place_ids)
    filas = "".join(
        f"<tr><td>{html.escape(c.get('nombre',''))}</td>"
        f"<td>{html.escape(c.get('direccion','') or '')}</td>"
        f"<td>{c.get('tipo','informal')}</td><td></td><td></td></tr>"
        for c in _get_candidatos() if c.get("place_id") in id_set
    )
    content = (
        f'<!DOCTYPE html><html><head><meta charset="UTF-8"/>'
        f'<title>Reporte {fecha}</title>'
        f'<style>body{{font-family:sans-serif;padding:20px}}'
        f'table{{border-collapse:collapse;width:100%}}'
        f'th,td{{border:1px solid #ccc;padding:8px;text-align:left}}'
        f'th{{background:#1e3a8a;color:#fff}}</style></head><body>'
        f'<h2>Reporte de visita — {fecha}</h2>'
        f'<table><thead><tr><th>Negocio</th><th>Dirección</th><th>Estado</th>'
        f'<th>Visitado</th><th>Notas</th></tr></thead><tbody>{filas}</tbody></table>'
        f'</body></html>'
    )
    return Response(content, media_type="text/html",
                    headers={"Content-Disposition": f"attachment; filename=reporte_{fecha}.html"})


# ══════════════════════════════════════════════════════════════════════════════
# REPORTES — Firestore
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/reportes")
def get_reportes(limit: int = 200, status: Optional[str] = None):
    if _fdb is None:
        raise HTTPException(503, "Firestore no disponible")
    try:
        col   = _fdb.collection("reportes")
        query = (col.where("status", "==", status) if status else col).order_by(
            "fecha", direction="DESCENDING").limit(limit)
        return [{**doc.to_dict(), "id": doc.id} for doc in query.stream()]
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/api/reportes")
async def crear_reporte(
    tipo:        str = Form(...),
    lat:         float = Form(...),
    lng:         float = Form(...),
    descripcion: str = Form(""),
    direccion:   str = Form(""),
    foto:        Optional[UploadFile] = File(None),
):
    if _fdb is None:
        raise HTTPException(503, "Firestore no disponible")
    foto_url = None
    if foto and foto.filename and _storage is not None:
        try:
            data_bytes   = await foto.read()
            content_type = foto.content_type or "image/jpeg"
            fname        = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{foto.filename}"
            bucket_name  = None
            for bname in ("canaco-info.appspot.com", "canaco-info.firebasestorage.app"):
                try:
                    _storage.bucket(bname).blob("_probe").exists()
                    bucket_name = bname
                    break
                except Exception:
                    continue
            if bucket_name:
                blob = _storage.bucket(bucket_name).blob(f"reportes/{fname}")
                blob.upload_from_string(data_bytes, content_type=content_type)
                foto_url = (f"https://firebasestorage.googleapis.com/v0/b/{bucket_name}/o/"
                            f"{quote(blob.name, safe='')}?alt=media")
            else:
                print("  [Storage] No se encontro bucket — reporte sin foto")
        except Exception as e:
            print(f"  [Storage] Upload fallido: {e}")
    try:
        _, doc_ref = _fdb.collection("reportes").add({
            "tipo": tipo, "descripcion": descripcion,
            "lat": lat, "lng": lng, "direccion": direccion,
            "foto_url": foto_url, "status": "pendiente",
            "fecha": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        })
        return {"ok": True, "id": doc_ref.id}
    except Exception as e:
        raise HTTPException(500, str(e))


@app.patch("/api/reportes/{reporte_id}")
def actualizar_reporte(reporte_id: str, body: dict = Body(...)):
    if _fdb is None:
        raise HTTPException(503, "Firestore no disponible")
    try:
        _fdb.collection("reportes").document(reporte_id).update(body)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(500, str(e))


@app.delete("/api/reportes/{reporte_id}")
def eliminar_reporte(reporte_id: str):
    if _fdb is None:
        raise HTTPException(503, "Firestore no disponible")
    try:
        _fdb.collection("reportes").document(reporte_id).delete()
        return {"ok": True}
    except Exception as e:
        raise HTTPException(500, str(e))


# ══════════════════════════════════════════════════════════════════════════════
# CAMPAÑAS — Firestore
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/campanas")
def get_campanas(status: Optional[str] = None):
    if _fdb is None:
        raise HTTPException(503, "Firestore no disponible")
    try:
        docs   = list(_fdb.collection("campanas").stream())
        result = []
        for doc in docs:
            c = {**doc.to_dict(), "id": doc.id}
            if status and c.get("status") != status:
                continue
            nds = list(_fdb.collection("campanas").document(doc.id)
                       .collection("negocios").stream())
            c["total_negocios"]    = len(nds)
            c["total_completados"] = sum(1 for nd in nds if nd.to_dict().get("completado"))
            result.append(c)
        result.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return result
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/api/campanas")
def crear_campana(body: dict = Body(...)):
    if _fdb is None:
        raise HTTPException(503, "Firestore no disponible")
    try:
        _, doc_ref = _fdb.collection("campanas").add({
            "nombre":       body.get("nombre"),
            "descripcion":  body.get("descripcion"),
            "colonia":      body.get("colonia"),
            "fecha_inicio": body.get("fecha_inicio"),
            "fecha_fin":    body.get("fecha_fin"),
            "status":       "activa",
            "created_at":   datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        })
        return {"ok": True, "id": doc_ref.id}
    except Exception as e:
        raise HTTPException(500, str(e))


@app.get("/api/campanas/{campana_id}")
def get_campana(campana_id: str):
    if _fdb is None:
        raise HTTPException(503, "Firestore no disponible")
    try:
        doc = _fdb.collection("campanas").document(campana_id).get()
        if not doc.exists:
            raise HTTPException(404, "Campaña no encontrada")
        campana = {**doc.to_dict(), "id": doc.id}
        nds     = list(_fdb.collection("campanas").document(campana_id)
                       .collection("negocios").stream())
        negocios = []
        for nd in nds:
            d       = nd.to_dict()
            real_id = d.get("negocio_id") or nd.id.replace("__", "/")
            negocios.append({**d, "cn_id": real_id, "negocio_id": real_id,
                             "nombre": d.get("nombre", real_id),
                             "tipo":   d.get("tipo", "informal"),
                             "tipos":  d.get("tipos", "")})
        campana["total_negocios"]    = len(negocios)
        campana["total_completados"] = sum(1 for n in negocios if n.get("completado"))
        return {"campana": campana, "negocios": negocios, "ruta": None}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/api/campanas/{campana_id}/negocios")
def agregar_negocios_campana(campana_id: str, body: dict = Body(...)):
    if _fdb is None:
        raise HTTPException(503, "Firestore no disponible")
    negocio_ids = body.get("negocio_ids", [])
    cand_map    = {c["place_id"]: c for c in _get_candidatos() if c.get("place_id")}
    try:
        col = _fdb.collection("campanas").document(campana_id).collection("negocios")
        added = duplicados = 0
        for nid in negocio_ids:
            safe_id = nid.replace("/", "__")
            ref     = col.document(safe_id)
            if ref.get().exists:
                duplicados += 1
                continue
            cand = cand_map.get(nid, {})
            ref.set({
                "negocio_id": nid, "completado": False, "notas": "",
                "fecha_visita": "", "checklist_json": "[]",
                "nombre": cand.get("nombre", nid),
                "tipo":   cand.get("tipo", "informal"),
                "tipos":  cand.get("tipos", ""),
            })
            added += 1
        return {"ok": True, "insertados": added, "duplicados_ignorados": duplicados}
    except Exception as e:
        raise HTTPException(500, str(e))


@app.patch("/api/campanas/{campana_id}/negocios/{negocio_id:path}")
def actualizar_negocio_campana(campana_id: str, negocio_id: str, body: dict = Body(...)):
    if _fdb is None:
        raise HTTPException(503, "Firestore no disponible")
    try:
        safe_id = negocio_id.replace("/", "__")
        # Normalizar completado a bool (el frontend a veces envía 1/0)
        if "completado" in body:
            body["completado"] = bool(body["completado"])
        _fdb.collection("campanas").document(campana_id) \
            .collection("negocios").document(safe_id).update(body)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(500, str(e))


@app.patch("/api/campanas/{campana_id}/status")
def actualizar_status_campana(campana_id: str, body: dict = Body(...)):
    if _fdb is None:
        raise HTTPException(503, "Firestore no disponible")
    try:
        _fdb.collection("campanas").document(campana_id).update({"status": body.get("status")})
        return {"ok": True}
    except Exception as e:
        raise HTTPException(500, str(e))


@app.patch("/api/campanas/{campana_id}/asignar")
def asignar_campana(campana_id: str, body: dict = Body(...)):
    """Asigna (o desasigna) un técnico a una campaña."""
    if _fdb is None:
        raise HTTPException(503, "Firestore no disponible")
    try:
        uid = body.get("asignado_a")  # None o uid del técnico
        update_data: dict = {"asignado_a": uid}
        # Intentar obtener nombre del técnico desde Firebase Auth
        if uid and _firebase_ok:
            try:
                u = fb_auth.get_user(uid)
                update_data["asignado_nombre"] = u.display_name or u.email or uid
            except Exception:
                update_data["asignado_nombre"] = uid
        else:
            update_data["asignado_nombre"] = None
        _fdb.collection("campanas").document(campana_id).update(update_data)
        return {"ok": True, "asignado_a": uid,
                "asignado_nombre": update_data.get("asignado_nombre")}
    except Exception as e:
        raise HTTPException(500, str(e))


@app.delete("/api/campanas/{campana_id}")
def eliminar_campana(campana_id: str):
    if _fdb is None:
        raise HTTPException(503, "Firestore no disponible")
    try:
        col = _fdb.collection("campanas").document(campana_id).collection("negocios")
        for nd in col.stream():
            nd.reference.delete()
        _fdb.collection("campanas").document(campana_id).delete()
        return {"ok": True}
    except Exception as e:
        raise HTTPException(500, str(e))


# ── Admin usuarios — Firebase Auth ────────────────────────────────────────────

@app.get("/api/admin/usuarios")
def get_usuarios(request: Request):
    if not _firebase_ok:
        return []
    try:
        users = []
        page  = fb_auth.list_users()
        while page:
            for u in page.users:
                claims = u.custom_claims or {}
                users.append({"uid": u.uid, "email": u.email,
                              "nombre": u.display_name or "",
                              "role": claims.get("role", "tecnico"),
                              "disabled": u.disabled})
            page = page.get_next_page()
        return users
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/api/admin/usuarios")
async def crear_usuario(body: dict = Body(...)):
    if not _firebase_ok:
        raise HTTPException(503, "Firebase no configurado")
    try:
        user = fb_auth.create_user(email=body.get("email"),
                                   password=body.get("password", "Temporal123!"),
                                   display_name=body.get("nombre", ""))
        fb_auth.set_custom_user_claims(user.uid, {"role": body.get("role", "tecnico")})
        return {"ok": True, "uid": user.uid}
    except Exception as e:
        raise HTTPException(400, str(e))


@app.patch("/api/admin/usuarios/{uid}")
async def actualizar_usuario(uid: str, body: dict = Body(...)):
    if not _firebase_ok:
        raise HTTPException(503, "Firebase no configurado")
    try:
        if "role" in body:
            u      = fb_auth.get_user(uid)
            claims = dict(u.custom_claims or {})
            claims["role"] = body["role"]
            fb_auth.set_custom_user_claims(uid, claims)
        if "disabled" in body:
            fb_auth.update_user(uid, disabled=bool(body["disabled"]))
        return {"ok": True}
    except Exception as e:
        raise HTTPException(400, str(e))


@app.delete("/api/admin/usuarios/{uid}")
async def eliminar_usuario(uid: str):
    if not _firebase_ok:
        raise HTTPException(503, "Firebase no configurado")
    try:
        fb_auth.delete_user(uid)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(400, str(e))


# ══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print("=" * 52)
    print("  GeoFormal - Merida, Yucatan")
    print("=" * 52)
    print("  >> http://localhost:8765")
    print("=" * 52)
    uvicorn.run("app:app", host="0.0.0.0", port=8765, reload=False)
