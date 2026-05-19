"""
APP WEB — Mapa de Candidatos Informales
=======================================
Corre con:  python app.py
Abre en:    http://localhost:8765
"""

import sqlite3, json, math, os
from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
import uvicorn
import pandas as pd

DB = Path("data/procesado/negocios.db")
CRUCE_CSV = Path("data/procesado/cruce_completo.csv")

app = FastAPI(title="Mapa Negocios Informales")


def _db():
    return sqlite3.connect(DB)


def _metricas():
    if not CRUCE_CSV.exists():
        return {}
    df = pd.read_csv(CRUCE_CSV)
    total     = len(df)
    formales  = int(df["match_denue"].sum())
    informales = total - formales
    df_match  = df[df["match_denue"] == True]
    score_prom = round(df_match["fuzzy_score"].mean(), 1) if len(df_match) else 0
    df_dist   = df_match[df_match["distancia_m"] < 9999]
    dist_prom  = round(df_dist["distancia_m"].mean(), 1) if len(df_dist) else 0

    df_inf = df[df["es_informal"] == True]
    tipos_counts = {}
    for tipos in df_inf["tipos"].dropna():
        for t in str(tipos).split(","):
            t = t.strip()
            if t and t not in ("point_of_interest", "establishment", "service"):
                tipos_counts[t] = tipos_counts.get(t, 0) + 1
    top_tipos = sorted(tipos_counts.items(), key=lambda x: -x[1])[:8]

    return {
        "total": total, "formales": formales, "informales": informales,
        "pct_informal": round(informales / total * 100, 1) if total else 0,
        "score_prom": score_prom, "dist_prom_m": dist_prom,
        "top_tipos": top_tipos,
    }


@app.get("/api/candidatos")
def get_candidatos(limit: int = 2000):
    if not DB.exists():
        return {"error": "Corre primero: python cruce.py"}
    conn = _db()
    df = pd.read_sql("SELECT * FROM candidatos LIMIT ?", conn, params=(limit,))
    conn.close()
    return df.to_dict(orient="records")


@app.get("/api/zonas")
def get_zonas():
    """Devuelve las zonas con su probabilidad para el mapa de calor/zonas."""
    ruta_pred = Path("data/procesado/predicciones_zonas.csv")
    if not ruta_pred.exists():
        return []
    df = pd.read_csv(ruta_pred)
    # Solo enviamos lo necesario para no saturar el navegador
    return df[["zona_id", "lat_centro", "lon_centro", "prob_formalizacion", "score_100", "nivel"]].to_dict(orient="records")


@app.get("/api/metricas")
def get_metricas():
    return _metricas()


@app.get("/api/muestra-validacion")
def muestra_validacion():
    if not CRUCE_CSV.exists():
        return {}
    df = pd.read_csv(CRUCE_CSV)
    matches = (
        df[df["match_denue"] == True]
        [["nombre", "nombre_denue", "fuzzy_score", "distancia_m"]]
        .sort_values("fuzzy_score", ascending=False)
        .head(15).to_dict(orient="records")
    )
    no_matches = (
        df[df["es_informal"] == True]
        [["nombre", "tipos", "lat", "lng"]]
        .head(15).to_dict(orient="records")
    )
    return {"matches": matches, "no_matches": no_matches}


HTML = r"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Candidatos Informales — Mérida, Yucatán</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
<style>
*, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
html, body { width:100%; height:100%; overflow:hidden; }
body { font-family:'Inter',sans-serif; background:#0f172a; color:#f1f5f9;
       display:flex; flex-direction:column; }

#header { flex-shrink:0; background:#1e293b; border-bottom:1px solid #334155;
          padding:10px 18px; display:flex; align-items:center; justify-content:space-between; }
#header h1 { font-size:14px; font-weight:700; }
#header p  { font-size:10px; color:#94a3b8; margin-top:2px; }
.badge { background:#dc2626; color:#fff; font-size:12px; font-weight:700;
         padding:4px 12px; border-radius:20px; white-space:nowrap; }

