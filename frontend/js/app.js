/* ══════════════════════════════════════════════════════════════════════════
   app.js — Mapa de Candidatos Informales, Mérida, Yucatán
   ══════════════════════════════════════════════════════════════════════════ */

const TIPOS_ES = {
  restaurant: 'Restaurante', food: 'Comida', cafe: 'Café', bar: 'Bar',
  beauty_salon: 'Salón de belleza', hair_care: 'Peluquería',
  car_repair: 'Taller mecánico', car_wash: 'Lavado de autos',
  laundry: 'Lavandería', store: 'Tienda', pharmacy: 'Farmacia',
  gym: 'Gimnasio', clothing_store: 'Ropa', hardware_store: 'Ferretería',
  bakery: 'Panadería', supermarket: 'Supermercado',
  school: 'Escuela', doctor: 'Médico', dentist: 'Dentista',
  manufacturer: 'Manufactura', lodging: 'Hospedaje',
  event_venue: 'Salón de eventos', farm: 'Rancho/Granja',
  electrician: 'Electricista', plumber: 'Plomero',
};

function tipoLeg(tipos) {
  if (!tipos) return 'Negocio';
  const arr = tipos.split(',').map(t => t.trim());
  for (const t of arr) if (TIPOS_ES[t]) return TIPOS_ES[t];
  return arr.find(t => !['point_of_interest', 'establishment', 'service'].includes(t)) || 'Negocio';
}

// Color del marcador según tipo de formalización
function tipoColor(tipo) {
  if (tipo === 'formal') return '#22c55e';
  if (tipo === 'en_proceso') return '#f97316';
  return '#dc2626'; // informal (default)
}

/* ── Mapa base ─────────────────────────────────────────────────────────────────── */
const map = L.map('map').setView([20.9674, -89.5926], 11);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(map);

let allData = [], markers = [], markerLayer = null;
let _rutaData = [];            // Todos los candidatos para la pestaña Ruta (sin filtro de colonia)
let _zonasCsvData = [], zonaLayer = null, mostrarZonas = false;
let filtroTipoActual = null;
let _cacheReady = false;

/* ── Candidatos ────────────────────────────────────────────────────────────────── */

let _cacheWatchTimer = null;
let _lastFetchServerCount = 0;  // conteo del servidor en el último fetch de datos

// Punto de entrada de carga. Llamado desde _bootApp tras confirmar login.
// Fetch inmediato para mostrar lo disponible, luego watcher progresivo.
async function cargarDatosIniciales() {
  const badge = document.getElementById('badge');
  badge.textContent = '⏳ Cargando…';
  badge.style.background = '#f97316';
  try {
    const data = await fetch('/api/candidatos').then(r => r.json());
    if (data.length > 0) {
      allData = data; _rutaData = data.slice();
      renderLista(data); renderMapa(data);
      badge.textContent = `${data.length.toLocaleString()} candidatos cargando…`;
    }
  } catch (e) { /* continúa al watcher */ }
  _watchCacheReady();
}

// Polling liviano (/api/cache-status < 100 bytes cada 500 ms).
// Lógica de fetch de datos:
//   - Cuando ready=true: un fetch final + stop.
//   - Cuando allData.length === 0 y count ≥ 200: primer fetch visible.
//   - Cuando server acumula 2000 docs más desde el último fetch: fetch incremental.
// En warm start (inicial devuelve todos los docs): solo el fetch final cuando ready.
async function _watchCacheReady() {
  if (_cacheWatchTimer) { clearTimeout(_cacheWatchTimer); _cacheWatchTimer = null; }
  const badge = document.getElementById('badge');
  try {
    const st = await fetch('/api/cache-status').then(r => r.json());

    if (st.ready) {
      const data = await fetch('/api/candidatos').then(r => r.json());
      if (data.length > 0) _mergeDataForce(data);
      _cacheReady = true;
      badge.textContent = `${allData.length.toLocaleString()} candidatos`;
      badge.style.background = '#22c55e';
      return;
    }

    const needsFetch = (allData.length === 0 && st.count > 0) ||
      (st.count >= _lastFetchServerCount + 200);
    if (needsFetch && st.count > 0) {
      _lastFetchServerCount = st.count;
      const data = await fetch('/api/candidatos').then(r => r.json());
      if (data.length > 0) _mergeData(data);
    }

    const shown = allData.length > 0 ? `${allData.length.toLocaleString()} ` : '';
    const prog = st.count > 0 ? `(${st.count.toLocaleString()} en servidor)` : '';
    badge.textContent = `${shown}${prog} cargando…`;
    badge.style.background = '#f97316';
    _cacheWatchTimer = setTimeout(_watchCacheReady, 300);
  } catch (e) {
    _cacheWatchTimer = setTimeout(_watchCacheReady, 1500);
  }
}

// Fusiona newData con allData: actualiza lista y agrega solo los marcadores nuevos.
function _mergeData(newData) {
  if (newData.length <= allData.length) return;
  const known = new Set(allData.map(c => c.place_id));
  const nuevos = newData.filter(c => !known.has(c.place_id));
  allData = newData; _rutaData = newData.slice();
  renderLista(newData);
  if (nuevos.length > 0) _agregarMarcadores(nuevos);
}

// Igual que _mergeData pero siempre actualiza lista y mapa (para el flush final de cache)
function _mergeDataForce(newData) {
  const known = new Set(allData.map(c => c.place_id));
  const nuevos = newData.filter(c => !known.has(c.place_id));
  allData = newData; _rutaData = newData.slice();
  renderLista(newData);
  if (nuevos.length > 0) _agregarMarcadores(nuevos);
}

// Agrega marcadores nuevos al cluster sin destruirlo (para cargas incrementales)
function _agregarMarcadores(data) {
  if (!markerLayer) { renderMapa(data); return; }
  const nuevosLeaflet = [];
  data.forEach(c => {
    if (!c.lat || !c.lng) return;
    const idx = allData.findIndex(x => x.place_id === c.place_id);
    const color = tipoColor(c.tipo || 'informal');
    const m = L.circleMarker([c.lat, c.lng],
      { radius: 7, color: '#fff', weight: 1.5, fillColor: color, fillOpacity: .85 });
    m.bindPopup(() => popupHtml(c, idx));
    m._popupIdx = idx;
    m.on('click', () => resaltar(idx));
    nuevosLeaflet.push(m);
    markers.push({ marker: m, idx, data: c });
  });
  markerLayer.addLayers(nuevosLeaflet);
}

