from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from pathlib import Path
import os
import db.firestore as fs
from db.database import ROOT

router = APIRouter()

GMAPS_KEY     = os.environ.get("GOOGLE_MAPS_API_KEY", "")
# Plantilla opcional del reporte de visita; el código tolera su ausencia.
TEMPLATE_PATH = ROOT / "backend" / "templates" / "reporte_visita.html"


# ── Modelo ────────────────────────────────────────────────────────────────────

class ReporteVisitaBody(BaseModel):
    place_ids:    List[str]          = Field(..., description="Lista de place_ids de los negocios a incluir en el reporte")
    fecha_visita: Optional[str]      = Field(None, description="Fecha de la visita (YYYY-MM-DD). Si no se envía, se usa la fecha actual.")
    visita_data:  Optional[dict]     = Field(None, description="Mapa negocio_id → {completado, notas, visita_datos} de la campaña")


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post(
    "/api/reporte-visita",
    response_class=HTMLResponse,
    summary="Generar reporte HTML de visita de campo",
    description="""
Genera un reporte HTML imprimible con los datos de los negocios a visitar.

**Incluye por cada negocio:**
- Nombre y tipo de negocio
- Coordenadas GPS (lat/lng)
- Estado de formalización (informal / en proceso / formal)
- Foto de fachada vía Google Street View (requiere `GOOGLE_MAPS_API_KEY` en `.env`)
- Enlace directo a Google Maps para navegación

**Descarga:** el archivo se retorna con header `Content-Disposition: attachment`
para que el navegador lo descargue automáticamente como `reporte_visita.html`.

**Sin clave de Maps:** si no hay `GOOGLE_MAPS_API_KEY` configurada en `.env`,
las fotos de fachada aparecerán como un placeholder con las coordenadas.

**Cómo usarlo:** en la pestaña Ruta, después de calcular una ruta,
aparece el botón "📄 Descargar reporte de visita" que llama este endpoint.
""",
    responses={
        404: {"description": "Ninguno de los place_ids enviados existe en la base de datos"},
    },
)
def generar_reporte_visita(body: ReporteVisitaBody):
    if not body.place_ids:
        raise HTTPException(status_code=400, detail="Debes enviar al menos un place_id")

    rows = fs.get_candidatos_by_place_ids(body.place_ids)
    if not rows:
        raise HTTPException(status_code=404, detail="No se encontraron negocios con esos place_ids")

    fecha    = body.fecha_visita or datetime.utcnow().strftime("%Y-%m-%d")
    negocios = rows

    # Merge campaign visit data if provided
    if body.visita_data:
        for n in negocios:
            vd = body.visita_data.get(n.get("place_id", ""), {})
            n["completado"]   = vd.get("completado", False)
            n["notas"]        = vd.get("notas", "")
            n["visita_datos"] = vd.get("visita_datos", {})

    # Enriquecer con Street View URL y Google Maps link
    for n in negocios:
        lat, lng = n.get("lat"), n.get("lng")
        if lat and lng and GMAPS_KEY:
            n["street_view_url"] = (
                f"https://maps.googleapis.com/maps/api/streetview"
                f"?size=400x200&location={lat},{lng}&key={GMAPS_KEY}"
            )
        else:
            n["street_view_url"] = None
        n["maps_url"] = f"https://www.google.com/maps?q={lat},{lng}" if lat else "#"
        n["tipo_label"] = {"informal": "🔴 Informal", "en_proceso": "🟠 En proceso", "formal": "🟢 Formal"}.get(
            n.get("tipo", "informal"), "🔴 Informal"
        )
        # Traducir tipo de negocio
        TIPOS_ES = {
            "restaurant": "Restaurante", "food": "Comida", "cafe": "Café", "bar": "Bar",
            "beauty_salon": "Salón de belleza", "car_repair": "Taller mecánico",
            "store": "Tienda", "pharmacy": "Farmacia", "bakery": "Panadería",
        }
        tipos_raw = str(n.get("tipos") or "")
        tipos_arr  = [t.strip() for t in tipos_raw.split(",")]
        n["tipo_negocio"] = next(
            (TIPOS_ES[t] for t in tipos_arr if t in TIPOS_ES),
            tipos_arr[0] if tipos_arr and tipos_arr[0] not in ("point_of_interest", "establishment") else "Negocio",
        )

    html = _render_template(negocios, fecha)
    return HTMLResponse(
        content=html,
        headers={"Content-Disposition": "attachment; filename=reporte_visita.html"},
    )


# ── Renderizado del template ──────────────────────────────────────────────────

