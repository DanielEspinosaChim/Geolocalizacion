/* ══════════════════════════════════════════════════════════════════════════
   reportes.js — Reportes ciudadanos (baches, luminarias, etc.)
   ══════════════════════════════════════════════════════════════════════════ */

let reporteMode      = false;
let reporteMarkerTmp = null;
let reporteMarkers   = [];
let reportesLayer    = null;
let reporteLatLng    = null;

const REPORTE_ICONS = {
  bache:     { emoji: "🕳️", color: "#b45309" },
  luminaria:  { emoji: "💡", color: "#ca8a04" },
  basura:     { emoji: "🗑️", color: "#65a30d" },
  arbol:      { emoji: "🌳", color: "#16a34a" },
  vandalism:  { emoji: "🔨", color: "#dc2626" },
  otro:       { emoji: "⚠️", color: "#6b7280" },
};

const STATUS_LABELS = {
  pendiente:  { label: "Pendiente",   color: "#dc2626", bg: "#fee2e2" },
  en_proceso: { label: "En proceso",  color: "#d97706", bg: "#fef3c7" },
  resuelto:   { label: "Resuelto",    color: "#16a34a", bg: "#dcfce7" },
};

// ── Preview de foto seleccionada ─────────────────────────────────────────────

function _reporteAbrirCamara() {
  _abrirCamara('reporte-foto', file => {
    const dt = new DataTransfer();
    dt.items.add(file);
    document.getElementById('reporte-foto').files = dt.files;
    _reporteFotoChange();
  });
}

function _reporteAbrirGaleria() {
  const inp = document.getElementById('reporte-foto');
  inp.removeAttribute('capture');
  inp.click();
}

function _reporteFotoChange() {
  const input = document.getElementById('reporte-foto');
  const prev  = document.getElementById('reporte-foto-prev');
  const wrap  = document.getElementById('reporte-foto-wrap');
  if (!input || !input.files[0] || !prev) return;
  const url = URL.createObjectURL(input.files[0]);
  prev.src = url;
  prev.onclick = () => window.open(url);
  if (wrap) wrap.style.display = 'inline-flex';
}

function _reporteClearFoto() {
  const inp  = document.getElementById('reporte-foto');
  const prev = document.getElementById('reporte-foto-prev');
  const wrap = document.getElementById('reporte-foto-wrap');
  if (inp)  inp.value = '';
  if (prev) prev.src = '';
  if (wrap) wrap.style.display = 'none';
}

// ── Modo clic en mapa para colocar reporte ───────────────────────────────────

function toggleReporteMode() {
  reporteMode = !reporteMode;
  const btn = document.getElementById("btn-reporte-mode");
  if (reporteMode) {
    btn.textContent = "🔴 Cancelar — clic para colocar";
    btn.classList.add("pred-on");
    map.getContainer().style.cursor = "crosshair";
    // Escuchar clic en mapa
    map.once("click", _onMapClickReporte);
  } else {
    btn.textContent = "📍 Clic en el mapa para ubicar";
    btn.classList.remove("pred-on");
    map.getContainer().style.cursor = "";
    map.off("click", _onMapClickReporte);
    if (reporteMarkerTmp) { map.removeLayer(reporteMarkerTmp); reporteMarkerTmp = null; }
  }
}