async function cargarCandidatos(colonia = null, tipo = null) {
  const badge = document.getElementById('badge');
  let url = '/api/candidatos';
  const params = [];
  if (colonia) params.push(`colonia=${encodeURIComponent(colonia)}`);
  if (tipo) params.push(`tipo=${tipo}`);
  if (params.length) url += '?' + params.join('&');

  badge.textContent = '⏳ Filtrando…';
  badge.style.background = '#f97316';
  const r = await fetch(url);
  allData = await r.json();
  badge.textContent = allData.length.toLocaleString() + ' candidatos';
  badge.style.background = '#22c55e';
  renderLista(allData);
  renderMapa(allData);
}

function popupHtml(c, i) {
  const gurl = `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`;
  const wurl = `https://waze.com/ul?ll=${c.lat},${c.lng}&navigate=yes`;
  const t = c.tipo || 'informal';
  return `
    <div class="pbox">
      <div class="pnom">${c.nombre}</div>
      <div class="ptip">${tipoLeg(c.tipos)}</div>
      <div class="ptipo-row">
        <select id="tipo-sel-${c.place_id}">
          <option value="informal"   ${t === 'informal' ? 'selected' : ''}>🔴 Informal</option>
          <option value="en_proceso" ${t === 'en_proceso' ? 'selected' : ''}>🟠 En proceso</option>
          <option value="formal"     ${t === 'formal' ? 'selected' : ''}>🟢 Formal</option>
        </select>
        <button id="btn-guardar-${c.place_id}" onclick="guardarTipo('${c.place_id}', ${i})">Guardar</button>
      </div>
      <a class="bnav"  href="${gurl}" target="_blank">📍 Ir en Google Maps</a>
      <a class="bwaze" href="${wurl}" target="_blank">🚗 Abrir en Waze</a>
    </div>`;
}

function renderMapa(data) {
  if (markerLayer) map.removeLayer(markerLayer);
  markerLayer = L.markerClusterGroup({
    chunkedLoading: true,
    chunkInterval: 200,   // ms entre chunks — da tiempo al browser de pintar
    chunkDelay: 50,
    maxClusterRadius: 60,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    disableClusteringAtZoom: 17,
  });
  // Añadir al mapa PRIMERO — así el primer chunk aparece de inmediato
  map.addLayer(markerLayer);

  markers = [];
  const leafletMarkers = [];
  data.forEach((c, i) => {
    if (!c.lat || !c.lng) return;
    const color = tipoColor(c.tipo || 'informal');
    const m = L.circleMarker([c.lat, c.lng],
      { radius: 7, color: '#fff', weight: 1.5, fillColor: color, fillOpacity: .85 });
    // Popup lazy: el HTML se genera solo cuando el usuario abre el popup
    m.bindPopup(() => popupHtml(c, i));
    m._popupIdx = i;
    m.on('click', () => resaltar(i));
    leafletMarkers.push(m);
    markers.push({ marker: m, idx: i, data: c });
  });
  // addLayers (plural) + chunkedLoading = primer chunk visible en < 100 ms
  markerLayer.addLayers(leafletMarkers);
}

async function guardarTipo(placeId, idx) {
  const sel = document.getElementById(`tipo-sel-${placeId}`);
  const btn = document.getElementById(`btn-guardar-${placeId}`);
  const tipo = sel.value;

  // ── Optimistic update: cambiar UI ANTES de esperar al servidor ──────────────
  const entry = markers.find(m => m.data.place_id === placeId);
  const tipoAntes = (entry?.data?.tipo) || allData[idx]?.tipo || 'informal';

  if (entry) {
    entry.data.tipo = tipo;
    entry.marker.setStyle({ fillColor: tipoColor(tipo) });
    entry.marker.bindPopup(() => popupHtml(entry.data, idx));
  }
  if (allData[idx]) allData[idx] = { ...allData[idx], tipo };
  const li = document.getElementById(`ci-${idx}`);
  if (li) li.style.borderLeft = `3px solid ${tipoColor(tipo)}`;

  if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }

  // ── Llamada al servidor en segundo plano ────────────────────────────────────
  try {
    const resp = await fetch(`/api/candidatos/${placeId}/tipo`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo }),
    });
    const d = await resp.json();
    if (d.ok) {
      if (btn) {
        btn.disabled = false; btn.textContent = 'Guardado ✓';
        setTimeout(() => { if (btn) btn.textContent = 'Guardar'; }, 1500);
      }
      entry?.marker?.closePopup();
      _actualizarMetricasLocales();
      _calcIndice();
    } else {
      _revertirTipo(entry, idx, tipoAntes, btn);
    }
  } catch (e) {
    _revertirTipo(entry, idx, tipoAntes, btn);
  }
}

function _revertirTipo(entry, idx, tipoAntes, btn) {
  if (entry) {
    entry.data.tipo = tipoAntes;
    entry.marker.setStyle({ fillColor: tipoColor(tipoAntes) });
    entry.marker.bindPopup(popupHtml(entry.data, idx));
  }
  if (allData[idx]) allData[idx] = { ...allData[idx], tipo: tipoAntes };
  const li = document.getElementById(`ci-${idx}`);
  if (li) li.style.borderLeft = `3px solid ${tipoColor(tipoAntes)}`;
  const sel = document.querySelector(`#tipo-sel-${entry?.data?.place_id}`);
  if (sel) sel.value = tipoAntes;
  if (btn) { btn.disabled = false; btn.textContent = 'Guardar'; }
  alert('Error al guardar. Intenta de nuevo.');
}

function renderLista(data) {
  document.getElementById('lista').innerHTML =
    data.slice(0, 200).map((c, i) => `
      <div class="citem" id="ci-${i}" onclick="irA(${i},${c.lat},${c.lng})">
        <div class="cnom">${c.nombre}</div>
        <div class="ctip">${tipoLeg(c.tipos)}</div>
      </div>`).join('');
  if (data.length > 0) _renderMetricasLocales(data);
}

function _renderMetricasLocales(data) {
  const total = data.length;
  const formales = data.filter(c => c.tipo === 'formal').length;
  const enProceso = data.filter(c => c.tipo === 'en_proceso').length;
  const informales = total - formales - enProceso;
  const pct = Math.round(informales / total * 1000) / 10;
  document.getElementById('mets').innerHTML = `
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-label">Total</div>
        <div class="stat-value">${total.toLocaleString()}</div>
      </div>
      <div class="stat-card orange">
        <div class="stat-label">Sin reg.</div>
        <div class="stat-value">${pct}%</div>
      </div>
      <div class="stat-card green">
        <div class="stat-label">Formales</div>
        <div class="stat-value">${formales.toLocaleString()}</div>
      </div>
      <div class="stat-card orange">
        <div class="stat-label">En proceso</div>
        <div class="stat-value">${enProceso.toLocaleString()}</div>
      </div>
      <div class="stat-card red">
        <div class="stat-label">Informales</div>
        <div class="stat-value">${informales.toLocaleString()}</div>
      </div>
    </div>`;
  const SKIP = new Set(['point_of_interest', 'establishment', 'service', '']);
  const tc = {};
  data.forEach(c => {
    if ((c.tipo || 'informal') !== 'formal') {
      (c.tipos || '').split(',').forEach(t => {
        t = t.trim();
        if (!SKIP.has(t)) tc[t] = (tc[t] || 0) + 1;
      });
    }
  });
  const top = Object.entries(tc).sort((a, b) => b[1] - a[1]).slice(0, 8);
  document.getElementById('tipos').innerHTML =
    top.map(([t, n]) => `<span class="chip">${TIPOS_ES[t] || t} <b>${n}</b></span>`).join('');
}

