/* ══════════════════════════════════════════════════════════════════════════
   app.js — Mapa de Candidatos Informales, Mérida, Yucatán
   ══════════════════════════════════════════════════════════════════════════ */

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

// Color del marcador según tipo de formalización
function tipoColor(tipo){
  if(tipo === 'formal')     return '#22c55e';
  if(tipo === 'en_proceso') return '#f97316';
  return '#dc2626'; // informal (default)
}

/* ── Mapa base ───────────────────────────────────────────────────────────── */
const map = L.map('map').setView([20.9674,-89.5926],11);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  {attribution:'© OpenStreetMap',maxZoom:19}).addTo(map);

let allData=[], markers=[], markerLayer=null;
let _rutaData=[];            // Todos los candidatos para la pestaña Ruta (sin filtro de colonia)
let _zonasCsvData=[], zonaLayer=null, mostrarZonas=false;
let filtroTipoActual = null;

/* ── Candidatos ──────────────────────────────────────────────────────────── */
async function cargarCandidatos(colonia=null, tipo=null){
  let url = '/api/candidatos?limit=2000';
  if(colonia) url += `&colonia=${encodeURIComponent(colonia)}`;
  if(tipo)    url += `&tipo=${tipo}`;
  const r = await fetch(url);
  allData = await r.json();
  document.getElementById('badge').textContent = allData.length+' candidatos';
  renderLista(allData);
  renderMapa(allData);
}

function renderMapa(data){
  if(markerLayer) map.removeLayer(markerLayer);
  markerLayer = L.layerGroup().addTo(map);
  markers = [];
  data.forEach((c,i)=>{
    if(!c.lat||!c.lng) return;
    const color = tipoColor(c.tipo || 'informal');
    const gurl  = `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`;
    const wurl  = `https://waze.com/ul?ll=${c.lat},${c.lng}&navigate=yes`;
    const m = L.circleMarker([c.lat,c.lng],
      {radius:7,color:'#fff',weight:1.5,fillColor:color,fillOpacity:.85});

    m.bindPopup(`
      <div class="pbox">
        <div class="pnom">${c.nombre}</div>
        <div class="ptip">${tipoLeg(c.tipos)}</div>
        <div class="ptipo-row">
          <select id="tipo-sel-${c.place_id}">
            <option value="informal"   ${(c.tipo||'informal')==='informal'   ?'selected':''}>🔴 Informal</option>
            <option value="en_proceso" ${(c.tipo||'')==='en_proceso'?'selected':''}>🟠 En proceso</option>
            <option value="formal"     ${(c.tipo||'')==='formal'    ?'selected':''}>🟢 Formal</option>
          </select>
          <button onclick="guardarTipo('${c.place_id}', ${i})">Guardar</button>
        </div>
        <a class="bnav"  href="${gurl}" target="_blank">📍 Ir en Google Maps</a>
        <a class="bwaze" href="${wurl}" target="_blank">🚗 Abrir en Waze</a>
      </div>`);
    m.on('click',()=>resaltar(i));
    m.addTo(markerLayer);
    markers.push({marker:m,idx:i,data:c});
  });
}

async function guardarTipo(placeId, idx){
  const sel  = document.getElementById(`tipo-sel-${placeId}`);
  const tipo = sel.value;
  const resp = await fetch(`/api/candidatos/${placeId}/tipo`, {
    method:'PATCH', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({tipo}),
  });
  const d = await resp.json();
  if(d.ok){
    // actualizar datos en memoria y re-colorear marker
    const entry = markers.find(m=>m.data.place_id===placeId);
    if(entry){
      entry.data.tipo = tipo;
      entry.marker.setStyle({fillColor: tipoColor(tipo)});
    }
    allData[idx] = {...allData[idx], tipo};
  }
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
  const filtered = q ? allData.filter(c=>c.nombre.toLowerCase().includes(q)) : allData;
  renderLista(filtered);
  renderMapa(filtered);
}

