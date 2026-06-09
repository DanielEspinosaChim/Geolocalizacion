"""
APP WEB — GeoFormal · Mapa de Candidatos Informales
====================================================
Corre con:  python app.py
Abre en:    http://localhost:8765
"""

import gzip, json, math, html, urllib.request, time, threading
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Optional
from urllib.parse import quote

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Form, UploadFile, File, Body, Request
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
import uvicorn

# ── Firebase Admin ────────────────────────────────────────────────────────────
import firebase_admin
from firebase_admin import credentials, auth as fb_auth

_BUCKET = "canaco-info.appspot.com"
_SA     = Path(__file__).parent / "service_account.json"

if not firebase_admin._apps:
    if _SA.exists():
        # Desarrollo local: usa el archivo de clave
        firebase_admin.initialize_app(
            credentials.Certificate(str(_SA)),
            {"storageBucket": _BUCKET},
        )
        print("  [Firebase] Admin SDK inicializado con service_account.json")
    else:
        # Cloud Run / GCP: usa Application Default Credentials (ADC)
        firebase_admin.initialize_app(
            options={"storageBucket": _BUCKET},
        )
        print("  [Firebase] Admin SDK inicializado con ADC (Cloud Run)")

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

# ── GCS client con credenciales explícitas del SA ────────────────────────────
from google.cloud import storage as _gcs_module

if _SA.exists():
    _sa_info    = json.loads(_SA.read_text())
    _gcs_client = _gcs_module.Client.from_service_account_info(_sa_info)
    print(f"  [GCS] Cliente SA OK ({_sa_info['project_id']})")
else:
    _gcs_client = _gcs_module.Client()
    print("  [GCS] Cliente ADC")


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
CRUCE = BASE / "data/procesado/cruce_completo.csv"
COLONIAS_GEOJSON  = BASE / "data/procesado/colonias_merida.geojson"
MUNICIPIO_GEOJSON = BASE / "data/procesado/municipio_merida.geojson"
AGEBS_GEOJSON     = BASE / "data/inegi/agebs_urbanos_merida.geojson"
MUNICIPIOS_YUC    = BASE / "data/inegi/municipios_yucatan.geojson"

UPLOADS_DIR   = BASE / "data/uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
GCS_BUCKET    = "canaco-info-reportes"

_DISK_CACHE = BASE / "data/procesado/candidatos_slim_cache.json.gz"

def _load_disk_cache():
    """Carga el slim JSON desde disco (si existe) — instante, sin Firestore."""
    global _slim_json, _slim_json_gz, _cache_progress
    if not _DISK_CACHE.exists():
        return
    try:
        gz = _DISK_CACHE.read_bytes()
        raw = gzip.decompress(gz)
        with _slim_json_lock:
            _slim_json    = raw
            _slim_json_gz = gz
        _cache_progress = "warm"   # disco listo pero Firestore aún no — frontend sigue polling
        print(f"  [Cache] Disco: {len(json.loads(raw))} candidatos cargados en <1s")
    except Exception as e:
        print(f"  [Cache] Disco: fallo al leer — {e}")


def _save_disk_cache():
    """Persiste el slim JSON a disco para warm-start en el próximo arranque."""
    try:
        with _slim_json_lock:
            gz = _slim_json_gz
        if gz:
            _DISK_CACHE.write_bytes(gz)
            print(f"  [Cache] Disco: guardado {len(gz):,} bytes en {_DISK_CACHE.name}")
    except Exception as e:
        print(f"  [Cache] Disco: fallo al guardar — {e}")


@asynccontextmanager
async def _lifespan(app: FastAPI):
    """Startup: carga disco primero (instante) y luego Firestore en background."""
    global _cache_loading
    _load_disk_cache()
    if _firebase_ok:
        with _cache_lock:
            if not _cache_loading:
                _cache_loading = True
                threading.Thread(target=_load_cache_background, daemon=True).start()
                print("  [Cache] Pre-carga Firestore iniciada en background")
    yield  # app corriendo
    # (shutdown: nada que limpiar — threads daemon mueren solos)


app = FastAPI(title="GeoFormal", lifespan=_lifespan)
app.mount("/css", StaticFiles(directory=str(FRONT / "css")), name="css")
app.mount("/js",  StaticFiles(directory=str(FRONT / "js")),  name="js")


