"""
PASO 4 — Mapa interactivo con Leaflet.js (OpenStreetMap, 100% gratis)
Incluye:
  - Mapa de calor de potencial de informalidad
  - Rectángulos por zona coloreados por nivel
  - Buscador de coordenadas: ingresa lat/lon o haz clic en el mapa
    → te dice si el negocio es FORMAL (está en DENUE) o INFORMAL
    → muestra el score de la zona y los negocios registrados cercanos
"""

import os, sys, json, math
import pandas as pd

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.config import DATA_PROC, MAPAS_DIR, MERIDA_LAT, MERIDA_LON

_DELTA_LAT = 0.5 / 111.0
_DELTA_LNG = 0.5 / (111.0 * math.cos(math.radians(MERIDA_LAT)))


def _safe(v, default=None):
    try:
        f = float(v)
        return None if (math.isnan(f) or math.isinf(f)) else f
    except Exception:
        return default


def _preparar_zonas(df_pred):
    zonas = []
    for _, z in df_pred.iterrows():
        prob = _safe(z["prob_formalizacion"], 0.0)
        zonas.append({
            "id":      str(z["zona_id"]),
            "lat":     _safe(z["lat_centro"]),
            "lng":     _safe(z["lon_centro"]),
            "prob":    prob,
            "score":   round(_safe(z.get("score_100", prob * 100), 0.0), 1),
            "nivel":   str(z.get("nivel", "N/A")),
            "neg":     int(z["total_negocios"]) if _safe(z.get("total_negocios")) is not None else 0,
        })
    return zonas


def _preparar_denue(df):
    """Compacta el DENUE como lista de arrays [lat, lng, nombre, actividad, año, sector]."""
    filas = []
    for _, n in df.iterrows():
        lat = _safe(n.get("latitud"))
        lng = _safe(n.get("longitud"))
        if lat is None or lng is None:
            continue
        filas.append([
            round(lat, 6),
            round(lng, 6),
            str(n.get("nom_estab", n.get("razon_social", "Negocio")))[:45],
            str(n.get("nombre_act", ""))[:45],
            int(n["año_alta"]) if "año_alta" in n and pd.notna(n.get("año_alta")) else 0,
            str(n.get("sector_2dig", "")),
        ])
    return filas


# ---------------------------------------------------------------------------
# Plantilla HTML
# ---------------------------------------------------------------------------

