import html
import json
import math
import urllib.request
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Body
from fastapi.responses import Response

from backend.core.cache import get_candidatos
from backend.core.firebase import fdb
from backend.core.helpers import haversine

router = APIRouter()


# ── OSRM + TSP ────────────────────────────────────────────────────────────────

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
    """Nearest-Neighbor TSP heuristic."""
    if len(pts) <= 2:
        return pts
    unvisited = list(pts)
    path      = [unvisited.pop(0)]
    while unvisited:
        last = path[-1]
        nxt  = min(unvisited, key=lambda p: (last[0] - p[0]) ** 2 + (last[1] - p[1]) ** 2)
        unvisited.remove(nxt)
        path.append(nxt)
    return path


def _build_route(selected):
    pts = [(float(c["lat"]), float(c["lng"]), c)
           for c in selected if c.get("lat") and c.get("lng")]
    if len(pts) < 2:
        raise HTTPException(400, "Se necesitan al menos 2 puntos con coordenadas")
    ordered    = _tsp_nn(pts)
    coords     = [(lat, lng) for lat, lng, _ in ordered]
    osrm       = _osrm_route(coords)
    if osrm and osrm.get("routes"):
        r          = osrm["routes"][0]
        geometry   = r["geometry"]
        dist_km    = round(r["distance"] / 1000, 2)
        tiempo_min = round(r["duration"] / 60)
    else:
        geometry   = {"type": "LineString",
                      "coordinates": [[lng, lat] for lat, lng, _ in ordered]}
        dist_km    = round(sum(
            math.sqrt((ordered[i][0] - ordered[i-1][0]) ** 2 +
                      (ordered[i][1] - ordered[i-1][1]) ** 2) * 111
            for i in range(1, len(ordered))), 2)
        tiempo_min = max(1, round(dist_km / 40 * 60))
    return {
        "geometry":            geometry,
        "waypoints_ordenados": [{**meta, "lat": lat, "lng": lng}
                                for lat, lng, meta in ordered],
        "distancia_km":        dist_km,
        "tiempo_min":          tiempo_min,
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/api/ruta")
def calcular_ruta(body: dict = Body(...)):
    place_ids     = body.get("place_ids", [])
    negocios_hint = {n["negocio_id"]: n
                     for n in body.get("negocios_hint", []) if n.get("negocio_id")}

    if len(place_ids) < 2:
        raise HTTPException(400, "Se necesitan al menos 2 puntos")

    id_set   = set(place_ids)
    cand_map = {c["place_id"]: c for c in get_candidatos() if c.get("place_id") in id_set}

    selected    = []
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
    result                = _build_route(selected)
    result["descartados"] = descartados
    return result


@router.post("/api/ruta-colonia")
def ruta_colonia(body: dict = Body(...)):
    colonia = (body.get("colonia") or body.get("colonia_id") or "").strip()
    limite  = min(int(body.get("limite", 20)), 20)
    if not colonia:
        raise HTTPException(400, "colonia requerido")
    en_zona = [c for c in get_candidatos()
               if (c.get("colonia_nombre") or c.get("colonia_denue") or "").upper()
               == str(colonia).upper()][:limite]
    if not en_zona:
        raise HTTPException(404, "Sin candidatos en esta colonia")
    return _build_route(en_zona)


@router.post("/api/reporte-visita")
def reporte_visita(body: dict = Body(...)):
    place_ids  = body.get("place_ids", [])
    fecha      = body.get("fecha_visita", datetime.now().strftime("%Y-%m-%d"))
    campana_id = body.get("campana_id")
    id_set     = set(place_ids)

    # Leer datos de visita directo de Firestore si se envió campana_id
    visita_data = {}
    if campana_id and fdb:
        nds = list(fdb.collection("campanas").document(str(campana_id))
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
    for c in get_candidatos():
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
        fecha_span = (f'<br><span style="font-size:10px;color:#94a3b8">{fecha_vis}</span>'
                      if fecha_vis else "")
        filas += (
            f"<tr>"
            f"<td style='font-weight:600'>{html.escape(c.get('nombre', '') or '')}</td>"
            f"<td style='color:#64748b;font-size:12px'>{html.escape(c.get('direccion', '') or '')}</td>"
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