@app.get("/uploads/{filename:path}")
def serve_upload(filename: str):
    """Sirve imágenes desde GCS (Cloud Run) o disco local (dev)."""
    import sys
    try:
        blob = _gcs_client.bucket(GCS_BUCKET).blob(filename)
        data = blob.download_as_bytes()
        mime = blob.content_type or "image/jpeg"
        return Response(content=data, media_type=mime,
                        headers={"Cache-Control": "public, max-age=86400"})
    except Exception as e:
        print(f"  [serve_upload] GCS error for {filename}: {type(e).__name__}: {e}", file=sys.stderr, flush=True)
    # Fallback: disco local
    local = UPLOADS_DIR / filename
    if local.exists():
        return FileResponse(str(local))
    raise HTTPException(404, "Imagen no encontrada")


# ── Cache en memoria de candidatos ────────────────────────────────────────────
_cands_cache: list = []
_cands_ts: float   = 0.0
_CACHE_TTL = 600   # 10 minutos
_cache_loading: bool = False
_cache_progress: str = "idle"
_cache_lock = threading.Lock()

# Campos que el frontend realmente usa (mapa, lista, campañas, ruta).
# Pre-serializar evita serializar 11k dicts en cada request.
_SLIM_FIELDS = ("place_id", "nombre", "lat", "lng", "tipos", "tipo",
                "colonia_nombre", "colonia_denue")
_slim_json:    bytes = b'[]'   # JSON sin comprimir
_slim_json_gz: bytes = b''     # JSON pre-comprimido con gzip (nivel 6)
_slim_json_lock = threading.Lock()


def _rebuild_slim_json(docs: list):
    """Proyecta campos slim, serializa a JSON y precomprime con gzip."""
    global _slim_json, _slim_json_gz
    result = [{f: c[f] for f in _SLIM_FIELDS if f in c}
              for c in docs if c.get("es_informal")]
    raw = json.dumps(result, ensure_ascii=False).encode("utf-8")
    compressed = gzip.compress(raw, compresslevel=6)
    with _slim_json_lock:
        _slim_json    = raw
        _slim_json_gz = compressed


def _load_cache_background():
    """Carga Firestore paginado en background; actualiza _cands_cache cada 50 docs.
    Si ya hay datos del disco-cache, el refresh de Firestore es silencioso
    (no cambia _cache_progress) para que el frontend no vea "cargando" otra vez.
    """
    global _cands_cache, _cands_ts, _cache_loading, _cache_progress
    t0        = time.time()
    all_docs  = []
    last_doc  = None
    batch_num = 0
    silent    = _cache_progress == "ready"   # disco-cache ya cargó → refresh silencioso
    try:
        max_retries = 3
        for attempt in range(max_retries):
            try:
                if not silent:
                    _cache_progress = f"loading ({len(all_docs)} docs)" if all_docs else "loading"
                print(f"  [Cache] {'Refresh' if silent else 'Cargando'}... (intento {attempt+1}/{max_retries})")
                while True:
                    batch_num += 1
                    q = (_fdb.collection("candidatos").limit(2000)
                                .start_after(last_doc) if last_doc
                         else _fdb.collection("candidatos").limit(2000))
                    batch_docs = []
                    for doc in q.stream():
                        batch_docs.append(doc)
                        all_docs.append(doc)
                        # Actualizar cache cada 200 docs para que el frontend vea progreso inmediato
                        if len(all_docs) % 200 == 0:
                            snap = [d.to_dict() for d in all_docs]
                            with _cache_lock:
                                _cands_cache = snap
                            _rebuild_slim_json(snap)
                            if not silent:
                                _cache_progress = f"loading ({len(all_docs)} docs)"
                    if not batch_docs:
                        break  # stream agotado — todos los docs están en all_docs
                    last_doc = batch_docs[-1]
                    snap = [doc.to_dict() for doc in all_docs]
                    with _cache_lock:
                        _cands_cache = snap
                    if not silent:
                        _cache_progress = f"loading ({len(all_docs)} docs, lote {batch_num})"
                    _rebuild_slim_json(snap)
                    print(f"  [Cache] Lote {batch_num}: {len(batch_docs)} docs (total: {len(all_docs)})")
                # Éxito: finalizar cache
                snap = [doc.to_dict() for doc in all_docs]
                with _cache_lock:
                    _cands_cache = snap
                    _cands_ts    = time.time()
                _rebuild_slim_json(snap)
                _cache_progress = "ready"
                print(f"  [Cache] {'Refresh' if silent else 'OK'} {len(_cands_cache)} candidatos en {round(time.time()-t0,1)}s")
                _save_disk_cache()
                return  # finally libera _cache_loading
            except Exception as e:
                print(f"  [Cache] Intento {attempt+1}/{max_retries} falló en doc {len(all_docs)}: {e}")
                if attempt < max_retries - 1:
                    if not silent:
                        _cache_progress = f"retrying ({len(all_docs)} docs, intento {attempt+2})"
                    time.sleep(2 ** attempt)
                else:
                    snap = [d.to_dict() for d in all_docs]
                    if snap:
                        with _cache_lock:
                            _cands_cache = snap
                            if _cands_ts == 0.0:
                                _cands_ts = time.time()
                        _rebuild_slim_json(snap)
                        _cache_progress = "ready"
                        print(f"  [Cache] Usando {len(snap)} docs del cache parcial")
                    else:
                        if not silent:
                            _cache_progress = "error"
                        print("  [Cache] Sin datos — error fatal")
    finally:
        with _cache_lock:
            _cache_loading = False