function filtrar() {
  const q = document.getElementById('filtro').value.toLowerCase();
  const filtered = q ? allData.filter(c => c.nombre.toLowerCase().includes(q)) : allData;
  renderLista(filtered);
  renderMapa(filtered);
}

function filtrarPorTipo(tipo, btn) {
  document.querySelectorAll('.tipo-filters button').forEach(b => b.classList.remove('active'));
  if (filtroTipoActual === tipo) {
    filtroTipoActual = null;
    cargarCandidatos(coloniaActual || null);
  } else {
    filtroTipoActual = tipo;
    btn.classList.add('active');
    cargarCandidatos(coloniaActual || null, tipo);
  }
}

function irA(i, lat, lng) {
  document.querySelectorAll('.citem').forEach(e => e.classList.remove('active'));
  const el = document.getElementById('ci-' + i);
  if (el) { el.classList.add('active'); el.scrollIntoView({ block: 'nearest' }); }
  map.setView([lat, lng], 17);
  const entry = markers.find(m => m.idx === i);
  if (entry) markerLayer.zoomToShowLayer(entry.marker, () => entry.marker.openPopup());
}
function resaltar(i) {
  document.querySelectorAll('.citem').forEach(e => e.classList.remove('active'));
  const el = document.getElementById('ci-' + i);
  if (el) { el.classList.add('active'); el.scrollIntoView({ block: 'nearest' }); }
}