function filtrarPorTipo(tipo, btn){
  document.querySelectorAll('.tipo-filters button').forEach(b=>b.classList.remove('active'));
  if(filtroTipoActual === tipo){
    filtroTipoActual = null;
    cargarCandidatos(coloniaActual || null);
  } else {
    filtroTipoActual = tipo;
    btn.classList.add('active');
    cargarCandidatos(coloniaActual || null, tipo);
  }
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

/* ── Zonas de predicción ─────────────────────────────────────────────────── */
async function toggleZonas(btn) {
  mostrarZonas = !mostrarZonas;
  if (mostrarZonas) {
    btn.classList.add('active');
    if (_zonasCsvData.length === 0) {
      const r = await fetch('/api/predicciones');
      _zonasCsvData = await r.json();
    }
    renderZonas();
    _renderLeyendaZonas();
  } else {
    btn.classList.remove('active');
    if (zonaLayer) map.removeLayer(zonaLayer);
    _renderLeyendaZonas(); // quita la leyenda
  }
}

function getColor(score) {
  return score > 75 ? '#dc2626' : score > 50 ? '#f97316' : score > 25 ? '#eab308' : '#22c55e';
}

function renderZonas() {
  if (zonaLayer) map.removeLayer(zonaLayer);
  zonaLayer = L.layerGroup().addTo(map);
  const dLat = 0.5 / 111.0;
  const dLng = 0.5 / (111.0 * Math.cos(20.9674 * Math.PI / 180));
  _zonasCsvData.forEach(z => {
    const bounds = [[z.lat_centro-dLat/2, z.lon_centro-dLng/2],
                    [z.lat_centro+dLat/2, z.lon_centro+dLng/2]];
    const color = getColor(z.score_100);
    L.rectangle(bounds, {
      color: color,
      weight: 0.5,
      fillColor: color,
      fillOpacity: 0.45,
    })
      .bindPopup(`
        <div style="font-family:'Inter',sans-serif;min-width:140px">
          <div style="font-weight:700;font-size:13px;margin-bottom:4px">Zona ${z.zona_id}</div>
          <div style="font-size:12px;color:#334155">
            🎯 Probabilidad: <b>${Math.round(z.score_100)}%</b>
          </div>
          <div style="font-size:12px;color:#334155">
            📊 Nivel: <b>${z.nivel}</b>
          </div>
        </div>`)
      .addTo(zonaLayer);
  });
}

function _renderLeyendaZonas() {
  // Leyenda dinámica de probabilidad (solo visible cuando la capa está activa)
  const existing = document.getElementById('leyenda-zonas');
  if (existing) { existing.remove(); return; }
  const ley = document.createElement('div');
  ley.id = 'leyenda-zonas';
  ley.style.cssText = `
    position:absolute;bottom:60px;right:12px;z-index:900;
    background:rgba(15,23,42,.88);border-radius:10px;padding:10px 14px;
    font-family:'Inter',sans-serif;font-size:11px;color:#f1f5f9;
    backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.08);
    pointer-events:none;
  `;
  ley.innerHTML = `
    <div style="font-weight:700;margin-bottom:6px;font-size:10px;text-transform:uppercase;letter-spacing:.6px;color:#94a3b8">
      Prob. de informalidad
    </div>
    ${[['#dc2626','>75% Alto'],['#f97316','50–75% Medio-alto'],['#eab308','25–50% Medio'],['#22c55e','<25% Bajo']]
      .map(([c,l])=>`<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
        <span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${c};opacity:.85"></span>
        <span>${l}</span>
      </div>`).join('')}
  `;
  document.getElementById('map-wrap').appendChild(ley);
}

/* ── Métricas ────────────────────────────────────────────────────────────── */
async function cargarMetricas(){
  const m = await fetch('/api/metricas').then(r=>r.json());
  if(!m.total) return;
  document.getElementById('mets').innerHTML=`
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-label">Total</div>
        <div class="stat-value">${m.total.toLocaleString()}</div>
      </div>
      <div class="stat-card orange">
        <div class="stat-label">Sin reg.</div>
        <div class="stat-value">${m.pct_informal}%</div>
      </div>
      <div class="stat-card green">
        <div class="stat-label">Formales</div>
        <div class="stat-value">${m.formales.toLocaleString()}</div>
      </div>
      <div class="stat-card red">
        <div class="stat-label">Informales</div>
        <div class="stat-value">${m.informales.toLocaleString()}</div>
      </div>
    </div>
    <div style="margin-top:10px">
      <div class="met"><span class="met-l">Score prom. match</span><span class="met-v">${m.score_prom}/100</span></div>
      <div class="met"><span class="met-l">Dist. prom. match</span><span class="met-v">${m.dist_prom_m} m</span></div>
    </div>`;
  if(m.top_tipos)
    document.getElementById('tipos').innerHTML =
      m.top_tipos.map(([t,n])=>`<span class="chip">${TIPOS_ES[t]||t} <b>${n}</b></span>`).join('');
}

/* ── Validación ──────────────────────────────────────────────────────────── */
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

/* ── Predicción ──────────────────────────────────────────────────────────── */
let predMode = false;
let predMarker = null;

function togglePredMode(){
  predMode = !predMode;
  const btn = document.getElementById('pred-mode-btn');
  if(predMode){
    btn.textContent = '🔴 Cancelar modo predicción';
    btn.classList.add('pred-on');
    map.getContainer().style.cursor = 'crosshair';
  } else {
    btn.textContent = '🖱️ Activar predicción por clic';
    btn.classList.remove('pred-on');
    map.getContainer().style.cursor = '';
  }
}

map.on('click', async function(e){
  if(!predMode) return;
  await fetchPredecir(e.latlng.lat, e.latlng.lng);
});

async function fetchPredecir(lat, lng){
  const el = document.getElementById('pred-result');
  el.innerHTML = '<span class="spin"></span> Analizando…';
  if(predMarker) map.removeLayer(predMarker);
  predMarker = L.circleMarker([lat,lng],
    {radius:10,color:'#fbbf24',weight:3,fillColor:'#fbbf24',fillOpacity:.3}).addTo(map);

  try {
    const r = await fetch(`/api/predecir?lat=${lat}&lng=${lng}`);
    const d = await r.json();
    let card = '';
    if(d.status === 'formal'){
      card = `<div class="pred-card formal">
        <div class="pred-icon">✅</div>
        <div class="pred-status">Registrado en DENUE</div>
        <div class="pred-nombre">${d.nombre}</div>
        <div class="pred-info">${tipoLeg(d.tipos)} · ${d.distancia_m} m de distancia</div>
      </div>`;
    } else if(d.status === 'informal'){
      card = `<div class="pred-card informal">
        <div class="pred-icon">🔴</div>
        <div class="pred-status">Candidato Informal</div>
        <div class="pred-nombre">${d.nombre}</div>
        <div class="pred-info">${tipoLeg(d.tipos)} · ${d.distancia_m} m de distancia</div>
      </div>`;
    } else if(d.status === 'zona'){
      const distKm = d.dist_zona_m >= 1000 ? (d.dist_zona_m/1000).toFixed(1)+' km' : d.dist_zona_m+' m';
      const esEstimado = d.estimado;
      card = `<div class="pred-card zona">
        <div class="pred-icon">${esEstimado ? '🔮' : '📊'}</div>
        <div class="pred-status">${esEstimado ? 'Estimación por modelo ML' : 'Zona analizada'}</div>
        <div class="pred-nombre">Potencial <b>${d.zona_nivel}</b></div>
        <div class="pred-info">Probabilidad: <b>${d.zona_score}%</b></div>
        ${esEstimado ? `<div class="pred-info" style="color:#94a3b8;font-size:10px">⚠️ Zona más cercana con datos: ${distKm} · Estimación extrapolada por ML</div>` : `<div class="pred-info" style="color:#94a3b8;font-size:10px">${distKm} al centro de zona</div>`}
      </div>`;
    } else {
      card = `<div class="pred-card sin-datos">
        <div class="pred-icon">❓</div>
        <div class="pred-status">Sin datos disponibles</div>
        <div class="pred-info">No se encontraron zonas con predicciones ML.</div>
      </div>`;
    }
    card += `<div style="font-size:10px;color:#475569;margin-top:8px">
               📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}</div>`;
    el.innerHTML = card;
  } catch(err) {
    el.innerHTML = `<div style="color:#f87171;font-size:11px">Error: ${err.message}</div>`;
  }
}

async function predecirManual(){
  const lat = parseFloat(document.getElementById('pred-lat').value);
  const lng = parseFloat(document.getElementById('pred-lng').value);
  if(isNaN(lat)||isNaN(lng)){
    document.getElementById('pred-result').innerHTML =
      '<div style="color:#f87171;font-size:11px">Ingresa coordenadas válidas.</div>';
    return;
  }
  map.setView([lat,lng],15);
  await fetchPredecir(lat,lng);
}

/* ── Ruta de visita ──────────────────────────────────────────────────────── */
let rutaSeleccion = new Set();
let rutaLayer = null;
let rutaMarkersExtra = [];

function renderListaRuta(){
  const q = (document.getElementById('filtro-ruta').value||'').toLowerCase();
  // Usa _rutaData (todos los candidatos, sin filtro de colonia)
  const base     = _rutaData.length ? _rutaData : allData;
  const filtered = q ? base.filter(c=>c.nombre.toLowerCase().includes(q)) : base;
  document.getElementById('lista-ruta').innerHTML = filtered.slice(0,300).map(c=>`
    <div class="ritem ${rutaSeleccion.has(c.place_id)?'rsel':''}"
         onclick="togglePunto('${c.place_id}', this)">
      <div class="rchk">${rutaSeleccion.has(c.place_id)?'✓':''}</div>
      <div style="overflow:hidden">
        <div class="cnom">${c.nombre}</div>
        <div class="ctip">${tipoLeg(c.tipos)} ${c.colonia_denue ? '· '+c.colonia_denue.toLowerCase() : ''}</div>
      </div>
    </div>`).join('');
}

function togglePunto(place_id, el){
  if(rutaSeleccion.has(place_id)){
    rutaSeleccion.delete(place_id);
  } else {
    if(rutaSeleccion.size >= 20){ alert('Máximo 20 puntos por ruta'); return; }
    rutaSeleccion.add(place_id);
  }
  renderListaRuta();
  document.getElementById('ruta-count').textContent = rutaSeleccion.size + ' seleccionados';
}

function limpiarRuta(){
  rutaSeleccion.clear();
  document.getElementById('ruta-count').textContent = '0 seleccionados';
  document.getElementById('ruta-info').innerHTML = '';
  if(rutaLayer){ map.removeLayer(rutaLayer); rutaLayer=null; }
  rutaMarkersExtra.forEach(m=>map.removeLayer(m));
  rutaMarkersExtra = [];
  renderListaRuta();
}

async function calcularRuta(){
  if(rutaSeleccion.size < 2){ alert('Selecciona al menos 2 puntos.'); return; }
  const btn = document.getElementById('btn-calcular');
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span> Calculando ruta…';
  try {
    const resp = await fetch('/api/ruta', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({place_ids: Array.from(rutaSeleccion)}),
    });
    const d = await resp.json();
    if(!resp.ok){ alert('Error: '+(d.detail || d.error || 'Error desconocido')); return; }
    renderRutaEnMapa(d);
  } catch(err){
    alert('Error de conexión: '+err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '🗺️ Calcular mejor ruta';
  }
}

async function calcularRutaColonia(){
  const sel   = document.getElementById('ruta-colonia-sel');
  const limit = parseInt(document.getElementById('ruta-colonia-limit').value)||20;
  const coloniaVal = sel.value;
  if(!coloniaVal){ alert('Selecciona una colonia.'); return; }
  const btn = document.getElementById('btn-ruta-colonia');
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span> Calculando…';
  try {
    const resp = await fetch('/api/ruta-colonia', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({colonia: coloniaVal, limite: limit}),
    });
    const d = await resp.json();
    if(!resp.ok){ alert('Error: '+(d.detail || d.error || 'Error desconocido')); return; }
    renderRutaEnMapa(d);
    showTab('ruta');
  } catch(err){
    alert('Error de conexión: '+err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '🚗 Generar ruta de colonia';
  }
}

function renderRutaEnMapa(d){
  if(rutaLayer){ map.removeLayer(rutaLayer); rutaLayer=null; }
  rutaMarkersExtra.forEach(m=>map.removeLayer(m));
  rutaMarkersExtra = [];

  rutaLayer = L.geoJSON(d.geometry, {style:{color:'#2563eb',weight:5,opacity:.85}}).addTo(map);

  d.waypoints_ordenados.forEach((pt, i) => {
    const icon = L.divIcon({
      className: '',
      html: `<div style="background:#2563eb;color:#fff;border-radius:50%;
                         width:30px;height:30px;display:flex;align-items:center;
                         justify-content:center;font-size:13px;font-weight:700;
                         border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.5)">${i+1}</div>`,
      iconSize: [30,30], iconAnchor: [15,15],
    });
    const gurl = pt.lat ? `https://www.google.com/maps/dir/?api=1&destination=${pt.lat},${pt.lng}` : '#';
    const m = L.marker([pt.lat, pt.lng], {icon})
      .bindPopup(`<div class="pbox">
        <div class="pnom">${i+1}. ${pt.nombre}</div>
        <div class="ptip">${tipoLeg(pt.tipos||'')}</div>
        <a class="bnav" href="${gurl}" target="_blank">📍 Abrir en Google Maps</a>
      </div>`).addTo(map);
    rutaMarkersExtra.push(m);
  });

  map.fitBounds(rutaLayer.getBounds(), {padding:[30,30]});

  const horas = Math.floor(d.tiempo_min / 60);
  const mins  = d.tiempo_min % 60;
  const tStr  = horas > 0 ? `${horas}h ${mins} min` : `${d.tiempo_min} min`;
  const ids   = d.waypoints_ordenados.map(p=>p.place_id).filter(id=>id!=='__origen__');

  document.getElementById('ruta-info').innerHTML = `
    <div class="ruta-info-card">
      <div class="ruta-stat"><span>📏 Distancia total</span><b>${d.distancia_km} km</b></div>
      <div class="ruta-stat"><span>⏱️ Tiempo estimado</span><b>${tStr}</b></div>
      <div class="ruta-stat"><span>📍 Paradas</span><b>${d.waypoints_ordenados.length}</b></div>
    </div>
    <button class="ruta-btn green-btn" style="margin-top:8px"
            onclick="descargarReporte(${JSON.stringify(ids)})">
      📄 Descargar reporte de visita
    </button>
    <p style="font-size:10px;color:#475569;margin-top:5px;margin-bottom:8px">
      Ruta optimizada · En auto · Sin tráfico en tiempo real
    </p>
    <div style="font-size:10px;font-weight:700;color:#64748b;margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px">
      Orden de visita
    </div>
    ${d.waypoints_ordenados.map((p,i)=>`
      <div class="orden-item">
        <div class="orden-num">${i+1}</div>
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.nombre}</span>
      </div>`).join('')}`;
}