def _get_candidatos() -> list:
    """Devuelve snapshot del cache (nunca bloquea). Dispara recarga en bg si es necesario."""
    global _cache_loading
    cache_empty = not _cands_cache
    cache_stale = (_cands_ts > 0) and (time.time() - _cands_ts > _CACHE_TTL)
    if _fdb is not None and (cache_empty or cache_stale):
        with _cache_lock:
            if not _cache_loading:
                _cache_loading = True
                threading.Thread(target=_load_cache_background, daemon=True).start()
    with _cache_lock:
        return list(_cands_cache)


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


@app.get("/api/cache-status")
def cache_status():
    """Devuelve el estado de carga del cache de candidatos."""
    return {
        "status": _cache_progress,
        "count": len(_cands_cache),
        "ready": _cache_progress.startswith("ready"),
        "loading": _cache_loading,
    }


# ── Candidatos ────────────────────────────────────────────────────────────────

@app.get("/api/candidatos")
def get_candidatos(request: Request, limit: int = 0,
                   colonia: Optional[str] = None, tipo: Optional[str] = None):
    """Devuelve candidatos.
    - Sin filtros: respuesta pre-comprimida (O(1) CPU, ~380 KB con gzip).
    - Con filtros: filtra el cache en memoria y proyecta campos slim.
    """
    _get_candidatos()  # dispara carga en bg si es necesario

    if not colonia and not tipo and limit == 0:
        accept = request.headers.get("Accept-Encoding", "")
        with _slim_json_lock:
            if "gzip" in accept and _slim_json_gz:
                return Response(
                    content=_slim_json_gz,
                    media_type="application/json",
                    headers={"Content-Encoding": "gzip"},
                )
            return Response(content=_slim_json, media_type="application/json")

    # Ruta filtrada
    cands  = _get_candidatos()
    colonia_up = colonia.upper() if colonia else None
    result = []
    for c in cands:
        if not c.get("es_informal"):
            continue
        if colonia_up:
            nombre_real = (c.get("colonia_nombre") or c.get("colonia_denue") or "").upper()
            if nombre_real != colonia_up:
                continue
        if tipo and c.get("tipo", "informal") != tipo:
            continue
        result.append({f: c[f] for f in _SLIM_FIELDS if f in c})
        if limit > 0 and len(result) >= limit:
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
    # Mutar el cache en memoria directamente
    with _cache_lock:
        snap = list(_cands_cache)
    for c in snap:
        if c.get("place_id") == place_id:
            c["tipo"] = tipo
            break
    with _cache_lock:
        _cands_cache[:] = snap
    threading.Thread(target=_rebuild_slim_json, args=(snap,), daemon=True).start()
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