_HTML = r"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Formalización de Negocios — Mérida</title>

  <!-- Leaflet JS (debe cargar ANTES que el codigo del mapa) -->
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js"></script>
  <script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
  <!-- Leaflet CSS -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <!-- MarkerCluster CSS -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css"/>

  <style>
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Roboto,Arial,sans-serif;background:#111827;display:flex;flex-direction:column;height:100vh}

    /* ── HEADER ── */
    #header{
      flex-shrink:0;height:48px;
      background:rgba(17,24,39,.95);
      border-bottom:1px solid rgba(255,255,255,.08);
      display:flex;align-items:center;justify-content:space-between;
      padding:0 18px;color:#f9fafb;
    }
    #header h1{font-size:14px;font-weight:500}
    #header span{font-size:11px;color:#6b7280}

    /* ── BODY ── */
    #body{flex:1;display:flex;overflow:hidden}

    /* ── PANEL IZQUIERDO ── */
    #panel{
      width:310px;flex-shrink:0;
      background:#1f2937;
      border-right:1px solid rgba(255,255,255,.07);
      display:flex;flex-direction:column;overflow-y:auto;
    }

    .panel-sec{padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.06)}
    .panel-sec h2{font-size:11px;font-weight:700;color:#9ca3af;
                  text-transform:uppercase;letter-spacing:.6px;margin-bottom:10px}

    /* Formulario de búsqueda */
    .inp-row{display:flex;gap:6px;margin-bottom:8px}
    .inp-row input{
      flex:1;background:#374151;border:1px solid #4b5563;
      border-radius:6px;padding:7px 10px;color:#f9fafb;font-size:12px;
    }
    .inp-row input::placeholder{color:#6b7280}
    .btn{
      padding:7px 12px;border-radius:6px;border:none;cursor:pointer;
      font-size:12px;font-weight:600;
    }
    .btn-primary{background:#2563eb;color:#fff}
    .btn-primary:hover{background:#1d4ed8}
    .btn-secondary{background:#374151;color:#d1d5db}
    .btn-secondary:hover{background:#4b5563}
    .btn-full{width:100%;margin-top:4px}

    /* Resultado */
    #resultado{padding:14px 16px}
    .res-zona{
      border-radius:8px;padding:12px 14px;margin-bottom:10px;
      background:#111827;border-left:4px solid #6b7280;
    }
    .res-zona.muy-alto{border-color:#dc2626}
    .res-zona.alto    {border-color:#f97316}
    .res-zona.medio   {border-color:#eab308}
    .res-zona.bajo    {border-color:#22c55e}

    .res-titulo{font-size:13px;font-weight:700;color:#f9fafb;margin-bottom:6px}
    .res-score{font-size:22px;font-weight:800;margin-bottom:4px}
    .muy-alto .res-score{color:#dc2626}
    .alto     .res-score{color:#f97316}
    .medio    .res-score{color:#eab308}
    .bajo     .res-score{color:#22c55e}
    .res-row{display:flex;justify-content:space-between;font-size:11px;
             color:#9ca3af;margin-bottom:3px}
    .res-row span:last-child{color:#e5e7eb;font-weight:500}

    .res-formal{
      border-radius:8px;padding:10px 14px;margin-bottom:6px;
      font-size:12px;
    }
    .res-formal.si{background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.3)}
    .res-formal.no{background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3)}
    .res-formal .badge{
      font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;
      display:inline-block;margin-bottom:6px;
    }
    .badge-formal  {background:rgba(34,197,94,.2);color:#4ade80}
    .badge-informal{background:rgba(239,68,68,.2);color:#f87171}
    .neg-item{
      background:#1a2332;border-radius:6px;padding:8px 10px;
      margin-bottom:5px;font-size:11px;
    }
    .neg-nombre{color:#f9fafb;font-weight:600;margin-bottom:3px}
    .neg-det{color:#9ca3af}

    .recomendacion{
      background:#1a2332;border-radius:8px;padding:10px 14px;
      font-size:11px;color:#d1d5db;line-height:1.6;
    }
    .placeholder{color:#6b7280;font-size:12px;text-align:center;
                  padding:24px 0;line-height:1.7}

    /* ── CONTROLES Y LEYENDA ── */
    .panel-sec label{display:flex;align-items:center;gap:8px;
                      font-size:12px;color:#d1d5db;margin-bottom:6px;cursor:pointer}
    .panel-sec input[type=checkbox]{accent-color:#2563eb;cursor:pointer}

    .ley-row{display:flex;align-items:center;gap:8px;margin-bottom:5px}
    .ley-dot{width:11px;height:11px;border-radius:50%;flex-shrink:0}
    .ley-row span{font-size:11px;color:#9ca3af}

    /* Estadísticas */
    .stat{display:flex;justify-content:space-between;margin-bottom:5px}
    .stat-l{font-size:11px;color:#9ca3af}
    .stat-v{font-size:12px;font-weight:600;color:#f9fafb}
    .stat-v.red{color:#dc2626}
    .stat-v.amb{color:#f97316}

    /* ── MAPA ── */
    #map{flex:1}
  </style>
</head>
<body>

<div id="header">
  <h1>Potencial de Formalizacion de Negocios — Merida, Yucatan</h1>
  <span>DENUE INEGI + OpenStreetMap</span>
</div>

<div id="body">

  <!-- Panel izquierdo -->
  <div id="panel">

    <!-- Buscar coordenadas -->
    <div class="panel-sec">
      <h2>Consultar coordenadas</h2>
      <div class="inp-row">
        <input id="inp-lat" placeholder="Latitud  (20.9674)" type="number" step="any"/>
        <input id="inp-lng" placeholder="Longitud (-89.5926)" type="number" step="any"/>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-primary btn-full" onclick="consultarDesdeForm()">Consultar</button>
        <button class="btn btn-secondary btn-full" id="btn-click" onclick="activarModoClick()">Clic en mapa</button>
      </div>
      <div id="modo-aviso" style="font-size:11px;color:#f97316;margin-top:6px;display:none">
        Haz clic en cualquier punto del mapa...
      </div>
    </div>

    <!-- Resultado -->
    <div id="resultado">
      <div class="placeholder">
        Ingresa coordenadas o haz clic en el mapa<br>para saber si un negocio es formal o informal.
      </div>
    </div>

    <!-- Capas -->
    <div class="panel-sec" style="margin-top:auto">
      <h2>Capas</h2>
      <label><input type="checkbox" id="chk-heat" checked onchange="toggleCapa('heat',this.checked)"> Mapa de calor</label>
      <label><input type="checkbox" id="chk-zonas" checked onchange="toggleCapa('zonas',this.checked)"> Zonas prioritarias</label>
      <label><input type="checkbox" id="chk-neg" checked onchange="toggleCapa('neg',this.checked)"> Negocios DENUE</label>
    </div>

    <!-- Leyenda -->
    <div class="panel-sec">
      <h2>Nivel de potencial</h2>
      <div class="ley-row"><div class="ley-dot" style="background:#dc2626"></div><span>Muy alto (&gt;75%)</span></div>
      <div class="ley-row"><div class="ley-dot" style="background:#f97316"></div><span>Alto (50-75%)</span></div>
      <div class="ley-row"><div class="ley-dot" style="background:#eab308"></div><span>Medio (25-50%)</span></div>
      <div class="ley-row"><div class="ley-dot" style="background:#22c55e"></div><span>Bajo (&lt;25%)</span></div>
    </div>

    <!-- Estadísticas -->
    <div class="panel-sec">
      <h2>Resumen ciudad</h2>
      <div class="stat"><span class="stat-l">Zonas analizadas</span>   <span class="stat-v">__TOTAL_ZONAS__</span></div>
      <div class="stat"><span class="stat-l">Zonas prioritarias</span> <span class="stat-v red">__ZONAS_ALTAS__</span></div>
      <div class="stat"><span class="stat-l">Score promedio</span>     <span class="stat-v amb">__SCORE_PROM__%</span></div>
      <div class="stat"><span class="stat-l">Score maximo</span>       <span class="stat-v red">__SCORE_MAX__%</span></div>
      <div class="stat"><span class="stat-l">Negocios DENUE</span>     <span class="stat-v">__TOTAL_NEG__</span></div>
    </div>

  </div><!-- /panel -->

  <!-- Mapa -->
  <div id="map"></div>

</div><!-- /body -->

<script>
/* ── Datos ── */
const ZONAS  = __ZONAS_JSON__;
const DENUE  = __DENUE_JSON__;   // [lat, lng, nombre, actividad, año, sector]
const DELTA_LAT = __DELTA_LAT__;
const DELTA_LNG = __DELTA_LNG__;
const SECT_INF  = ["46","72","81","56","43","49"];

/* ── Mapa Leaflet ── */
const map = L.map('map').setView([__MERIDA_LAT__, __MERIDA_LNG__], 12);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
  maxZoom: 19
}).addTo(map);

/* ── Capas ── */
let heatLayer, zonasLayer, negLayer;
let markerConsulta = null;

/* Heatmap */
const heatData = ZONAS
  .filter(z => z.prob > 0 && z.lat && z.lng)
  .map(z => [z.lat, z.lng, z.prob]);
heatLayer = L.heatLayer(heatData, {radius:35, blur:25, maxZoom:16,
  gradient:{'0.2':'blue','0.4':'cyan','0.6':'lime','0.8':'orange','1.0':'red'}
}).addTo(map);

/* Zonas (rectángulos) */
zonasLayer = L.layerGroup();
const ZONAS_ALTAS = ZONAS.filter(z => z.prob >= 0.5);
ZONAS_ALTAS.forEach(z => {
  const c = nivelColor(z.prob);
  const r = L.rectangle([
    [z.lat - DELTA_LAT/2, z.lng - DELTA_LNG/2],
    [z.lat + DELTA_LAT/2, z.lng + DELTA_LNG/2]
  ], {color:c, weight:1.5, fillColor:c, fillOpacity:.2}).addTo(zonasLayer);
  r.on('click', () => consultarCoordenadas(z.lat, z.lng));
});
zonasLayer.addTo(map);

/* Negocios DENUE */
negLayer = L.markerClusterGroup({maxClusterRadius:40});
DENUE.forEach(n => {
  const m = L.circleMarker([n[0], n[1]], {
    radius:4, color:'#fff', weight:1,
    fillColor:'#3b82f6', fillOpacity:.8
  });
  m.bindTooltip(`<b>${n[2]}</b><br>${n[3]}`, {direction:'top'});
  m.on('click', () => consultarCoordenadas(n[0], n[1]));
  negLayer.addLayer(m);
});
negLayer.addTo(map);

/* ── Clic en mapa ── */
let modoClick = false;
function activarModoClick() {
  modoClick = true;
  document.getElementById('modo-aviso').style.display = 'block';
  document.getElementById('btn-click').textContent = 'Cancelar';
  document.getElementById('btn-click').onclick = desactivarModoClick;
  map.getContainer().style.cursor = 'crosshair';
}
function desactivarModoClick() {
  modoClick = false;
  document.getElementById('modo-aviso').style.display = 'none';
  document.getElementById('btn-click').textContent = 'Clic en mapa';
  document.getElementById('btn-click').onclick = activarModoClick;
  map.getContainer().style.cursor = '';
}
map.on('click', e => {
  if (!modoClick) return;
  desactivarModoClick();
  consultarCoordenadas(e.latlng.lat, e.latlng.lng);
});

/* ── Toggle capas ── */
function toggleCapa(capa, v) {
  if (capa==='heat')  v ? heatLayer.addTo(map)  : map.removeLayer(heatLayer);
  if (capa==='zonas') v ? zonasLayer.addTo(map) : map.removeLayer(zonasLayer);
  if (capa==='neg')   v ? negLayer.addTo(map)   : map.removeLayer(negLayer);
}

/* ── Consulta desde formulario ── */
function consultarDesdeForm() {
  const lat = parseFloat(document.getElementById('inp-lat').value);
  const lng = parseFloat(document.getElementById('inp-lng').value);
  if (isNaN(lat) || isNaN(lng)) {
    alert('Ingresa latitud y longitud validas.');
    return;
  }
  consultarCoordenadas(lat, lng);
}

/* ── Consulta principal ── */
function consultarCoordenadas(lat, lng) {
  document.getElementById('inp-lat').value = lat.toFixed(6);
  document.getElementById('inp-lng').value = lng.toFixed(6);

  /* Marcador en el mapa */
  if (markerConsulta) map.removeLayer(markerConsulta);
  markerConsulta = L.marker([lat, lng], {
    icon: L.divIcon({className:'', html:
      '<div style="width:14px;height:14px;border-radius:50%;'
     +'background:#facc15;border:2px solid #fff;'
     +'box-shadow:0 0 6px rgba(0,0,0,.5)"></div>',
      iconAnchor:[7,7]})
  }).addTo(map);
  map.panTo([lat, lng]);

  /* Buscar zona */
  const zona = ZONAS.find(z =>
    z.lat != null && z.lng != null &&
    Math.abs(z.lat - lat) <= DELTA_LAT/2 &&
    Math.abs(z.lng - lng) <= DELTA_LNG/2
  );

  /* Buscar DENUE en radio 100m */
  const cercanos = buscarEnDenue(lat, lng, 100)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 5);

  mostrarResultado(lat, lng, zona, cercanos);
}

/* ── Haversine ── */
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2-lat1)*Math.PI/180;
  const dLng = (lng2-lng1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function buscarEnDenue(lat, lng, radioM) {
  const dLat = (radioM/6371000)*(180/Math.PI);
  const dLng = dLat/Math.cos(lat*Math.PI/180);
  return DENUE
    .filter(n => Math.abs(n[0]-lat)<=dLat && Math.abs(n[1]-lng)<=dLng)
    .map(n => ({lat:n[0], lng:n[1], nombre:n[2], actividad:n[3],
                año:n[4], sector:n[5], dist:haversine(lat,lng,n[0],n[1])}))
    .filter(n => n.dist <= radioM);
}

/* ── Colores ── */
function nivelColor(prob) {
  if (prob>=.75) return '#dc2626';
  if (prob>=.5)  return '#f97316';
  if (prob>=.25) return '#eab308';
  return '#22c55e';
}
function nivelClase(nivel) {
  return {
    'Muy alto':'muy-alto','Alto':'alto',
    'Medio':'medio','Bajo':'bajo'
  }[nivel] || 'bajo';
}

/* ── Render resultado ── */
function mostrarResultado(lat, lng, zona, cercanos) {
  const div = document.getElementById('resultado');

  let html = '';

  /* --- Zona --- */
  if (zona) {
    const cls = nivelClase(zona.nivel);
    html += `
    <div class="res-zona ${cls}">
      <div class="res-titulo">Zona ${zona.id}</div>
      <div class="res-score">${zona.score.toFixed(1)}%</div>
      <div class="res-row"><span>Nivel</span><span>${zona.nivel}</span></div>
      <div class="res-row"><span>Negocios formales en zona</span><span>${zona.neg}</span></div>
      <div class="res-row"><span>Coordenadas</span><span>${lat.toFixed(5)}, ${lng.toFixed(5)}</span></div>
    </div>`;
  } else {
    html += `<div class="res-zona bajo">
      <div class="res-titulo">Fuera del area de analisis</div>
      <div style="font-size:11px;color:#9ca3af">Valido: lat 20.85-21.15, lon -89.78 a -89.45</div>
    </div>`;
  }

  /* --- Registro DENUE --- */
  if (cercanos.length > 0) {
    html += `<div class="res-formal si">
      <span class="badge badge-formal">FORMAL — Registrado en DENUE</span><br>
      ${cercanos.map(n => `
        <div class="neg-item">
          <div class="neg-nombre">${n.nombre}</div>
          <div class="neg-det">${n.actividad}</div>
          <div class="neg-det">Registro: ${n.año || 'N/D'} &nbsp;|&nbsp; ${Math.round(n.dist)} m</div>
        </div>`).join('')}
    </div>`;
  } else {
    html += `<div class="res-formal no">
      <span class="badge badge-informal">NO registrado en DENUE — Posiblemente INFORMAL</span>
      <div style="color:#fca5a5;font-size:11px;margin-top:4px">
        No se encontraron negocios registrados ante INEGI en 100 m a la redonda.
      </div>
    </div>`;
  }

  /* --- Recomendacion --- */
  if (zona) {
    const rec = {
      'Muy alto': 'Zona CRITICA. Alta prioridad para programas de regularizacion y acompanamiento empresarial.',
      'Alto':     'Zona de ALTO potencial. Muchos negocios sin registro formal. Candidata para intervencion.',
      'Medio':    'Zona MIXTA. Actividad informal moderada. Difusion de beneficios de formalizacion.',
      'Bajo':     'Zona con baja informalidad estimada. La mayoria de negocios estan formalizados.',
    }[zona.nivel] || '';
    html += `<div class="recomendacion" style="margin-top:8px">${rec}</div>`;
  }

  div.innerHTML = html;
}
</script>


</body>
</html>"""


def _generar_html(zonas, denue, stats):
    return (
        _HTML
        .replace("__ZONAS_JSON__",  json.dumps(zonas,  ensure_ascii=False))
        .replace("__DENUE_JSON__",  json.dumps(denue,  ensure_ascii=False))
        .replace("__DELTA_LAT__",   str(round(_DELTA_LAT, 8)))
        .replace("__DELTA_LNG__",   str(round(_DELTA_LNG, 8)))
        .replace("__MERIDA_LAT__",  str(MERIDA_LAT))
        .replace("__MERIDA_LNG__",  str(MERIDA_LON))
        .replace("__TOTAL_ZONAS__", f"{stats['total_zonas']:,}")
        .replace("__ZONAS_ALTAS__", f"{stats['zonas_altas']:,}")
        .replace("__SCORE_PROM__",  f"{stats['score_prom']:.1f}")
        .replace("__SCORE_MAX__",   f"{stats['score_max']:.1f}")
        .replace("__TOTAL_NEG__",   f"{stats['total_neg']:,}")
    )


def crear_mapa_completo():
    ruta_pred  = os.path.join(DATA_PROC, "predicciones_zonas.csv")
    ruta_denue = os.path.join(DATA_PROC, "denue_merida_limpio.csv")
    ruta_feats = os.path.join(DATA_PROC, "features_zonas.csv")

    if not os.path.exists(ruta_pred):
        print("[ERROR] No hay predicciones. Ejecuta: python main.py")
        return None

    df_pred = pd.read_csv(ruta_pred)

    # Merge con features para tener total_negocios por zona
    if os.path.exists(ruta_feats):
        df_feats = pd.read_csv(ruta_feats, usecols=["zona_id", "total_negocios"])
        df_pred = df_pred.merge(df_feats, on="zona_id", how="left")

    zonas = _preparar_zonas(df_pred)

    df_denue = pd.read_csv(ruta_denue, low_memory=False) if os.path.exists(ruta_denue) else pd.DataFrame()
    denue    = _preparar_denue(df_denue)

    print(f"  Zonas: {len(zonas):,}")
    print(f"  Negocios DENUE embebidos: {len(denue):,}")

    stats = {
        "total_zonas":  len(zonas),
        "zonas_altas":  sum(1 for z in zonas if z["prob"] >= 0.5),
        "score_prom":   df_pred["prob_formalizacion"].mean() * 100,
        "score_max":    df_pred["prob_formalizacion"].max() * 100,
        "total_neg":    len(denue),
    }

    html = _generar_html(zonas, denue, stats)

    os.makedirs(MAPAS_DIR, exist_ok=True)
    ruta_salida = os.path.join(MAPAS_DIR, "mapa_formalizacion_merida.html")
    with open(ruta_salida, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"\n[OK] Mapa guardado: {ruta_salida}")

    print("\n=== RESUMEN ===")
    if "nivel" in df_pred.columns:
        print(df_pred["nivel"].value_counts().to_string())
    print(f"\nScore promedio: {stats['score_prom']:.1f}%")
    print(f"Score maximo  : {stats['score_max']:.1f}%")

    return ruta_salida


if __name__ == "__main__":
    crear_mapa_completo()