async function descargarReporte(placeIds){
  const resp = await fetch('/api/reporte-visita', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({place_ids: placeIds, fecha_visita: new Date().toISOString().slice(0,10)}),
  });
  if(!resp.ok){ alert('Error generando reporte'); return; }
  const blob = await resp.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'reporte_visita.html'; a.click();
  URL.revokeObjectURL(url);
}

/* ── Tabs ────────────────────────────────────────────────────────────────── */
function showTab(tab, btn){
  // No tocar los botones toggle (🔥 Prob. y 🏘️ Colonias) — tienen estado propio
  document.querySelectorAll('.tab:not(#btn-zonas):not(#btn-colonias)').forEach(t=>t.classList.remove('active'));
  if(btn) btn.classList.add('active');

  const panels = {
    mapa:  document.getElementById('panel'),
    pred:  document.getElementById('pred-panel'),
    ruta:  document.getElementById('ruta-panel'),
  };
  const mw  = document.getElementById('map-wrap');
  const vw  = document.getElementById('val-wrap');

  Object.values(panels).forEach(p=>{ if(p) p.style.display='none'; });
  mw.style.display = 'none';
  vw.style.display = 'none';

  if(tab === 'mapa'){
    mw.style.display = '';
    panels.mapa.style.display = 'flex';
  } else if(tab === 'val'){
    vw.style.display = 'block';
    cargarValidacion();
    return;
  } else if(tab === 'pred'){
    mw.style.display = '';
    panels.pred.style.display = 'flex';
  } else if(tab === 'ruta'){
    mw.style.display = '';
    panels.ruta.style.display = 'flex';
    // Siempre mostrar TODOS los candidatos en Ruta, sin filtro de colonia
    if(!_rutaData.length){
      fetch('/api/candidatos?limit=2000')
        .then(r=>r.json())
        .then(data=>{ _rutaData=data; renderListaRuta(); })
        .catch(()=>{ _rutaData=allData.slice(); renderListaRuta(); });
    } else {
      renderListaRuta();
    }
  }
  setTimeout(()=>map.invalidateSize(), 50);
}

/* ── Init ────────────────────────────────────────────────────────────────── */
cargarCandidatos();
cargarMetricas();