async function _setReporteUbicacion(lat, lng) {
  reporteLatLng = { lat, lng };
  document.getElementById("reporte-lat").value = lat.toFixed(6);
  document.getElementById("reporte-lng").value = lng.toFixed(6);

  // Marcador temporal
  if (reporteMarkerTmp) map.removeLayer(reporteMarkerTmp);
  reporteMarkerTmp = L.marker([lat, lng], {
    icon: L.divIcon({
      className: "",
      html: `<div style="background:#f97316;color:#fff;border-radius:50%;width:28px;height:28px;
                         display:flex;align-items:center;justify-content:center;font-size:16px;
                         border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)">📍</div>`,
      iconSize: [28, 28], iconAnchor: [14, 14],
    }),
  }).addTo(map);
  // Reverse geocoding con Nominatim
  document.getElementById("reporte-direccion").value = "Obteniendo dirección…";
  try {
    const r   = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
    const d   = await r.json();
    const dir = d.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    document.getElementById("reporte-direccion").value = dir.split(",").slice(0, 3).join(",");
  } catch {
    document.getElementById("reporte-direccion").value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

async function _reporteAutoUbicacion() {
  const btn = document.getElementById("btn-reporte-mode");
  // No repetir si ya hay una ubicación cargada
  if (document.getElementById("reporte-lat").value) return;
  if (btn) { btn.textContent = "⏳ Obteniendo tu ubicación…"; btn.disabled = true; }
  try {
    const pos = await _obtenerGPS();
    await _setReporteUbicacion(pos.coords.latitude, pos.coords.longitude);
    if (btn) {
      btn.textContent = `✓ Ubicación obtenida (±${Math.round(pos.coords.accuracy)}m) — o clic para cambiar`;
      btn.disabled = false;
      btn.onclick = toggleReporteMode;
    }
  } catch {
    if (btn) {
      btn.textContent = "📍 Clic en el mapa para ubicar";
      btn.disabled = false;
    }
  }
}

async function _onMapClickReporte(e) {
  reporteMode = false;
  map.getContainer().style.cursor = "";
  const btn = document.getElementById("btn-reporte-mode");
  if (btn) { btn.textContent = "📍 Clic en el mapa para cambiar"; btn.classList.remove("pred-on"); }
  await _setReporteUbicacion(e.latlng.lat, e.latlng.lng);
}

// ── Enviar reporte ────────────────────────────────────────────────────────────

async function enviarReporte(e) {
  e.preventDefault();
  const lat = document.getElementById("reporte-lat").value;
  const lng = document.getElementById("reporte-lng").value;
  if (!lat || !lng) { alert("Primero ubica el problema en el mapa."); return; }

  const btn = document.getElementById("btn-enviar-reporte");
  btn.disabled = true;
  btn.textContent = "Enviando…";

  const fd = new FormData();
  fd.append("tipo",        document.getElementById("reporte-tipo").value);
  fd.append("lat",         lat);
  fd.append("lng",         lng);
  fd.append("descripcion", document.getElementById("reporte-desc").value);
  fd.append("direccion",   document.getElementById("reporte-direccion").value);
  const foto = document.getElementById("reporte-foto").files[0];
  if (foto) fd.append("foto", foto);

  try {
    const resp = await fetch("/api/reportes", { method: "POST", body: fd });
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.detail || "Error al enviar");
    }
    // Limpiar formulario
    document.getElementById("form-reporte").reset();
    document.getElementById("reporte-lat").value = "";
    document.getElementById("reporte-lng").value = "";
    document.getElementById("reporte-direccion").value = "";
    const btnMode = document.getElementById("btn-reporte-mode");
    if (btnMode) { btnMode.textContent = "📍 Clic en el mapa para ubicar"; btnMode.disabled = false; }
    _reporteClearFoto();
    if (reporteMarkerTmp) { map.removeLayer(reporteMarkerTmp); reporteMarkerTmp = null; }
    reporteLatLng = null;
    // Recargar lista y mapa
    await cargarReportes();
    document.getElementById("reporte-exito").style.display = "block";
    setTimeout(() => document.getElementById("reporte-exito").style.display = "none", 3000);
  } catch (err) {
    alert("Error: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "📤 Enviar reporte";
  }
}

// ── Cargar y mostrar reportes ─────────────────────────────────────────────────

let _reportesCargados = false;
async function cargarReportes() {
  try {
    const filtro = document.getElementById("filtro-status-reporte")?.value || "";
    let reportes;
    if (!filtro && !_reportesCargados && window._preloads?.reportes) {
      reportes = await window._preloads.reportes;
      _reportesCargados = true;
    } else {
      let url = "/api/reportes?limit=200";
      if (filtro) url += `&status=${filtro}`;
      reportes = await fetch(url).then(r => r.json());
    }
    _renderListaReportes(reportes);
    _renderReportesEnMapa(reportes);
  } catch (e) {
    console.warn("[reportes] Error cargando reportes:", e.message);
  }
}

function _renderListaReportes(reportes) {
  const el = document.getElementById("lista-reportes");
  if (!el) return;
  if (!reportes.length) {
    el.innerHTML = '<p style="color:#475569;font-size:11px;padding:12px">No hay reportes registrados.</p>';
    return;
  }
  el.innerHTML = reportes.map(r => {
    const ico = REPORTE_ICONS[r.tipo] || REPORTE_ICONS.otro;
    const st  = STATUS_LABELS[r.status] || STATUS_LABELS.pendiente;
    return `
    <div class="reporte-item" id="ri-${r.id}">
      <div style="display:flex;gap:8px;align-items:flex-start">
        <span style="font-size:20px">${ico.emoji}</span>
        <div style="flex:1;overflow:hidden">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:4px">
            <span style="font-size:12px;font-weight:700;text-transform:capitalize">${r.tipo}</span>
            <span style="font-size:10px;padding:2px 7px;border-radius:10px;font-weight:700;
                         background:${st.bg};color:${st.color}">${st.label}</span>
          </div>
          <div style="font-size:10px;color:#64748b;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            ${r.descripcion || r.direccion || "Sin descripción"}
          </div>
          <div style="font-size:10px;color:#475569;margin-top:4px">${(r.fecha||"").slice(0,10)}</div>
        </div>
      </div>
      ${r.foto_url ? `<img src="${r.foto_url}" onclick="window.open('${r.foto_url}')"
        style="width:100%;max-height:140px;object-fit:cover;border-radius:6px;margin-top:6px;cursor:pointer">` : ""}
      ${r.status === 'resuelto' && r.verificado_distancia != null ? (() => {
        const d = r.verificado_distancia;
        const color = d <= 100 ? '#22c55e' : d <= 300 ? '#f59e0b' : '#ef4444';
        const bg    = d <= 100 ? '#14532d22' : d <= 300 ? '#78350f22' : '#7f1d1d22';
        const fecha = (r.verificado_fecha || '').slice(0, 10);
        return `<div style="margin-top:5px;padding:4px 8px;border-radius:6px;background:${bg};
                             border:1px solid ${color}30;display:flex;align-items:center;gap:5px">
          <span style="font-size:12px">📍</span>
          <span style="font-size:10px;color:${color};font-weight:600">
            Verificado a ${d} m${fecha ? ' · ' + fecha : ''}
          </span>
        </div>`;
      })() : ''}
      <div style="display:flex;gap:4px;margin-top:6px">
        ${r.status !== "resuelto" ? `
          <button onclick="actualizarStatusReporte('${r.id}','${r.status === 'pendiente' ? 'en_proceso' : 'resuelto'}',${r.lat||0},${r.lng||0})"
                  style="flex:1;padding:4px 0;border-radius:5px;border:1px solid #334155;
                         background:#0f172a;color:#94a3b8;font-size:10px;cursor:pointer">
            ${r.status === 'pendiente' ? '▶ En proceso' : '✓ Resolver'}
          </button>` : ""}
        <button onclick="irAReporte(${r.lat},${r.lng})"
                style="padding:4px 8px;border-radius:5px;border:1px solid #334155;
                       background:transparent;color:#64748b;font-size:10px;cursor:pointer">
          📍
        </button>
        <button onclick="eliminarReporte('${r.id}')"
                style="padding:4px 8px;border-radius:5px;border:1px solid #7f1d1d;
                       background:transparent;color:#f87171;font-size:10px;cursor:pointer">
          🗑
        </button>
      </div>
    </div>`;
  }).join("");
}

function _renderReportesEnMapa(reportes) {
  if (reportesLayer) map.removeLayer(reportesLayer);
  reportesLayer = L.layerGroup().addTo(map);
  reportes.forEach(r => {
    if (!r.lat || !r.lng) return;
    const ico = REPORTE_ICONS[r.tipo] || REPORTE_ICONS.otro;
    const st  = STATUS_LABELS[r.status] || STATUS_LABELS.pendiente;
    const marker = L.marker([r.lat, r.lng], {
      icon: L.divIcon({
        className: "",
        html: `<div style="background:${ico.color};color:#fff;border-radius:50%;
                           width:30px;height:30px;display:flex;align-items:center;
                           justify-content:center;font-size:15px;border:3px solid #fff;
                           box-shadow:0 2px 6px rgba(0,0,0,.4);
                           ${r.status === 'resuelto' ? 'opacity:.5' : ''}">${ico.emoji}</div>`,
        iconSize: [30, 30], iconAnchor: [15, 15],
      }),
    }).bindPopup(`
      <div style="font-family:'Inter',sans-serif;min-width:160px">
        <div style="font-weight:700;font-size:13px;margin-bottom:4px;text-transform:capitalize">${r.tipo}</div>
        <div style="font-size:11px;color:#64748b;margin-bottom:6px">${r.descripcion || "Sin descripción"}</div>
        ${r.foto_url ? `<img src="${r.foto_url}" style="width:100%;border-radius:4px;margin-bottom:6px">` : ""}
        <div style="font-size:10px;padding:2px 8px;border-radius:10px;display:inline-block;
                    background:${st.bg};color:${st.color};font-weight:700">${st.label}</div>
        <div style="font-size:10px;color:#94a3b8;margin-top:4px">${(r.fecha||"").slice(0,10)}</div>
        ${r.verificado_distancia != null ? (() => {
          const d = r.verificado_distancia;
          const c = d <= 100 ? '#22c55e' : d <= 300 ? '#f59e0b' : '#ef4444';
          return `<div style="font-size:10px;color:${c};margin-top:3px;font-weight:600">📍 Verificado a ${d} m</div>`;
        })() : ''}
      </div>
    `);
    marker.addTo(reportesLayer);
  });
}

// ── Acciones ─────────────────────────────────────────────────────────────────

function _haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

async function _obtenerGPS() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('sin-gps')); return; }
    navigator.geolocation.getCurrentPosition(resolve, reject,
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 0 });
  });
}