/* ── Zonas de predicción ─────────────────────────────────────────────────── */
async function toggleZonas(btn) {
  mostrarZonas = !mostrarZonas;
  if (mostrarZonas) {
    btn.classList.add('active');
    if (_zonasCsvData.length === 0) {
      _zonasCsvData = await (window._preloads?.predicciones || fetch('/api/predicciones').then(r => r.json()));
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
    const bounds = [[z.lat_centro - dLat / 2, z.lon_centro - dLng / 2],
    [z.lat_centro + dLat / 2, z.lon_centro + dLng / 2]];
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
    ${[['#dc2626', '>75% Alto'], ['#f97316', '50–75% Medio-alto'], ['#eab308', '25–50% Medio'], ['#22c55e', '<25% Bajo']]
      .map(([c, l]) => `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
        <span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${c};opacity:.85"></span>
        <span>${l}</span>
      </div>`).join('')}
  `;
  document.getElementById('map-wrap').appendChild(ley);
}

/* ── Métricas ────────────────────────────────────────────────────────────── */

// Recalcula desde allData local — sin red, para reflejar cambios de tipo al instante
function _actualizarMetricasLocales(tipoAntes, tipoNuevo) {
  if (!allData.length) return;
  const total = allData.length;
  const formales = allData.filter(c => c.tipo === 'formal').length;
  const enProceso = allData.filter(c => c.tipo === 'en_proceso').length;
  const informales = total - formales - enProceso;
  const pct = Math.round(informales / total * 1000) / 10;
  document.getElementById('mets')?.querySelectorAll('.stat-card').forEach(card => {
    const label = card.querySelector('.stat-label')?.textContent?.trim();
    const val = card.querySelector('.stat-value');
    if (!val) return;
    if (label === 'Total') val.textContent = total.toLocaleString();
    if (label === 'Sin reg.') val.textContent = pct + '%';
    if (label === 'Formales') val.textContent = formales.toLocaleString();
    if (label === 'En proceso') val.textContent = enProceso.toLocaleString();
    if (label === 'Informales') val.textContent = informales.toLocaleString();
  });
}

async function cargarMetricas() {
  const m = await fetch('/api/metricas').then(r => r.json());
  if (!m.total) { setTimeout(cargarMetricas, 3000); return; }
  document.getElementById('mets').innerHTML = `
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
        <div class="stat-value">19,309</div>
      </div>
      <div class="stat-card orange">
        <div class="stat-label">En proceso</div>
        <div class="stat-value">${(m.en_proceso || 0).toLocaleString()}</div>
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
  if (m.top_tipos)
    document.getElementById('tipos').innerHTML =
      m.top_tipos.map(([t, n]) => `<span class="chip">${TIPOS_ES[t] || t} <b>${n}</b></span>`).join('');
}

/* ── Validación ──────────────────────────────────────────────────────────── */
let valCargada = false;
async function cargarValidacion() {
  if (valCargada) return;
  document.getElementById('t-match').innerHTML = '<tr><td colspan="4" style="text-align:center;color:#64748b;padding:16px">Cargando…</td></tr>';
  document.getElementById('t-inf').innerHTML = '<tr><td colspan="4" style="text-align:center;color:#64748b;padding:16px">Cargando…</td></tr>';
  const d = await (window._preloads?.validacion || fetch('/api/muestra-validacion').then(r => r.json()));
  const matches = d.matches || [];
  const noMatches = d.no_matches || [];
  document.getElementById('count-match').textContent = `${matches.length.toLocaleString()} registros`;
  document.getElementById('count-inf').textContent = `${noMatches.length.toLocaleString()} registros`;
  document.getElementById('t-match').innerHTML = matches.map(m => `
    <tr><td>${m.nombre}</td><td>${m.nombre_denue || '—'}</td>
    <td><span class="sbadge ${m.fuzzy_score >= 85 ? 'sh' : 'sm'}">${m.fuzzy_score}</span></td>
    <td>${m.distancia_m < 9999 ? m.distancia_m + ' m' : '—'}</td></tr>`).join('');
  document.getElementById('t-inf').innerHTML = noMatches.map(c => `
    <tr><td>${c.nombre}</td><td>${tipoLeg(c.tipos)}</td>
    <td>${(c.lat || 0).toFixed(5)}</td><td>${(c.lng || 0).toFixed(5)}</td></tr>`).join('');
  valCargada = true;
}

/* ── Predicción ──────────────────────────────────────────────────────────── */
let predMode = false;
let predMarker = null;

function togglePredMode() {
  predMode = !predMode;
  const btn = document.getElementById('pred-mode-btn');
  if (predMode) {
    btn.textContent = '🔴 Cancelar modo predicción';
    btn.classList.add('pred-on');
    map.getContainer().style.cursor = 'crosshair';
  } else {
    btn.textContent = '🖱️ Activar predicción por clic';
    btn.classList.remove('pred-on');
    map.getContainer().style.cursor = '';
  }
}

map.on('click', async function (e) {
  if (!predMode) return;
  await fetchPredecir(e.latlng.lat, e.latlng.lng);
});

async function fetchPredecir(lat, lng) {
  const el = document.getElementById('pred-result');
  el.innerHTML = '<span class="spin"></span> Analizando…';
  if (predMarker) map.removeLayer(predMarker);
  predMarker = L.circleMarker([lat, lng],
    { radius: 10, color: '#fbbf24', weight: 3, fillColor: '#fbbf24', fillOpacity: .3 }).addTo(map);

  try {
    const r = await fetch(`/api/predecir?lat=${lat}&lng=${lng}`);
    if (!r.ok) {
      let msg = `Error del servidor (${r.status})`;
      try { const e = await r.json(); msg = e.detail || msg; } catch { }
      throw new Error(msg);
    }
    const d = await r.json();
    let card = '';
    if (d.status === 'formal') {
      card = `<div class="pred-card formal">
        <div class="pred-icon">✅</div>
        <div class="pred-status">Registrado en DENUE</div>
        <div class="pred-nombre">${d.nombre}</div>
        <div class="pred-info">${tipoLeg(d.tipos)} · ${d.distancia_m} m de distancia</div>
      </div>`;
    } else if (d.status === 'informal') {
      card = `<div class="pred-card informal">
        <div class="pred-icon">🔴</div>
        <div class="pred-status">Candidato Informal</div>
        <div class="pred-nombre">${d.nombre}</div>
        <div class="pred-info">${tipoLeg(d.tipos)} · ${d.distancia_m} m de distancia</div>
      </div>`;
    } else if (d.status === 'zona') {
      const distKm = d.dist_zona_m >= 1000 ? (d.dist_zona_m / 1000).toFixed(1) + ' km' : d.dist_zona_m + ' m';
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
  } catch (err) {
    el.innerHTML = `<div style="color:#f87171;font-size:11px">Error: ${err.message}</div>`;
  }
}

async function predecirManual() {
  const lat = parseFloat(document.getElementById('pred-lat').value);
  const lng = parseFloat(document.getElementById('pred-lng').value);
  if (isNaN(lat) || isNaN(lng)) {
    document.getElementById('pred-result').innerHTML =
      '<div style="color:#f87171;font-size:11px">Ingresa coordenadas válidas.</div>';
    return;
  }
  map.setView([lat, lng], 15);
  await fetchPredecir(lat, lng);
}

/* ── Ruta de visita ──────────────────────────────────────────────────────── */
let rutaSeleccion = new Set();
let rutaLayer = null;
let rutaMarkersExtra = [];

function renderListaRuta() {
  const q = (document.getElementById('filtro-ruta').value || '').toLowerCase();
  // Usa _rutaData (todos los candidatos, sin filtro de colonia)
  const base = _rutaData.length ? _rutaData : allData;
  const filtered = q ? base.filter(c => c.nombre.toLowerCase().includes(q)) : base;
  document.getElementById('lista-ruta').innerHTML = filtered.slice(0, 300).map(c => `
    <div class="ritem ${rutaSeleccion.has(c.place_id) ? 'rsel' : ''}"
         onclick="togglePunto('${c.place_id}', this)">
      <div class="rchk">${rutaSeleccion.has(c.place_id) ? '✓' : ''}</div>
      <div style="overflow:hidden">
        <div class="cnom">${c.nombre}</div>
        <div class="ctip">${tipoLeg(c.tipos)} ${c.colonia_denue ? '· ' + c.colonia_denue.toLowerCase() : ''}</div>
      </div>
    </div>`).join('');
}

function togglePunto(place_id, el) {
  if (rutaSeleccion.has(place_id)) {
    rutaSeleccion.delete(place_id);
  } else {
    if (rutaSeleccion.size >= 20) { alert('Máximo 20 puntos por ruta'); return; }
    rutaSeleccion.add(place_id);
  }
  renderListaRuta();
  document.getElementById('ruta-count').textContent = rutaSeleccion.size + ' seleccionados';
}

function limpiarRuta() {
  rutaSeleccion.clear();
  document.getElementById('ruta-count').textContent = '0 seleccionados';
  document.getElementById('ruta-info').innerHTML = '';
  if (rutaLayer) { map.removeLayer(rutaLayer); rutaLayer = null; }
  rutaMarkersExtra.forEach(m => map.removeLayer(m));
  rutaMarkersExtra = [];
  renderListaRuta();
}

async function calcularRuta() {
  if (rutaSeleccion.size < 2) { alert('Selecciona al menos 2 puntos.'); return; }
  const btn = document.getElementById('btn-calcular');
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span> Calculando ruta…';
  try {
    const resp = await fetch('/api/ruta', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ place_ids: Array.from(rutaSeleccion) }),
    });
    const d = await resp.json();
    if (!resp.ok) { alert('Error: ' + (d.detail || d.error || 'Error desconocido')); return; }
    window._rutaEsCampana = false;
    renderRutaEnMapa(d);
  } catch (err) {
    alert('Error de conexión: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '🗺️ Calcular mejor ruta';
  }
}

async function calcularRutaColonia() {
  const sel = document.getElementById('ruta-colonia-sel');
  const limit = parseInt(document.getElementById('ruta-colonia-limit').value) || 20;
  const coloniaVal = sel.value;
  if (!coloniaVal) { alert('Selecciona una colonia.'); return; }
  const btn = document.getElementById('btn-ruta-colonia');
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span> Calculando…';
  try {
    const resp = await fetch('/api/ruta-colonia', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ colonia: coloniaVal, limite: limit }),
    });
    const d = await resp.json();
    if (!resp.ok) { alert('Error: ' + (d.detail || d.error || 'Error desconocido')); return; }
    window._rutaEsCampana = false;
    renderRutaEnMapa(d);
    showTab('ruta');
  } catch (err) {
    alert('Error de conexión: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '🚗 Generar ruta de colonia';
  }
}