@app.get("/api/indice")
def get_indice():
    """Índice de informalidad usando Estimador de Razón (Multiplier Method)."""
    import math as _math

    # Datos fijos del cruce (valores del último cruce ejecutado)
    N1               = 144_576  # DENUE Mérida — formales registrados (ancla)
    m                = 9_040    # overlap GM∩DENUE (decision_fuente=formal_denue) — ancla del método
    n_formales_otros = 10_269   # cadena(2445)+tipo_gmaps(1186)+institucion(860)+excluido_tipo(5108)+excluido_nombre(670)
    n_formales_total = m + n_formales_otros  # 19,309 = todos los no-informales (es_informal=False)
    n_inf_obs        = 9_925    # informales confirmados (es_informal=True)
    n_gmaps          = 29_234   # total CSV (19,309 formales + 9,925 informales)

    p_formal   = m / N1                      # cobertura GM para formales
    multiplicador = N1 / m

    # Estimaciones por escenario α
    escenarios = []
    for alpha, etiqueta in [(1.0, "Límite inferior"), (0.80, "Conservador"), (0.65, "Estimación central"), (0.50, "Límite superior")]:
        p_inf    = alpha * p_formal
        N_inf    = n_inf_obs / p_inf
        indice   = N_inf / (N1 + N_inf)
        escenarios.append({
            "alpha": alpha, "etiqueta": etiqueta,
            "N_inf_estimado": round(N_inf),
            "indice_pct": round(indice * 100, 1),
        })

    # IC 95% para el límite inferior (método delta)
    var_p  = p_formal * (1 - p_formal) / N1
    se_N   = (n_inf_obs / p_formal**2) * _math.sqrt(var_p)
    ci_low  = max(0, n_inf_obs * multiplicador - 1.96 * se_N)
    ci_high = n_inf_obs * multiplicador + 1.96 * se_N
    ic_low_pct  = round(ci_low  / (N1 + ci_low)  * 100, 1)
    ic_high_pct = round(ci_high / (N1 + ci_high) * 100, 1)

    return {
        "datos_entrada": {
            "N1_denue":          N1,
            "m_overlap":         m,
            "n_formales_total":  n_formales_total,
            "n_formales_otros":  n_formales_otros,
            "n_inf_observados":  n_inf_obs,
            "n_gmaps_negocios":  n_gmaps,
            "n_gmaps_csv":       29_234,
        },
        "cobertura_gmaps_pct": round(p_formal * 100, 2),
        "multiplicador":        round(multiplicador, 2),
        "escenarios":           escenarios,
        "ic95_indice_inferior": {"low": ic_low_pct, "high": ic_high_pct},
        "central_indice_pct":   escenarios[2]["indice_pct"],
        "referencia_inegi":     "57–60% informalidad laboral Yucatán (INEGI 2023)",
        "metodo":               "Estimador de Razón / Multiplier Method",
        "referencias":          [
            "UNAIDS (2010) Guidelines on Estimating the Size of Populations Most at Risk",
            "Thompson (2002) Sampling — Ratio Estimation",
            "CEPAL (2018) Medición de la economía informal",
        ],
    }


@app.get("/api/metricas")
def get_metricas():
    cands = _get_candidatos()
    if not cands:
        return {"total": 0, "formales": 0, "informales": 0, "pct_informal": 0,
                "score_prom": 0, "dist_prom_m": 0, "top_tipos": []}
    total      = len(cands)
    # Usar campo 'tipo' (el que cambia el usuario) para clasificar
    formales   = sum(1 for c in cands if c.get("tipo") == "formal")
    en_proceso = sum(1 for c in cands if c.get("tipo") == "en_proceso")
    informales = total - formales - en_proceso
    scores = [float(c["fuzzy_score"]) for c in cands if c.get("fuzzy_score")]
    dists  = [float(c["distancia_m"]) for c in cands
              if c.get("distancia_m") and float(c.get("distancia_m", 9999)) < 9999]
    SKIP = {"point_of_interest", "establishment", "service", ""}
    tipos_counts = Counter()
    for c in cands:
        if c.get("tipo", "informal") == "informal":
            for t in (c.get("tipos") or "").split(","):
                t = t.strip()
                if t not in SKIP:
                    tipos_counts[t] += 1
    return {
        "total":        total,
        "formales":     formales,
        "en_proceso":   en_proceso,
        "informales":   informales,
        "pct_informal": round(informales / total * 100, 1) if total else 0,
        "score_prom":   round(sum(scores) / len(scores), 1) if scores else 0,
        "dist_prom_m":  round(sum(dists) / len(dists), 1) if dists else 0,
        "top_tipos":    tipos_counts.most_common(8),
    }


# ── Muestra validación ────────────────────────────────────────────────────────