#tabs { flex-shrink:0; background:#1e293b; border-bottom:1px solid #334155;
        display:flex; gap:4px; padding:6px 14px; }
.tab  { padding:5px 14px; border-radius:6px; font-size:12px; font-weight:600;
        cursor:pointer; border:none; background:transparent; color:#94a3b8; }
.tab:hover  { background:#334155; color:#f1f5f9; }
.tab.active { background:#2563eb; color:#fff; }

/* ─── LAYOUT PRINCIPAL ─── */
#shell { display:flex; flex:1; overflow:hidden; }

/* ─── PANEL ─── */
#panel { width:290px; flex-shrink:0; background:#1e293b;
         border-right:1px solid #334155; display:flex; flex-direction:column;
         overflow:hidden; }
.psec  { padding:12px 14px; border-bottom:1px solid #334155; flex-shrink:0; }
.psec h2 { font-size:9px; font-weight:700; text-transform:uppercase;
           letter-spacing:.8px; color:#64748b; margin-bottom:8px; }

.met  { display:flex; justify-content:space-between; align-items:center;
        padding:5px 0; border-bottom:1px solid #0f172a; font-size:11px; }
.met:last-child { border:none; }
.met-l { color:#94a3b8; }
.met-v { font-weight:700; }
.red   { color:#f87171; }
.green { color:#4ade80; }
.yel   { color:#fbbf24; }

.chip  { display:inline-flex; gap:5px; background:#334155; border-radius:4px;
         padding:2px 7px; font-size:10px; color:#94a3b8; margin:2px; }
.chip b { color:#f1f5f9; }

#filtro { width:100%; padding:7px 10px; background:#0f172a; border:1px solid #334155;
          border-radius:6px; color:#f1f5f9; font-size:12px; }
#filtro::placeholder { color:#475569; }

#lista  { flex:1; overflow-y:auto; }
.citem  { padding:9px 14px; border-bottom:1px solid #0f172a; cursor:pointer; }
.citem:hover  { background:#334155; }
.citem.active { background:#1d4ed8; }
.cnom  { font-size:12px; font-weight:600; white-space:nowrap;
         overflow:hidden; text-overflow:ellipsis; }
.ctip  { font-size:10px; color:#64748b; margin-top:2px; }

/* ─── MAPA ─── */
#map-wrap { flex:1; position:relative; }
#map      { position:absolute; inset:0; }

/* ─── VALIDACIÓN ─── */
#val-wrap  { flex:1; overflow-y:auto; padding:20px; display:none; }
.vsec      { margin-bottom:28px; }
.vsec h3   { font-size:13px; font-weight:700; margin-bottom:8px;
             padding-bottom:8px; border-bottom:1px solid #334155; }
.vsec p    { font-size:11px; color:#64748b; margin-bottom:10px; line-height:1.6; }
table      { width:100%; border-collapse:collapse; font-size:11px; }
th { text-align:left; padding:6px 10px; background:#1e293b;
     color:#64748b; font-weight:600; text-transform:uppercase;
     font-size:10px; letter-spacing:.5px; }
td { padding:7px 10px; border-bottom:1px solid #1e293b; color:#cbd5e1; }
tr:hover td { background:#1e293b; }
.sbadge { padding:2px 8px; border-radius:10px; font-weight:700; font-size:10px; }
.sh  { background:rgba(74,222,128,.15); color:#4ade80; }
.sm  { background:rgba(251,191,36,.15);  color:#fbbf24; }

/* popup */
.pbox  { min-width:170px; font-family:'Inter',sans-serif; }
.pnom  { font-weight:700; font-size:13px; color:#1e293b; margin-bottom:4px; }
.ptip  { font-size:11px; color:#64748b; margin-bottom:10px; }
.bnav  { display:block; width:100%; padding:7px 0; border-radius:6px;
         background:#2563eb; color:#fff; text-align:center; text-decoration:none;
         font-size:12px; font-weight:700; margin-bottom:4px; }
.bwaze { display:block; width:100%; padding:7px 0; border-radius:6px;
         background:#0f172a; color:#94a3b8; text-align:center; text-decoration:none;
         font-size:12px; border:1px solid #334155; }
</style>
</head>
<body>

<div id="header">
  <div>
    <h1>🗺️ Candidatos a Negocios Informales — Mérida, Yucatán</h1>
    <p>Negocios en Google Maps que NO aparecen en el padrón DENUE (INEGI)</p>
  </div>
  <div class="badge" id="badge">Cargando…</div>
</div>

<div id="tabs">
  <button class="tab active" onclick="showTab('mapa',this)">🗺️ Mapa</button>
  <button class="tab"        onclick="showTab('val',this)">🔍 Validación</button>
  <button class="tab" id="btn-zonas" onclick="toggleZonas(this)">🔥 Probabilidad</button>
</div>

<div id="shell">

  <!-- panel izquierdo -->
  <div id="panel">
    <div class="psec">
      <h2>Métricas del cruce</h2>
      <div id="mets"><div style="color:#475569;font-size:11px">Cargando…</div></div>
    </div>
    <div class="psec">
      <h2>Tipos detectados</h2>
      <div id="tipos"></div>
    </div>
    <div class="psec">
      <h2>Buscar</h2>
      <input id="filtro" placeholder="Filtrar por nombre…" oninput="filtrar()"/>
    </div>
    <div id="lista"></div>
  </div>

  <!-- mapa -->
  <div id="map-wrap">
    <div id="map"></div>
  </div>

  <!-- validación -->
  <div id="val-wrap">
    <div class="vsec">
      <h3>✅ Matches confirmados — formales encontrados en DENUE</h3>
      <p>Estos negocios SÍ están en Google Maps y SÍ tienen un match en DENUE.<br>
         Score: similitud de nombre (100 = idéntico, &gt;72 = match válido). Distancia: metros entre el punto GMaps y el registro DENUE.</p>
      <table><thead><tr><th>Nombre Maps</th><th>Match DENUE</th><th>Score</th><th>Distancia</th></tr></thead>
      <tbody id="t-match"></tbody></table>
    </div>
    <div class="vsec">
      <h3>🔴 Candidatos informales — revisa manualmente 3 o 4</h3>
      <p>Aparecen como OPERATIONAL en Google Maps pero no encontramos match en DENUE a 50 metros.<br>
         Busca alguno de estos en Google para confirmar que efectivamente no están registrados.</p>
      <table><thead><tr><th>Nombre</th><th>Tipo</th><th>Lat</th><th>Lng</th></tr></thead>
      <tbody id="t-inf"></tbody></table>
    </div>
  </div>

</div><!-- /shell -->

<script>
const TIPOS_ES = {
  restaurant:'Restaurante', food:'Comida', cafe:'Café', bar:'Bar',
  beauty_salon:'Salón de belleza', hair_care:'Peluquería',
  car_repair:'Taller mecánico', car_wash:'Lavado de autos',
  laundry:'Lavandería', store:'Tienda', pharmacy:'Farmacia',
  gym:'Gimnasio', clothing_store:'Ropa', hardware_store:'Ferretería',
  bakery:'Panadería', supermarket:'Supermercado',
  school:'Escuela', doctor:'Médico', dentist:'Dentista',
  manufacturer:'Manufactura', lodging:'Hospedaje',
  event_venue:'Salón de eventos', farm:'Rancho/Granja',
  electrician:'Electricista', plumber:'Plomero',
};
function tipoLeg(tipos){
  if(!tipos) return 'Negocio';
  const arr = tipos.split(',').map(t=>t.trim());
  for(const t of arr) if(TIPOS_ES[t]) return TIPOS_ES[t];
  return arr.find(t=>!['point_of_interest','establishment','service'].includes(t))||'Negocio';
}

/* ── mapa ── */
const map = L.map('map').setView([20.9674,-89.5926],11);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  {attribution:'© OpenStreetMap',maxZoom:19}).addTo(map);

let allData=[], markers=[], markerLayer=null;
let zonasData=[], zonaLayer=null, mostrarZonas=false;

async function cargarCandidatos(){
  const r  = await fetch('/api/candidatos');
  allData  = await r.json();
  document.getElementById('badge').textContent = allData.length+' candidatos';
  renderLista(allData);
  renderMapa(allData);
}

async function toggleZonas(btn) {
  mostrarZonas = !mostrarZonas;
  
  if (mostrarZonas) {
    btn.classList.add('active');
    if (zonasData.length === 0) {
      document.getElementById('badge').textContent = 'Cargando zonas...';
      const r = await fetch('/api/zonas');
      zonasData = await r.json();
      document.getElementById('badge').textContent = allData.length+' candidatos';
    }
    renderZonas();
  } else {
    btn.classList.remove('active');
    if (zonaLayer) map.removeLayer(zonaLayer);
  }
}

function getColor(score) {
  return score > 75 ? '#dc2626' : // Muy alto
         score > 50 ? '#f97316' : // Alto
         score > 25 ? '#eab308' : // Medio
                      '#22c55e';   // Bajo
}

function renderZonas() {
  if (zonaLayer) map.removeLayer(zonaLayer);
  zonaLayer = L.layerGroup().addTo(map);
  
  const dLat = 0.5 / 111.0;
  const dLng = 0.5 / (111.0 * Math.cos(20.9674 * Math.PI / 180));

  zonasData.forEach(z => {
    const lat = z.lat_centro;
    const lng = z.lon_centro;
    const bounds = [[lat - dLat/2, lng - dLng/2], [lat + dLat/2, lng + dLng/2]];
    
    L.rectangle(bounds, {
      color: 'transparent',
      fillColor: getColor(z.score_100),
      fillOpacity: 0.5,
      weight: 0 // Sin bordes para que parezcan bloques sólidos
    }).bindPopup(`<b>Zona ${z.zona_id}</b><br>Score: ${z.score_100}%<br>Potencial: ${z.nivel}`)
      .addTo(zonaLayer);
  });
}

function renderMapa(data){
  if(markerLayer) map.removeLayer(markerLayer);
  markerLayer = L.layerGroup().addTo(map);
  markers = [];
  data.forEach((c,i)=>{
    if(!c.lat||!c.lng) return;
    const gurl = `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`;
    const wurl = `https://waze.com/ul?ll=${c.lat},${c.lng}&navigate=yes`;
    const m = L.circleMarker([c.lat,c.lng],
      {radius:7,color:'#fff',weight:1.5,fillColor:'#dc2626',fillOpacity:.85});
    m.bindPopup(`
      <div class="pbox">
        <div class="pnom">${c.nombre}</div>
        <div class="ptip">${tipoLeg(c.tipos)}</div>
        <a class="bnav"  href="${gurl}" target="_blank">📍 Ir en Google Maps</a>
        <a class="bwaze" href="${wurl}" target="_blank">🚗 Abrir en Waze</a>
      </div>`);
    m.on('click',()=>resaltar(i));
    m.addTo(markerLayer);
    markers.push({marker:m,idx:i});
  });
}

function renderLista(data){
  document.getElementById('lista').innerHTML =
    data.slice(0,200).map((c,i)=>`
      <div class="citem" id="ci-${i}" onclick="irA(${i},${c.lat},${c.lng})">
        <div class="cnom">${c.nombre}</div>
        <div class="ctip">${tipoLeg(c.tipos)}</div>
      </div>`).join('');
}

function filtrar(){
  const q = document.getElementById('filtro').value.toLowerCase();
  renderLista(q ? allData.filter(c=>c.nombre.toLowerCase().includes(q)) : allData);
}

function irA(i,lat,lng){
  document.querySelectorAll('.citem').forEach(e=>e.classList.remove('active'));
  const el=document.getElementById('ci-'+i);
  if(el){el.classList.add('active');el.scrollIntoView({block:'nearest'});}
  map.setView([lat,lng],16);
  const entry=markers.find(m=>m.idx===i);
  if(entry) entry.marker.openPopup();
}
function resaltar(i){
  document.querySelectorAll('.citem').forEach(e=>e.classList.remove('active'));
  const el=document.getElementById('ci-'+i);
  if(el){el.classList.add('active');el.scrollIntoView({block:'nearest'});}
}

/* ── métricas ── */
async function cargarMetricas(){
  const m = await fetch('/api/metricas').then(r=>r.json());
  if(!m.total) return;
  document.getElementById('mets').innerHTML=`
    <div class="met"><span class="met-l">Total analizados</span><span class="met-v">${m.total.toLocaleString()}</span></div>
    <div class="met"><span class="met-l">Candidatos informales</span><span class="met-v red">${m.informales.toLocaleString()}</span></div>
    <div class="met"><span class="met-l">Registrados en DENUE</span><span class="met-v green">${m.formales.toLocaleString()}</span></div>
    <div class="met"><span class="met-l">% sin registro</span><span class="met-v yel">${m.pct_informal}%</span></div>
    <div class="met"><span class="met-l">Score promedio match</span><span class="met-v">${m.score_prom}/100</span></div>
    <div class="met"><span class="met-l">Distancia promedio match</span><span class="met-v">${m.dist_prom_m} m</span></div>`;
  if(m.top_tipos)
    document.getElementById('tipos').innerHTML =
      m.top_tipos.map(([t,n])=>`<span class="chip">${TIPOS_ES[t]||t} <b>${n}</b></span>`).join('');
}

/* ── validación ── */
let valCargada=false;
async function cargarValidacion(){
  if(valCargada) return;
  const d = await fetch('/api/muestra-validacion').then(r=>r.json());
  document.getElementById('t-match').innerHTML=(d.matches||[]).map(m=>`
    <tr><td>${m.nombre}</td><td>${m.nombre_denue||'—'}</td>
    <td><span class="sbadge ${m.fuzzy_score>=85?'sh':'sm'}">${m.fuzzy_score}</span></td>
    <td>${m.distancia_m<9999?m.distancia_m+' m':'—'}</td></tr>`).join('');
  document.getElementById('t-inf').innerHTML=(d.no_matches||[]).map(c=>`
    <tr><td>${c.nombre}</td><td>${tipoLeg(c.tipos)}</td>
    <td>${(c.lat||0).toFixed(5)}</td><td>${(c.lng||0).toFixed(5)}</td></tr>`).join('');
  valCargada=true;
}

/* ── tabs ── */
function showTab(tab,btn){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  const mw=document.getElementById('map-wrap');
  const vw=document.getElementById('val-wrap');
  if(tab==='mapa'){
    mw.style.display=''; vw.style.display='none';
    document.getElementById('panel').style.display='flex';
    setTimeout(()=>map.invalidateSize(),50);
  } else {
    mw.style.display='none'; vw.style.display='block';
    document.getElementById('panel').style.display='none';
    cargarValidacion();
  }
}

cargarCandidatos();
cargarMetricas();
</script>
</body>
</html>"""


@app.get("/", response_class=HTMLResponse)
def index():
    return HTML


if __name__ == "__main__":
    if not DB.exists():
        print("[ERROR] No existe negocios.db — corre primero: python cruce.py")
    else:
        print("=" * 52)
        print("  Mapa de Candidatos Informales — Mérida")
        print("=" * 52)
        print("  >> Abre:  http://localhost:8765")
        print("  Ctrl+C para detener")
        print("=" * 52)
        uvicorn.run("app:app", host="0.0.0.0", port=8765, reload=False)
