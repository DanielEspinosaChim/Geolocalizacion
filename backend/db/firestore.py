"""
Cliente Firestore + helpers para reemplazar SQLite en todos los routers.
"""
import time
import threading
from pathlib import Path
import firebase_admin
from firebase_admin import credentials, firestore as _firestore

ROOT    = Path(__file__).parent.parent.parent
SA_PATH = ROOT / "service_account.json"

_db = None

def get_db():
    global _db
    if _db is not None:
        return _db
    if not firebase_admin._apps:
        cred = credentials.Certificate(str(SA_PATH))
        firebase_admin.initialize_app(cred)
    _db = _firestore.client()
    return _db


def col(name: str):
    return get_db().collection(name)


def doc_to_dict(snap) -> dict:
    """
    Documento + su id.

    El id de un documento vive en `snap.id`, no en el cuerpo: descartarlo dejaba
    a las campañas sin `id` (revientan al enriquecerlas) y a los reportes con un
    `id` incoherente — los migrados guardan un entero en el cuerpo, los creados
    por Firestore no guardan nada. `snap.id` siempre existe y siempre es texto,
    así que es la única fuente de verdad; sobreescribe cualquier `id` del cuerpo.
    """
    d = snap.to_dict() or {}
    d["id"] = snap.id
    return d


# ── Cache en memoria para candidatos ─────────────────────────────────────────
# Evita leer Firestore en cada request; se precalienta al arrancar el servidor.

_cache_lock    = threading.RLock()
_cand_cache: list = []
_cand_ready    = False
_cand_loading  = False
_cand_ts: float = 0.0
_CAND_TTL       = 300  # segundos antes de refrescar en background


def _warm_candidatos():
    global _cand_cache, _cand_ready, _cand_loading, _cand_ts
    with _cache_lock:
        if _cand_loading:
            return
        _cand_loading = True
    try:
        docs = [doc_to_dict(d) for d in col("candidatos").stream()]
        with _cache_lock:
            _cand_cache = docs
            _cand_ready = True
            _cand_ts    = time.time()
        print(f"[cache] {len(docs)} candidatos cargados en memoria")
    except Exception as e:
        print(f"[cache] Error warming candidatos: {e}")
    finally:
        with _cache_lock:
            _cand_loading = False


def prewarm():
    """Inicia la carga de candidatos en background. Llamar desde lifespan."""
    threading.Thread(target=_warm_candidatos, daemon=True).start()


def get_cache_status() -> dict:
    with _cache_lock:
        return {
            "ready":   _cand_ready,
            "loading": _cand_loading,
            "count":   len(_cand_cache),
            "status":  "ok",
        }


def update_candidato_tipo_local(place_id: str, tipo: str, fecha: str):
    """Actualiza el tipo en el cache en memoria sin releer Firestore."""
    with _cache_lock:
        for c in _cand_cache:
            if c.get("place_id") == place_id:
                c["tipo"] = tipo
                c["fecha_actualizacion"] = fecha
                break


# ── Candidatos ────────────────────────────────────────────────────────────────

def get_candidatos(tipo=None, colonia_id=None, limit=2000):
    global _cand_ts
    now = time.time()

    with _cache_lock:
        needs_warm    = not _cand_ready and not _cand_loading
        needs_refresh = _cand_ready and (now - _cand_ts) > _CAND_TTL and not _cand_loading
        prewarm_running = _cand_loading and not _cand_ready

    if needs_warm:
        _warm_candidatos()  # síncrono: cache vacío, hay que cargar ahora
    elif needs_refresh:
        threading.Thread(target=_warm_candidatos, daemon=True).start()
    elif prewarm_running:
        # prewarm en background aún corriendo — esperar hasta que termine
        deadline = time.time() + 30
        while not _cand_ready and time.time() < deadline:
            time.sleep(0.1)

    with _cache_lock:
        result = list(_cand_cache)

    if tipo:
        result = [c for c in result if c.get("tipo") == tipo]
    if colonia_id:
        result = [c for c in result if c.get("colonia_id") == int(colonia_id)]
    return result[:limit]


def get_candidatos_by_place_ids(place_ids: list) -> list:
    """Trae candidatos por lista de place_ids (en lotes de 30)."""
    results = []
    for i in range(0, len(place_ids), 30):
        chunk = place_ids[i:i+30]
        snaps = col("candidatos").where("place_id", "in", chunk).stream()
        results.extend(doc_to_dict(s) for s in snaps)
    return results


def update_candidato_tipo(place_id: str, tipo: str, fecha: str) -> bool:
    doc_id = place_id.replace("/", "__")
    ref    = col("candidatos").document(doc_id)
    if not ref.get().exists:
        return False
    ref.update({"tipo": tipo, "fecha_actualizacion": fecha})
    return True


# ── Colonias ──────────────────────────────────────────────────────────────────

def get_colonias(con_candidatos=False):
    if con_candidatos:
        # Traer IDs de colonias que tienen al menos 1 candidato informal
        snaps      = col("candidatos").where("tipo", "==", "informal").stream()
        colonia_ids = {doc_to_dict(s).get("colonia_id") for s in snaps}
        colonia_ids.discard(None)
        results = []
        for cid in colonia_ids:
            snap = col("colonias").document(str(cid)).get()
            if snap.exists:
                results.append(doc_to_dict(snap))
        return sorted(results, key=lambda x: x.get("nombre", ""))
    return [doc_to_dict(d) for d in col("colonias").stream()]