@app.get("/api/muestra-validacion")
def muestra_validacion(limit: int = 2000):
    import csv as _csv

    # Formales: leer del CSV de cruce completo (nunca se subieron a Firestore)
    matches = []
    if CRUCE.exists():
        with open(CRUCE, encoding="utf-8") as f:
            for row in _csv.DictReader(f):
                if row.get("es_informal") != "False":
                    continue
                score = float(row.get("fuzzy_score") or 0)
                if score < 50:
                    continue
                matches.append({
                    "nombre":       row.get("nombre", ""),
                    "nombre_denue": row.get("nombre_denue", ""),
                    "fuzzy_score":  round(score, 1),
                    "distancia_m":  row.get("distancia_m", ""),
                })
        matches.sort(key=lambda x: -x["fuzzy_score"])
        matches = matches[:limit]

    # Informales: desde Firestore
    cands = _get_candidatos()
    no_matches = [c for c in cands if c.get("es_informal")][:limit]

    return {
        "matches": matches,
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
    # negocios_hint: [{negocio_id, nombre, lat, lng}] — coords ya conocidas del frontend
    negocios_hint = {n["negocio_id"]: n for n in body.get("negocios_hint", []) if n.get("negocio_id")}

    if len(place_ids) < 2:
        raise HTTPException(400, "Se necesitan al menos 2 puntos")

    # Lookup en candidatos para completar coords que falten
    id_set    = set(place_ids)
    cand_map  = {c["place_id"]: c for c in _get_candidatos() if c.get("place_id") in id_set}

    selected = []
    descartados = []
    for pid in place_ids:
        hint = negocios_hint.get(pid)
        cand = cand_map.get(pid)
        if hint and hint.get("lat") and hint.get("lng"):
            selected.append(hint)
        elif cand and cand.get("lat") and cand.get("lng"):
            selected.append(cand)
        else:
            descartados.append({"id": pid, "nombre": (hint or {}).get("nombre") or pid})

    if len(selected) < 2:
        raise HTTPException(400, "No se encontraron suficientes puntos con coordenadas")
    result = _build_route(selected)
    result["descartados"] = descartados
    return result


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
    place_ids  = body.get("place_ids", [])
    fecha      = body.get("fecha_visita", datetime.now().strftime("%Y-%m-%d"))
    campana_id = body.get("campana_id")
    id_set     = set(place_ids)

    # Leer datos de visita directo de Firestore si se envió campana_id
    visita_data = {}   # negocio_id → {completado, notas, fecha_visita, visita_datos, plantilla_id}
    if campana_id and _fdb:
        nds = list(_fdb.collection("campanas").document(str(campana_id))
                       .collection("negocios").stream())
        for nd in nds:
            d   = nd.to_dict() or {}
            nid = d.get("negocio_id") or nd.id.replace("__", "/")
            visita_data[nid] = {
                "completado":   bool(d.get("completado", False)),
                "notas":        (d.get("notas") or "").strip(),
                "fecha_visita": d.get("fecha_visita") or "",
                "visita_datos": d.get("visita_datos") or {},
                "plantilla_id": d.get("plantilla_id") or "",
            }


    TIPO_LABEL = {"informal": "🔴 Informal", "en_proceso": "🟠 En proceso", "formal": "🟢 Formal"}
    filas = ""
    for c in _get_candidatos():
        pid = c.get("place_id", "")
        if pid not in id_set:
            continue
        vd         = visita_data.get(pid, {})
        completado = vd.get("completado") or bool(vd.get("fecha_visita"))
        notas_raw  = (vd.get("notas") or "").strip()
        fecha_vis  = vd.get("fecha_visita") or ""
        tipo_label = TIPO_LABEL.get(c.get("tipo", "informal"), "🔴 Informal")
        vis_txt    = "✓ Visitado" if completado else "Pendiente"
        vis_color  = "#16a34a"    if completado else "#94a3b8"
        fecha_span = f'<br><span style="font-size:10px;color:#94a3b8">{fecha_vis}</span>' if fecha_vis else ''
        filas += (
            f"<tr>"
            f"<td style='font-weight:600'>{html.escape(c.get('nombre','') or '')}</td>"
            f"<td style='color:#64748b;font-size:12px'>{html.escape(c.get('direccion','') or '')}</td>"
            f"<td>{tipo_label}</td>"
            f"<td style='color:{vis_color};font-weight:700;white-space:nowrap'>{vis_txt}{fecha_span}</td>"
            f"<td style='font-size:12px;color:#334155'>{html.escape(notas_raw)}</td>"
            f"</tr>"
        )

    content = f"""<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"/>
<title>Reporte de visita — {fecha}</title>
<style>
  * {{ margin:0; padding:0; box-sizing:border-box; }}
  body {{ font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
          padding:32px;max-width:900px;margin:0 auto;color:#0f172a; }}
  h1 {{ font-size:22px;font-weight:800;margin-bottom:4px; }}
  .sub {{ font-size:13px;color:#64748b;margin-bottom:24px; }}
  table {{ border-collapse:collapse;width:100%; }}
  th,td {{ border:1px solid #e2e8f0;padding:10px 12px;text-align:left;vertical-align:top; }}
  th {{ background:#0f172a;color:#fff;font-size:11px;text-transform:uppercase;letter-spacing:.5px; }}
  tr:nth-child(even) {{ background:#f8fafc; }}
  .no-print {{ margin-bottom:16px; }}
  @media print {{ .no-print{{display:none}} body{{padding:0}} }}
</style></head><body>
<div class="no-print">
  <button onclick="window.print()"
          style="padding:8px 18px;background:#0f172a;color:#fff;border:none;
                 border-radius:6px;cursor:pointer;font-size:13px">🖨️ Imprimir</button>
</div>
<h1>Reporte de visita de campo</h1>
<div class="sub">Fecha: {fecha} · {len(place_ids)} negocio(s) · Mérida, Yucatán</div>
<table>
  <thead><tr>
    <th>Negocio</th><th>Dirección</th><th>Estado</th><th>Visitado</th><th>Notas</th>
  </tr></thead>
  <tbody>{filas}</tbody>
</table>
<div style="margin-top:20px;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px">
  Generado el {datetime.now().strftime("%Y-%m-%d %H:%M")} — Sistema de Geolocalización de Informalidad
</div>
</body></html>"""

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
        docs = _fdb.collection("reportes").order_by("fecha", direction="DESCENDING").limit(limit).stream()
        result = [{**doc.to_dict(), "id": doc.id} for doc in docs]
        if status:
            result = [r for r in result if r.get("status") == status]
        return result
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
    if foto and foto.filename:
        import uuid as _uuid
        data_bytes   = await foto.read()
        content_type = foto.content_type or "image/jpeg"
        ext          = Path(foto.filename).suffix.lower() or ".jpg"
        fname        = f"reporte_{_uuid.uuid4().hex}{ext}"

        # Subir a GCS
        try:
            blob = _gcs_client.bucket(GCS_BUCKET).blob(fname)
            blob.upload_from_string(data_bytes, content_type=content_type)
            foto_url = f"/uploads/{fname}"
            print(f"  [Storage] Foto subida a GCS: {fname}")
        except Exception as e:
            print(f"  [Storage] Upload fallido: {e}")
            dest = UPLOADS_DIR / fname
            dest.write_bytes(data_bytes)
            foto_url = f"/uploads/{fname}"
            print(f"  [Storage] Foto guardada local: {fname}")
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
                "nombre":   cand.get("nombre", nid),
                "tipo":     cand.get("tipo", "informal"),
                "tipos":    cand.get("tipos", ""),
                "lat":      cand.get("lat"),
                "lng":      cand.get("lng"),
                "colonia":  cand.get("colonia_nombre") or cand.get("colonia_denue") or "",
                "direccion": cand.get("direccion") or cand.get("address") or "",
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


# ══════════════════════════════════════════════════════════════════════════════
# PLANTILLAS DE VISITA — Firestore
# ══════════════════════════════════════════════════════════════════════════════

_CAMPOS_DEFAULT = [
    {"key": "resultado",      "label": "Resultado",                     "tipo": "opciones",
     "opciones": ["Contactado", "No encontrado", "Rechazó"], "requerido": True},
    {"key": "tiene_internet", "label": "¿Tiene internet?",             "tipo": "bool"},
    {"key": "tiene_local",    "label": "¿Tiene local fijo?",           "tipo": "bool"},
    {"key": "num_empleados",  "label": "No. empleados",                 "tipo": "numero"},
    {"key": "tiene_rfc",      "label": "¿Tiene RFC?",                  "tipo": "bool"},
    {"key": "interesado",     "label": "¿Interesado en formalizarse?", "tipo": "opciones",
     "opciones": ["Sí", "Tal vez", "No"]},
    {"key": "telefono",       "label": "Teléfono de contacto",         "tipo": "texto"},
    {"key": "notas",          "label": "Notas",                        "tipo": "textarea"},
    {"key": "foto",           "label": "Foto del negocio",             "tipo": "foto"},
]


@app.get("/api/plantillas")
def get_plantillas():
    if _fdb is None:
        raise HTTPException(503, "Firestore no disponible")
    try:
        docs   = list(_fdb.collection("plantillas_visita").stream())
        result = [{**doc.to_dict(), "id": doc.id} for doc in docs]
        if not result:
            _, ref = _fdb.collection("plantillas_visita").add({
                "nombre":      "Visita estándar",
                "descripcion": "Campos básicos para registro de visita",
                "campos":      _CAMPOS_DEFAULT,
                "es_default":  True,
                "created_at":  datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            })
            result = [{"id": ref.id, "nombre": "Visita estándar", "es_default": True,
                       "descripcion": "Campos básicos para registro de visita",
                       "campos": _CAMPOS_DEFAULT}]
        return result
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/api/plantillas")
def crear_plantilla(body: dict = Body(...)):
    if _fdb is None:
        raise HTTPException(503, "Firestore no disponible")
    try:
        _, ref = _fdb.collection("plantillas_visita").add({
            "nombre":      body.get("nombre", "Nueva plantilla"),
            "descripcion": body.get("descripcion", ""),
            "campos":      body.get("campos", []),
            "es_default":  False,
            "created_at":  datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        })
        return {"ok": True, "id": ref.id}
    except Exception as e:
        raise HTTPException(500, str(e))


@app.put("/api/plantillas/{plantilla_id}")
def actualizar_plantilla(plantilla_id: str, body: dict = Body(...)):
    if _fdb is None:
        raise HTTPException(503, "Firestore no disponible")
    try:
        upd = {k: body[k] for k in ("nombre", "descripcion", "campos") if k in body}
        _fdb.collection("plantillas_visita").document(plantilla_id).update(upd)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(500, str(e))


@app.delete("/api/plantillas/{plantilla_id}")
def eliminar_plantilla(plantilla_id: str):
    if _fdb is None:
        raise HTTPException(503, "Firestore no disponible")
    try:
        doc = _fdb.collection("plantillas_visita").document(plantilla_id).get()
        if doc.exists and doc.to_dict().get("es_default"):
            raise HTTPException(400, "No puedes eliminar la plantilla por defecto")
        _fdb.collection("plantillas_visita").document(plantilla_id).delete()
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/api/campanas/{campana_id}/negocios/{negocio_id:path}/visita")
async def guardar_visita_negocio(
    campana_id:   str,
    negocio_id:   str,
    foto:         Optional[UploadFile] = File(None),
    datos_json:   str                  = Form("{}"),
    plantilla_id: str                  = Form(""),
    completado:   str                  = Form("true"),
):
    if _fdb is None:
        raise HTTPException(503, "Firestore no disponible")
    try:
        datos = json.loads(datos_json)
    except Exception:
        datos = {}

    foto_url = None
    if foto and foto.filename:
        data_bytes = await foto.read()
        fname      = f"visita_{campana_id[:8]}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
        try:
            blob = _gcs_client.bucket(GCS_BUCKET).blob(fname)
            blob.upload_from_string(data_bytes, content_type=foto.content_type or "image/jpeg")
            foto_url = f"/uploads/{fname}"
            print(f"  [Storage] Visita subida a GCS: {fname}")
        except Exception as e:
            print(f"  [Storage] Visita upload fallido: {e}")
            dest = UPLOADS_DIR / fname
            dest.write_bytes(data_bytes)
            foto_url = f"/uploads/{fname}"

    safe_id = negocio_id.replace("/", "__")
    upd = {
        "completado":   completado.lower() not in ("false", "0", ""),
        "fecha_visita": datetime.now().strftime("%Y-%m-%d"),
        "visita_datos": datos,
        "notas":        datos.get("notas", ""),
    }
    if foto_url:
        upd["foto_visita_url"] = foto_url
    if plantilla_id:
        upd["plantilla_id"] = plantilla_id
    _fdb.collection("campanas").document(campana_id) \
        .collection("negocios").document(safe_id).update(upd)
    return {"ok": True, "foto_url": foto_url}


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
    uvicorn.run(app, host="0.0.0.0", port=8765)