function _irYRegistrar(negocioId, nombre) {
  // 1. Cambiar al tab de Campañas
  const btnTab = document.querySelector('.tab[onclick*="campanas"]');
  showTab('campanas', btnTab);
  // 2. Asegurar que se vea el detalle (no la lista)
  const lista  = document.getElementById('campanas-lista-view');
  const detalle = document.getElementById('campanas-detail-view');
  if (lista)   lista.style.display   = 'none';
  if (detalle) detalle.style.display = 'flex';
  // 3. Abrir el modal de visita
  abrirModalVisita(negocioId, nombre);
}

function popupHtmlRuta(c, i) {
  const t = c.tipo || 'informal';
  const placeId = c.place_id || c.negocio_id || '';
  const safeNombre = (c.nombre || '').replace(/'/g, "\\'");
  const btnRegistrar = window._rutaEsCampana
    ? `<button onclick="_irYRegistrar('${placeId}','${safeNombre}')"
         style="display:block;width:100%;padding:9px 0;border-radius:8px;border:none;
                background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;
                font-size:12px;font-weight:700;cursor:pointer;margin-bottom:6px;
                font-family:'Inter',sans-serif;box-shadow:0 2px 10px rgba(37,99,235,.4)">
        📝 Registrar visita
      </button>`
    : '';
  return `
    <div class="pbox">
      <div class="pnom">${c.nombre}</div>
      <div class="ptip">${tipoLeg(c.tipos)}</div>
      <div class="ptipo-row">
        <select id="tipo-sel-${placeId}">
          <option value="informal"   ${t === 'informal'   ? 'selected' : ''}>🔴 Informal</option>
          <option value="en_proceso" ${t === 'en_proceso' ? 'selected' : ''}>🟠 En proceso</option>
          <option value="formal"     ${t === 'formal'     ? 'selected' : ''}>🟢 Formal</option>
        </select>
        <button id="btn-guardar-${placeId}" onclick="guardarTipo('${placeId}', ${i})">Guardar</button>
      </div>
      ${btnRegistrar}
    </div>`;
}

function renderRutaEnMapa(d) {
  if (rutaLayer) { map.removeLayer(rutaLayer); rutaLayer = null; }
  rutaMarkersExtra.forEach(m => map.removeLayer(m));
  rutaMarkersExtra = [];

  rutaLayer = L.geoJSON(d.geometry, { style: { color: '#2563eb', weight: 5, opacity: .85 } }).addTo(map);

  d.waypoints_ordenados.forEach((pt, i) => {
    const placeId = pt.place_id || pt.negocio_id;
    // Buscar el candidato en allData para tener tipo actualizado; si no está, usar el waypoint
    const cand = allData.find(c => c.place_id === placeId) || pt;
    const allDataIdx = allData.findIndex(c => c.place_id === placeId);
    const icon = L.divIcon({
      className: '',
      html: `<div style="background:#2563eb;color:#fff;border-radius:50%;
                         width:30px;height:30px;display:flex;align-items:center;
                         justify-content:center;font-size:13px;font-weight:700;
                         border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.5)">${i + 1}</div>`,
      iconSize: [30, 30], iconAnchor: [15, 15],
    });
    const m = L.marker([pt.lat, pt.lng], { icon })
      .bindPopup(() => popupHtmlRuta(allData[allDataIdx] || cand, allDataIdx)).addTo(map);
    rutaMarkersExtra.push(m);
  });

  map.fitBounds(rutaLayer.getBounds(), { padding: [30, 30] });

  const horas = Math.floor(d.tiempo_min / 60);
  const mins = d.tiempo_min % 60;
  const tStr = horas > 0 ? `${horas}h ${mins} min` : `${d.tiempo_min} min`;
  window._rutaPlaceIds = d.waypoints_ordenados.map(p => p.place_id).filter(id => id && id !== '__origen__');

  document.getElementById('ruta-info').innerHTML = `
    <div class="ruta-info-card">
      <div class="ruta-stat"><span>📏 Distancia total</span><b>${d.distancia_km} km</b></div>
      <div class="ruta-stat"><span>⏱️ Tiempo estimado</span><b>${tStr}</b></div>
      <div class="ruta-stat"><span>📍 Paradas</span><b>${d.waypoints_ordenados.length}</b></div>
    </div>
    <button class="ruta-btn green-btn" style="margin-top:8px"
            onclick="descargarReporte(window._rutaPlaceIds)">
      📄 Descargar reporte de visita
    </button>
    <p style="font-size:10px;color:#475569;margin-top:5px;margin-bottom:8px">
      Ruta optimizada · En auto · Sin tráfico en tiempo real
    </p>
    <div style="font-size:10px;font-weight:700;color:#64748b;margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px">
      Orden de visita
    </div>
    ${d.waypoints_ordenados.map((p, i) => `
      <div class="orden-item">
        <div class="orden-num">${i + 1}</div>
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.nombre}</span>
      </div>`).join('')}`;
}

async function descargarReporte(placeIds) {
  const resp = await fetch('/api/reporte-visita', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ place_ids: placeIds, fecha_visita: new Date().toISOString().slice(0, 10) }),
  });
  if (!resp.ok) { alert('Error generando reporte'); return; }
  const blob = await resp.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'reporte_visita.html'; a.click();
  URL.revokeObjectURL(url);
}

/* ── Tabs ────────────────────────────────────────────────────────────────── */
function showTab(tab, btn) {
  // No tocar los botones toggle (🔥 Prob. y 🏘️ Colonias) — tienen estado propio
  document.querySelectorAll('.tab:not(#btn-zonas):not(#btn-colonias)').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');

  const panels = {
    mapa: document.getElementById('panel'),
    pred: document.getElementById('pred-panel'),
    ruta: document.getElementById('ruta-panel'),
  };
  const mw = document.getElementById('map-wrap');
  const vw = document.getElementById('val-wrap');
  const iw = document.getElementById('indice-wrap');

  Object.values(panels).forEach(p => { if (p) p.style.display = 'none'; });
  mw.style.display = 'none';
  vw.style.display = 'none';
  if (iw) iw.style.display = 'none';

  if (tab === 'mapa') {
    mw.style.display = '';
    panels.mapa.style.display = 'flex';
  } else if (tab === 'val') {
    vw.style.display = 'block';
    cargarValidacion();
    return;
  } else if (tab === 'indice') {
    if (iw) iw.style.display = 'flex';
    cargarIndice();
    return;
  } else if (tab === 'pred') {
    mw.style.display = '';
    panels.pred.style.display = 'flex';
  } else if (tab === 'ruta') {
    mw.style.display = '';
    panels.ruta.style.display = 'flex';
    // Siempre mostrar TODOS los candidatos en Ruta, sin filtro de colonia
    if (!_rutaData.length && allData.length) {
      _rutaData = allData.slice();
      renderListaRuta();
    } else if (!_rutaData.length) {
      fetch('/api/candidatos')
        .then(r => r.json())
        .then(data => { _rutaData = data; renderListaRuta(); })
        .catch(() => { _rutaData = allData.slice(); renderListaRuta(); });
    } else {
      renderListaRuta();
    }
  }
  setTimeout(() => map.invalidateSize(), 50);
}

