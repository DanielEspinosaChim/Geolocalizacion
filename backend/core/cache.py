import gzip
import json
import time
import threading

from backend.core.config import SLIM_FIELDS, DISK_CACHE
from backend.core.firebase import fdb

# ── Estado del cache ──────────────────────────────────────────────────────────
_cands_cache:    list  = []
_cands_ts:       float = 0.0
_CACHE_TTL               = 600   # 10 minutos
_cache_loading:  bool  = False
_cache_progress: str   = "idle"
_cache_lock              = threading.Lock()

_slim_json:    bytes = b"[]"
_slim_json_gz: bytes = b""
_slim_json_lock        = threading.Lock()


# ── Helpers de serialización ──────────────────────────────────────────────────

def rebuild_slim_json(docs: list):
    """Proyecta campos slim, serializa a JSON y precomprime con gzip."""
    global _slim_json, _slim_json_gz
    result     = [{f: c[f] for f in SLIM_FIELDS if f in c}
                  for c in docs if c.get("es_informal")]
    raw        = json.dumps(result, ensure_ascii=False).encode("utf-8")
    compressed = gzip.compress(raw, compresslevel=6)
    with _slim_json_lock:
        _slim_json    = raw
        _slim_json_gz = compressed


def _save_disk_cache():
    """Persiste el slim JSON a disco para warm-start en el próximo arranque."""
    try:
        with _slim_json_lock:
            gz = _slim_json_gz
        if gz:
            DISK_CACHE.write_bytes(gz)
            print(f"  [Cache] Disco: guardado {len(gz):,} bytes en {DISK_CACHE.name}")
    except Exception as e:
        print(f"  [Cache] Disco: fallo al guardar — {e}")


# ── Carga desde disco ─────────────────────────────────────────────────────────

def load_disk_cache():
    """Carga el slim JSON desde disco (si existe) — instante, sin Firestore."""
    global _slim_json, _slim_json_gz, _cache_progress
    if not DISK_CACHE.exists():
        return
    try:
        gz  = DISK_CACHE.read_bytes()
        raw = gzip.decompress(gz)
        with _slim_json_lock:
            _slim_json    = raw
            _slim_json_gz = gz
        _cache_progress = "ready"
        print(f"  [Cache] Disco: {len(json.loads(raw))} candidatos cargados en <1s")
    except Exception as e:
        print(f"  [Cache] Disco: fallo al leer — {e}")


# ── Carga desde Firestore (background) ───────────────────────────────────────

def load_cache_background():
    """Carga Firestore paginado en background; actualiza _cands_cache cada lote.
    Si ya hay datos del disco-cache, el refresh de Firestore es silencioso.
    """
    global _cands_cache, _cands_ts, _cache_loading, _cache_progress
    t0        = time.time()
    all_docs  = []
    last_doc  = None
    batch_num = 0
    silent    = _cache_progress == "ready"
    try:
        max_retries = 3
        for attempt in range(max_retries):
            try:
                if not silent:
                    _cache_progress = f"loading ({len(all_docs)} docs)" if all_docs else "loading"
                print(f"  [Cache] {'Refresh' if silent else 'Cargando'}... "
                      f"(intento {attempt+1}/{max_retries})")
                while True:
                    batch_num += 1
                    q = (fdb.collection("candidatos").limit(2000).start_after(last_doc)
                         if last_doc else fdb.collection("candidatos").limit(2000))
                    batch_docs = []
                    for doc in q.stream():
                        batch_docs.append(doc)
                        all_docs.append(doc)
                    if not batch_docs:
                        break
                    last_doc = batch_docs[-1]
                    snap     = [doc.to_dict() for doc in all_docs]
                    with _cache_lock:
                        _cands_cache = snap
                    if not silent:
                        _cache_progress = f"loading ({len(all_docs)} docs, lote {batch_num})"
                    rebuild_slim_json(snap)
                    print(f"  [Cache] Lote {batch_num}: {len(batch_docs)} docs "
                          f"(total: {len(all_docs)})")
                # Éxito
                snap = [doc.to_dict() for doc in all_docs]
                with _cache_lock:
                    _cands_cache = snap
                    _cands_ts    = time.time()
                rebuild_slim_json(snap)
                _cache_progress = "ready"
                print(f"  [Cache] {'Refresh' if silent else 'OK'} "
                      f"{len(_cands_cache)} candidatos en {round(time.time()-t0, 1)}s")
                _save_disk_cache()
                return
            except Exception as e:
                print(f"  [Cache] Intento {attempt+1}/{max_retries} "
                      f"falló en doc {len(all_docs)}: {e}")
                if attempt < max_retries - 1:
                    if not silent:
                        _cache_progress = (f"retrying ({len(all_docs)} docs, "
                                           f"intento {attempt+2})")
                    time.sleep(2 ** attempt)
                else:
                    snap = [d.to_dict() for d in all_docs]
                    if snap:
                        with _cache_lock:
                            _cands_cache = snap
                            if _cands_ts == 0.0:
                                _cands_ts = time.time()
                        rebuild_slim_json(snap)
                        _cache_progress = "ready"
                        print(f"  [Cache] Usando {len(snap)} docs del cache parcial")
                    else:
                        if not silent:
                            _cache_progress = "error"
                        print("  [Cache] Sin datos — error fatal")
    finally:
        with _cache_lock:
            _cache_loading = False


# ── Acceso público ────────────────────────────────────────────────────────────

def get_candidatos() -> list:
    """Devuelve snapshot del cache (nunca bloquea). Dispara recarga en bg si es necesario."""
    global _cache_loading
    cache_empty = not _cands_cache
    cache_stale = (_cands_ts > 0) and (time.time() - _cands_ts > _CACHE_TTL)
    if fdb is not None and (cache_empty or cache_stale):
        with _cache_lock:
            if not _cache_loading:
                _cache_loading = True
                threading.Thread(target=load_cache_background, daemon=True).start()
    with _cache_lock:
        return list(_cands_cache)


def invalidate_cache():
    global _cands_ts
    _cands_ts = 0.0