async function actualizarStatusReporte(id, nuevoStatus, rLat, rLng) {
  const updates = { status: nuevoStatus };

  if (nuevoStatus === 'resuelto') {
    // Intentar capturar ubicación del técnico
    let gpsOk = false;
    try {
      const pos = await _obtenerGPS();
      const uLat = pos.coords.latitude;
      const uLng = pos.coords.longitude;
      updates.verificado_lat       = uLat;
      updates.verificado_lng       = uLng;
      updates.verificado_precision = Math.round(pos.coords.accuracy);
      updates.verificado_distancia = _haversineM(rLat, rLng, uLat, uLng);
      updates.verificado_fecha     = new Date().toISOString();
      gpsOk = true;
    } catch (e) {
      const razon = e.code === 1 ? 'Permiso de ubicación denegado'
                  : e.code === 2 ? 'Ubicación no disponible'
                  : e.code === 3 ? 'Tiempo de espera agotado'
                  : 'No se pudo obtener tu ubicación';
      const continuar = confirm(`${razon}.\n\n¿Marcar como resuelto sin verificar tu posición?`);
      if (!continuar) return;
    }
    // Aviso si está muy lejos
    if (gpsOk && updates.verificado_distancia > 300) {
      const ok = confirm(
        `Estás a ${updates.verificado_distancia} m del reporte.\n` +
        `¿Confirmas que estás en el lugar correcto?`
      );
      if (!ok) return;
    }
  }

  const resp = await fetch(`/api/reportes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (resp.ok) await cargarReportes();
}

async function eliminarReporte(id) {
  if (!confirm("¿Eliminar este reporte?")) return;
  const resp = await fetch(`/api/reportes/${id}`, { method: "DELETE" });
  if (resp.ok) await cargarReportes();
}

function irAReporte(lat, lng) {
  map.setView([lat, lng], 17);
  showTab("mapa");
}