/* ── Índice de informalidad ──────────────────────────────────────────────── */
let _indiceLoaded = false;
let _indiceBase = null;  // respuesta cruda del API /api/indice
let _indiceCalc = null;  // valores ya calculados (Chapman, α=0.40, p_formal…)

function _idxSet(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

async function cargarIndice() {
  if (_indiceLoaded) return;
  _indiceLoaded = true;
  try {
    const d = await (window._preloads?.indice || fetch('/api/indice').then(r => r.json()));
    _indiceBase = d;
    const fmt = n => Math.round(n).toLocaleString('es-MX');
    const fmtF = n => Number(n).toLocaleString('es-MX');

    // ── Valores de la API ──────────────────────────────────────────────────────
    const N1 = d.datos_entrada.N1_denue;          // 144,576 DENUE (ancla multiplicador)
    const m_denue = d.datos_entrada.m_overlap;          // 8,901 total GMaps+OSM vs DENUE
    const n_fb = d.datos_entrada.n_formales_base;    // 3,809 GMaps+OSM vs CANACO
    const n_fo = d.datos_entrada.n_formales_otros;   // 4,616 cadenas/tipo/institucion
    const n_inf = d.datos_entrada.n_inf_observados;   // 5,966 informales observados
    const n_real = d.datos_entrada.n_gmaps_negocios;   // 23,292 total real (GMaps + OSM)
    const n_csv = d.datos_entrada.n_gmaps_csv || 29234; // total descargado bruto

    // ── Datos OSM del análisis calculo_final.py (complementan a la API) ───────
    // Estos valores son los conteos exactos leídos de cruce_completo.csv y BASE.xlsx.
    // Se verifican porque m_denue = osm.denue + gm_denue (8,901) y
    // n_fb = osm.canaco + gm_canaco (3,809) — ambos coinciden con la API.
    const OSM = {
      n_total: 2556,  // fuente=osm sin excluidos en cruce_completo.csv
      n_denue: 1010,  // decision_fuente=formal_denue en registros OSM
      n_canaco: 243,  // decision_fuente=formal_base en registros OSM
      n_inf: 453,  // decision_fuente=informal en registros OSM
      overlap: 402,  // negocios en GMaps y OSM a <150m con nombre similar (fuzzy≥80)
    };
    const N_DENUE_MERIDA = 56014; // DENUE filtrado a municipio=Mérida (calculo_final.py)
    const N_CANACO_TOTAL = 11968; // CANACO BASE.xlsx H1+H2 deduplicado (calculo_final.py)

    // ── PASO 1: Las 4 fuentes ──────────────────────────────────────────────────
    // n_csv es el total combinado (GMaps + OSM). GMaps solo = n_csv − OSM.n_total
    const n_gmaps_raw = n_csv - OSM.n_total;  // 29,234 − 2,556 = 26,678
    _idxSet('idx-s1-gmaps-raw', fmtF(n_gmaps_raw));
    _idxSet('idx-s1-denue', fmtF(N1));
    // OSM (2,556) y CANACO (11,968) se muestran como constantes derivadas en el HTML

    // ── PASO 2: Limpieza ───────────────────────────────────────────────────────
    const n_excluidos = n_csv - n_real;              // 29,234 − 23,292 = 5,942
    const n_gmaps_clean = n_real - OSM.n_total;        // 23,292 − 2,556  = 20,736
    _idxSet('idx-s2-total-raw', fmtF(n_gmaps_raw));   // GMaps descargados: 26,678
    _idxSet('idx-s2-excluidos', fmtF(Math.max(0, n_excluidos)));  // 5,942
    _idxSet('idx-s2-total-real', fmtF(n_gmaps_clean)); // GMaps limpios: 20,736
    _idxSet('idx-s2-osm-raw', fmtF(OSM.n_total));   // OSM: 2,556
    _idxSet('idx-s2-total-real2', fmtF(n_real));         // Total combinado: 23,292
    _idxSet('idx-s2-total-real3', fmtF(n_gmaps_clean));  // GMaps limpios en resumen

    // ── PASO 3: Cruces ─────────────────────────────────────────────────────────
    const gm_denue = m_denue - OSM.n_denue;        // 8,901 − 1,010 = 7,891
    const gm_canaco = n_fb - OSM.n_canaco;        // 3,809 − 243   = 3,566
    _idxSet('idx-s3-total-ref', fmtF(n_real));
    _idxSet('idx-s3-gm-denue', fmtF(gm_denue));
    _idxSet('idx-s3-total-denue', fmtF(m_denue));
    _idxSet('idx-s3-gm-canaco', fmtF(gm_canaco));
    _idxSet('idx-s3-total-canaco', fmtF(n_fb));

    // ── PASO 4: Clasificación ──────────────────────────────────────────────────
    _idxSet('idx-s4-f-denue', fmtF(m_denue));
    _idxSet('idx-s4-f-otros', fmtF(n_fb + n_fo));
    _idxSet('idx-s4-canaco', fmtF(n_fb));
    _idxSet('idx-s4-cadenas', fmtF(n_fo));
    _idxSet('idx-s4-informales', fmtF(n_inf));
    // Verificación: suma debe ser igual a n_real
    _idxSet('idx-s4-f-denue2', fmtF(m_denue));
    _idxSet('idx-s4-f-otros2', fmtF(n_fb + n_fo));
    _idxSet('idx-s4-informales2', fmtF(n_inf));
    _idxSet('idx-s4-total', fmtF(n_real));

    // ── PASO 5: Chapman ────────────────────────────────────────────────────────
    const n1_cr = n_gmaps_clean;   // GMaps limpios: 20,736 (calculado en Paso 2)
    const n2_cr = OSM.n_total;            // OSM solos:  2,556
    const m_cr = OSM.overlap;            // coincidencias: 402
    const N_hat = Math.round((n1_cr + 1) * (n2_cr + 1) / (m_cr + 1) - 1);
    const N_inf_cr = N_hat - N_DENUE_MERIDA;
    const rate_cr = N_inf_cr / N_hat * 100;

    _idxSet('idx-s5-n1', fmtF(n1_cr));
    _idxSet('idx-s5-n1b', fmtF(n1_cr));
    _idxSet('idx-s5-Nhat', fmtF(N_hat));
    _idxSet('idx-s5-Nhat2', fmtF(N_hat));
    _idxSet('idx-s5-Ninf', fmtF(Math.max(0, N_inf_cr)));
    _idxSet('idx-s5-rate', rate_cr.toFixed(1) + '%');

    // ── PASO 6: Multiplicador ──────────────────────────────────────────────────
    const p_f_pct = d.cobertura_gmaps_pct;
    const p_f65 = (p_f_pct * 0.65).toFixed(2);
    _idxSet('idx-s6-cobertura', p_f_pct + '%');
    _idxSet('idx-s6-cobertura65', p_f65 + '%');
    _idxSet('idx-s6-ninf-obs', fmtF(n_inf));

    const colores = ['#94a3b8', '#60a5fa', '#f59e0b', '#f87171'];
    const labels_alpha = [
      'Los informales tienen la misma visibilidad digital — escenario optimista',
      'Los informales tienen 20% menos visibilidad digital',
      'Los informales tienen 35% menos visibilidad digital — escenario base',
      'Los informales tienen 50% menos visibilidad digital — escenario conservador',
    ];
    const elScen = document.getElementById('idx-s6-scenarios');
    if (elScen) elScen.innerHTML = d.escenarios.map((e, i) => {
      const w = Math.min(100, e.indice_pct * 1.2);
      return `
        <div style="background:#070f1f;border:1px solid #0f2040;border-radius:10px;padding:16px 18px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;gap:12px">
            <div>
              <span style="font-size:13px;font-weight:700;color:${colores[i]}">${e.etiqueta}</span>
              <span style="font-size:10px;color:#334155;margin-left:8px">α = ${e.alpha.toFixed(2)}</span>
              <div style="font-size:11px;color:#475569;margin-top:4px">${labels_alpha[i]}</div>
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div style="font-size:24px;font-weight:800;color:${colores[i]}">${e.indice_pct}%</div>
              <div style="font-size:10px;color:#334155">${fmtF(e.N_inf_estimado)} informales est.</div>
            </div>
          </div>
          <div style="background:#0d1830;border-radius:4px;height:6px;overflow:hidden">
            <div style="width:${w}%;height:100%;background:${colores[i]};border-radius:4px;transition:width .6s ease"></div>
          </div>
        </div>`;
    }).join('');

    // ── Escenario α=0.40 (límite superior realista) ───────────────────────────
    const p_f_dec = d.cobertura_gmaps_pct / 100;
    const N_inf40 = Math.round(n_inf / (0.40 * p_f_dec));
    const rate40 = N_inf40 / (N1 + N_inf40) * 100;
    if (elScen) elScen.innerHTML += `
      <div style="background:#070f1f;border:1px solid #dc262633;border-radius:10px;padding:16px 18px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;gap:12px">
          <div>
            <span style="font-size:13px;font-weight:700;color:#dc2626">Límite superior realista</span>
            <span style="font-size:10px;color:#334155;margin-left:8px">α = 0.40</span>
            <div style="font-size:11px;color:#475569;margin-top:4px">Los informales tienen 60% menos visibilidad digital — respaldado en literatura sobre economía informal urbana</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-size:24px;font-weight:800;color:#dc2626">${rate40.toFixed(1)}%</div>
            <div style="font-size:10px;color:#334155">${fmtF(N_inf40)} informales est.</div>
          </div>
        </div>
        <div style="background:#0d1830;border-radius:4px;height:6px;overflow:hidden">
          <div style="width:${Math.min(100, rate40 * 1.2)}%;height:100%;background:#dc2626;border-radius:4px;transition:width .6s ease"></div>
        </div>
      </div>`;

    // ── CONCLUSIÓN ─────────────────────────────────────────────────────────────
    _idxSet('idx-s7-low', rate_cr.toFixed(1) + '%');
    _idxSet('idx-s7-central', rate40.toFixed(1) + '%');
    _idxSet('idx-s7-rango', rate_cr.toFixed(1) + '%–' + rate40.toFixed(1) + '%');

    // ── Referencias ────────────────────────────────────────────────────────────
    const elRefs = document.getElementById('idx-s-refs');
    if (elRefs) elRefs.innerHTML = d.referencias.map(r => `<div>· ${r}</div>`).join('');

    // Guardar estado calculado para que la calculadora pueda actualizar con Firestore
    _indiceCalc = {
      rate_cr,          // Chapman: 57.4%
      rate40,           // Multiplicador α=0.40: 62.6%
      p_f_dec,          // cobertura GMaps sobre DENUE (0.0616…)
      n_inf_base: n_inf // informales base del cruce: 5,966
    };

    _renderCalculadoraIndice();

  } catch (e) {
    console.error('Error cargando índice:', e);
  }
}

function _renderCalculadoraIndice() {
  const el = document.getElementById('calc-indice');
  if (!el || !_indiceBase || !_indiceCalc) return;
  el.innerHTML = `
    <div style="font-size:10px;font-weight:700;color:#3b82f6;text-transform:uppercase;
                letter-spacing:2px;margin-bottom:6px">Estimación viva · validaciones de campo</div>
    <p style="font-size:12px;color:#475569;margin:0 0 16px;line-height:1.6">
      Se recalcula con los candidatos marcados en el mapa (Firestore). El <strong style="color:#8b5cf6">Chapman no cambia</strong> — solo depende de Google Maps y OSM, no de las validaciones manuales.
    </p>
    <div id="calc-resultado"></div>`;
  _calcIndice();
}

function _calcIndice() {
  const el = document.getElementById('calc-resultado');
  if (!el || !_indiceBase || !_indiceCalc) return;

  const b = _indiceBase;
  const c = _indiceCalc;
  const N1 = b.datos_entrada.N1_denue;
  const ninfBase = c.n_inf_base;                // 5,966 — cruce_completo.csv
  const p_f = c.p_f_dec;                   // cobertura GMaps/DENUE
  const esc_c65 = b.escenarios[2];             // α=0.65 base
  const fmtN = n => Math.round(n).toLocaleString('es-MX');
  const fmtP = v => v.toFixed(1) + '%';

  const hayFirestore = allData.length > 0;
  const ninfObs = hayFirestore
    ? allData.filter(c => !c.tipo || c.tipo === 'informal').length
    : ninfBase;
  const formales = hayFirestore ? allData.filter(c => c.tipo === 'formal').length : 0;
  const enProceso = hayFirestore ? allData.filter(c => c.tipo === 'en_proceso').length : 0;

  // Multiplicador con el conteo actualizado de Firestore
  const calcEsc = alpha => {
    const N_inf = ninfObs / (alpha * p_f);
    return { N_inf: Math.round(N_inf), rate: N_inf / (N1 + N_inf) * 100 };
  };
  const e65 = calcEsc(0.65);
  const e40 = calcEsc(0.40);

  // Deltas contra el resultado base del mismo escenario
  const delta65 = (e65.rate - esc_c65.indice_pct).toFixed(1);
  const delta40 = (e40.rate - c.rate40).toFixed(1);

  const deltaChip = (d) => {
    const color = +d <= 0 ? '#22c55e' : '#f87171';
    const sign = +d > 0 ? '+' : '';
    return `<span style="font-size:10px;font-weight:700;color:${color}">${sign}${d}pp vs base</span>`;
  };

  const barLine = (pct, color) => {
    const w = Math.min(100, pct * 1.2).toFixed(1);
    return `<div style="background:#0d1830;border-radius:3px;height:5px;overflow:hidden;margin-top:6px">
      <div style="width:${w}%;height:100%;background:${color};border-radius:3px;transition:width .5s ease"></div>
    </div>`;
  };

  // Conteos de campo
  const cuentas = `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px">
      <div style="background:#070f1f;border:1px solid #f8717122;border-radius:8px;padding:10px;text-align:center">
        <div style="font-size:10px;color:#f87171;text-transform:uppercase;margin-bottom:3px">Informales obs.</div>
        <div style="font-size:20px;font-weight:800;color:#f87171">${fmtN(ninfObs)}</div>
        <div style="font-size:10px;color:#334155">${hayFirestore ? 'Firestore' : 'base cruce'}</div>
      </div>
      <div style="background:#070f1f;border:1px solid #22c55e22;border-radius:8px;padding:10px;text-align:center">
        <div style="font-size:10px;color:#22c55e;text-transform:uppercase;margin-bottom:3px">Confirmados formales</div>
        <div style="font-size:20px;font-weight:800;color:#22c55e">${fmtN(formales)}</div>
        <div style="font-size:10px;color:#334155">${hayFirestore ? 'validados campo' : '—'}</div>
      </div>
      <div style="background:#070f1f;border:1px solid #f59e0b22;border-radius:8px;padding:10px;text-align:center">
        <div style="font-size:10px;color:#f59e0b;text-transform:uppercase;margin-bottom:3px">En proceso</div>
        <div style="font-size:20px;font-weight:800;color:#f59e0b">${fmtN(enProceso)}</div>
        <div style="font-size:10px;color:#334155">${hayFirestore ? 'pendientes' : '—'}</div>
      </div>
    </div>`;

  // Tarjetas de escenario coherentes con Paso 5 y Paso 6
  const tarjetas = `
    <div style="display:flex;flex-direction:column;gap:8px">

      <!-- Chapman: fijo, no cambia con Firestore -->
      <div style="background:#070f1f;border:1px solid #8b5cf633;border-radius:10px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:12px;font-weight:700;color:#8b5cf6">Chapman · Captura-Recaptura</div>
          <div style="font-size:11px;color:#334155;margin-top:3px">Fijo — no usa validaciones de campo (solo GMaps/OSM)</div>
          ${barLine(c.rate_cr, '#8b5cf6')}
        </div>
        <div style="text-align:right;flex-shrink:0;margin-left:16px">
          <div style="font-size:26px;font-weight:800;color:#8b5cf6">${fmtP(c.rate_cr)}</div>
          <div style="font-size:10px;color:#334155">ancla · sin supuestos</div>
        </div>
      </div>

      <!-- Multiplicador α=0.65 actualizado -->
      <div style="background:#070f1f;border:1px solid #f59e0b33;border-radius:10px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center">
        <div style="flex:1">
          <div style="font-size:12px;font-weight:700;color:#f59e0b">Multiplicador · α = 0.65 <span style="font-weight:400;color:#334155">(central)</span></div>
          <div style="font-size:11px;color:#334155;margin-top:3px">${fmtN(ninfObs)} inf. obs. × factor → ${fmtN(e65.N_inf)} est.</div>
          ${deltaChip(delta65)}
          ${barLine(e65.rate, '#f59e0b')}
        </div>
        <div style="text-align:right;flex-shrink:0;margin-left:16px">
          <div style="font-size:26px;font-weight:800;color:#f59e0b">${fmtP(e65.rate)}</div>
          <div style="font-size:10px;color:#334155">base: ${esc_c65.indice_pct}%</div>
        </div>
      </div>

      <!-- Multiplicador α=0.40 actualizado -->
      <div style="background:#070f1f;border:1px solid #dc262633;border-radius:10px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center">
        <div style="flex:1">
          <div style="font-size:12px;font-weight:700;color:#dc2626">Multiplicador · α = 0.40 <span style="font-weight:400;color:#334155">(límite superior)</span></div>
          <div style="font-size:11px;color:#334155;margin-top:3px">${fmtN(ninfObs)} inf. obs. × factor → ${fmtN(e40.N_inf)} est.</div>
          ${deltaChip(delta40)}
          ${barLine(e40.rate, '#dc2626')}
        </div>
        <div style="text-align:right;flex-shrink:0;margin-left:16px">
          <div style="font-size:26px;font-weight:800;color:#dc2626">${fmtP(e40.rate)}</div>
          <div style="font-size:10px;color:#334155">base: ${fmtP(c.rate40)}</div>
        </div>
      </div>

    </div>
    ${!hayFirestore
      ? `<div style="margin-top:12px;font-size:11px;color:#334155;text-align:center;padding:10px;border:1px dashed #1a2d56;border-radius:8px">
          Marca candidatos en el mapa para ver cómo cambian los escenarios α con tus validaciones reales.
        </div>`
      : ''}`;

  el.innerHTML = cuentas + tarjetas;
}

/* ── Precargas en background ─────────────────────────────────────────────────
   Se llama desde _bootApp (auth.js) después del login. Dispara todos los fetches
   en paralelo para que cada tab cargue instantáneo al abrirse.              */
window._preloads = {};

function _iniciarPrecargas() {
  window._preloads.colonias = fetch('/api/colonias').then(r => r.json()).catch(() => []);
  window._preloads.indice = fetch('/api/indice').then(r => r.json()).catch(() => null);
  window._preloads.validacion = fetch('/api/muestra-validacion').then(r => r.json()).catch(() => null);
  window._preloads.campanas = fetch('/api/campanas').then(r => r.json()).catch(() => []);
  window._preloads.reportes = fetch('/api/reportes').then(r => r.json()).catch(() => []);
  window._preloads.predicciones = fetch('/api/predicciones').then(r => r.json()).catch(() => []);
}

/* ── Init ────────────────────────────────────────────────────────────────────── */
// Las llamadas a API se disparan desde _bootApp (auth.js) una vez confirmado el login,
// con el token de Firebase ya inyectado en fetch. No llamar aquí.