def get_colonia(colonia_id: int) -> dict | None:
    snap = col("colonias").document(str(colonia_id)).get()
    return doc_to_dict(snap) if snap.exists else None


# ── Campanas ──────────────────────────────────────────────────────────────────

def list_campanas(status=None, uid=None):
    q = col("campanas")
    if status:
        q = q.where("status", "==", status)
    rows = [doc_to_dict(d) for d in q.stream()]
    # Filtrar por técnico asignado (técnicos solo ven las suyas)
    if uid:
        rows = [r for r in rows if r.get("asignado_a") == uid or not r.get("asignado_a")]
    # Enriquecer con contadores
    for c in rows:
        snaps = col("campanas").document(c["id"]).collection("negocios").stream()
        negs  = [doc_to_dict(s) for s in snaps]
        c["total_negocios"]    = len(negs)
        c["total_completados"] = sum(1 for n in negs if n.get("completado"))
    return sorted(rows, key=lambda x: x.get("created_at", ""), reverse=True)


def get_campana(campana_id: str) -> dict | None:
    snap = col("campanas").document(campana_id).get()
    return doc_to_dict(snap) if snap.exists else None


def create_campana(data: dict) -> dict:
    # Auto-id de Firestore. El autoincremento anterior recorría toda la colección
    # y colisionaba con los documentos migrados, que ya usan ids autogenerados.
    ref = col("campanas").document()
    ref.set(data)
    return {**data, "id": ref.id}


def update_campana_status(campana_id: str, status: str) -> bool:
    ref = col("campanas").document(campana_id)
    if not ref.get().exists:
        return False
    ref.update({"status": status})
    return True


def delete_campana(campana_id: str) -> bool:
    ref = col("campanas").document(campana_id)
    if not ref.get().exists:
        return False
    # Borrar subcolección negocios
    for snap in ref.collection("negocios").stream():
        snap.reference.delete()
    ref.delete()
    return True


# ── Campana Negocios ──────────────────────────────────────────────────────────

def get_campana_negocios(campana_id: str) -> list:
    snaps = col("campanas").document(campana_id).collection("negocios").stream()
    rows  = [doc_to_dict(s) for s in snaps]
    # Enriquecer con datos del candidato
    for n in rows:
        nid  = n.get("negocio_id", "")
        cdoc = col("candidatos").document(nid.replace("/", "__")).get()
        if cdoc.exists:
            c = doc_to_dict(cdoc)
            n["nombre"] = c.get("nombre")
            n["lat"]    = c.get("lat")
            n["lng"]    = c.get("lng")
            n["tipos"]  = c.get("tipos")
            n["tipo"]   = c.get("tipo")
        else:
            n.setdefault("nombre", None); n.setdefault("lat", None)
            n.setdefault("lng", None);    n.setdefault("tipos", None)
            n.setdefault("tipo", None)
    return rows


def _doc_id_negocio(negocio_id: str) -> str:
    """El place_id puede traer '/', que Firestore interpreta como separador de ruta."""
    return negocio_id.replace("/", "__")


def add_negocios_to_campana(campana_id: str, negocio_ids: list, checklist_json=None) -> int:
    # El negocio_id es la clave natural dentro de la campaña (no se repite), así que
    # se usa como id del documento: evita recorrer la subcolección para inventar un
    # entero — que además fallaba al hacer int() sobre ids como 'osm_node_1013…'.
    ref        = col("campanas").document(campana_id).collection("negocios")
    existentes = {doc_to_dict(s).get("negocio_id") for s in ref.stream()}
    insertados = 0
    for nid in negocio_ids:
        if nid not in existentes:
            ref.document(_doc_id_negocio(nid)).set({
                "campana_id": campana_id,
                "negocio_id": nid, "checklist_json": checklist_json,
                "completado": False, "notas": None, "fecha_visita": None,
            })
            insertados += 1
    return insertados


def update_negocio_campana(campana_id: str, negocio_id: str, campos: dict) -> dict | None:
    ref   = col("campanas").document(campana_id).collection("negocios")
    snaps = [s for s in ref.stream() if doc_to_dict(s).get("negocio_id") == negocio_id]
    if not snaps:
        return None
    snap = snaps[0]
    snap.reference.update(campos)
    return doc_to_dict(snap.reference.get())


def get_negocio_campana(campana_id: str, negocio_id: str) -> dict | None:
    ref   = col("campanas").document(campana_id).collection("negocios")
    snaps = [s for s in ref.stream() if doc_to_dict(s).get("negocio_id") == negocio_id]
    return doc_to_dict(snaps[0]) if snaps else None


# ── Reportes ──────────────────────────────────────────────────────────────────

def list_reportes(status=None, tipo=None, limit=200):
    q = col("reportes")
    if status:
        q = q.where("status", "==", status)
    if tipo:
        q = q.where("tipo", "==", tipo)
    rows = [doc_to_dict(d) for d in q.stream()]
    return sorted(rows, key=lambda x: x.get("fecha", ""), reverse=True)[:limit]


def create_reporte(data: dict) -> dict:
    # Auto-id de Firestore: el autoincremento anterior hacía int() sobre el id de
    # cada documento y ya hay reportes con id autogenerado (no numérico).
    ref = col("reportes").document()
    ref.set(data)
    return {**data, "id": ref.id}