def _render_template(negocios: list, fecha: str) -> str:
    """Renderiza el reporte usando Jinja2 si el template existe, o HTML inline."""
    if TEMPLATE_PATH.exists():
        try:
            from jinja2 import Environment, FileSystemLoader
            env  = Environment(loader=FileSystemLoader(str(TEMPLATE_PATH.parent)))
            tmpl = env.get_template(TEMPLATE_PATH.name)
            return tmpl.render(
                negocios=negocios,
                fecha=fecha,
                generado_en=datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
            )
        except Exception:
            pass  # fallback al HTML inline

    # ── HTML inline (fallback sin Jinja2) ────────────────────────────────────
    cards = ""
    for i, n in enumerate(negocios, 1):
        lat_val = n.get("lat", "")
        lng_val = n.get("lng", "")
        lat_str = f"{lat_val:.5f}" if isinstance(lat_val, (int, float)) else str(lat_val)
        lng_str = f"{lng_val:.5f}" if isinstance(lng_val, (int, float)) else str(lng_val)

        sv = (f'<img src="{n["street_view_url"]}" alt="Fachada" style="width:100%;border-radius:6px;margin-bottom:8px">'
              if n["street_view_url"]
              else f'<div style="background:#f1f5f9;border-radius:6px;padding:20px;text-align:center;color:#64748b;font-size:12px;margin-bottom:8px">📷 Fachada no disponible<br><small>{lat_str}, {lng_str}</small></div>')

        # Status badge
        if n.get("completado"):
            status_badge = '<div style="font-size:11px;font-weight:700;padding:2px 10px;border-radius:20px;background:#dcfce7;color:#16a34a">✓ Visitado</div>'
        else:
            status_badge = '<div style="font-size:11px;font-weight:700;padding:2px 10px;border-radius:20px;background:#f1f5f9;color:#94a3b8">Pendiente</div>'

        # Notes content
        notas_val = n.get("notas", "")
        if notas_val:
            notes_html = f'<div style="font-size:12px;color:#334155;padding:8px 10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;white-space:pre-wrap">{notas_val}</div>'
        else:
            notes_html = '<div style="height:40px;border:1px dashed #e2e8f0;border-radius:4px"></div>'

        # Tipo label colors
        tipo_label = n["tipo_label"]
        if "Informal" in tipo_label:
            lbl_bg, lbl_color = "#fee2e2", "#dc2626"
        elif "proceso" in tipo_label:
            lbl_bg, lbl_color = "#fef9c3", "#ca8a04"
        else:
            lbl_bg, lbl_color = "#dcfce7", "#16a34a"

        # Extra visit fields from plantilla
        visita_datos = n.get("visita_datos") or {}
        extra_rows = ""
        if visita_datos:
            rows_html = "".join(
                f'<div style="display:flex;gap:8px;font-size:11px;padding:4px 0;border-bottom:1px solid #f1f5f9">'
                f'<span style="color:#94a3b8;min-width:120px">{k}</span>'
                f'<span style="color:#334155;font-weight:600">{v}</span></div>'
                for k, v in visita_datos.items() if v not in (None, "", False)
            )
            if rows_html:
                extra_rows = f'<div style="margin-top:10px;border-top:1px solid #f1f5f9;padding-top:10px">{rows_html}</div>'

        cards += f"""
        <div style="border:1px solid #e2e8f0;border-radius:10px;padding:18px;margin-bottom:16px;break-inside:avoid">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
            <div>
              <div style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:1px">Parada {i}</div>
              <div style="font-size:18px;font-weight:700;color:#0f172a;margin:4px 0">{n['nombre']}</div>
              <div style="font-size:13px;color:#64748b">{n['tipo_negocio']}</div>
            </div>
            <div style="background:{lbl_bg};padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;color:{lbl_color}">
              {tipo_label}
            </div>
          </div>
          {sv}
          <div style="display:flex;gap:12px;font-size:11px;color:#64748b">
            <span>📍 {lat_str}, {lng_str}</span>
            <a href="{n['maps_url']}" style="color:#2563eb;text-decoration:none">Ver en Google Maps →</a>
          </div>
          <div style="margin-top:12px;border-top:1px solid #f1f5f9;padding-top:12px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
              <div style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase">Notas de visita</div>
              {status_badge}
            </div>
            {notes_html}
          </div>
          {extra_rows}
        </div>"""

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Reporte de Visita — {fecha}</title>
<style>
  * {{ margin:0; padding:0; box-sizing:border-box; }}
  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background:#fff; color:#0f172a; padding:32px; max-width:800px; margin:0 auto; }}
  @media print {{
    body {{ padding:0; }}
    .no-print {{ display:none; }}
  }}
</style>
</head>
<body>
  <div style="border-bottom:2px solid #0f172a;padding-bottom:16px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:flex-end">
    <div>
      <div style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:1px">Municipio de Mérida — Inspección de Informalidad</div>
      <div style="font-size:24px;font-weight:800;margin:4px 0">Reporte de Visita de Campo</div>
      <div style="font-size:13px;color:#64748b">Fecha: {fecha} · {len(negocios)} negocio(s)</div>
    </div>
    <button class="no-print" onclick="window.print()"
            style="padding:8px 18px;background:#0f172a;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px">
      🖨️ Imprimir
    </button>
  </div>
  {cards}
  <div style="margin-top:24px;font-size:10px;color:#94a3b8;text-align:center;border-top:1px solid #e2e8f0;padding-top:12px">
    Generado el {datetime.utcnow().strftime("%Y-%m-%d %H:%M")} UTC — Sistema de Geolocalización de Informalidad, Mérida, Yucatán
  </div>
</body>
</html>"""
