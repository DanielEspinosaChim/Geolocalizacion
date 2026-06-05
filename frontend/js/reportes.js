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

async function _onMapClickReporte(e) {
  reporteMode = false;
  map.getContainer().style.cursor = "";
  const btn = document.getElementById("btn-reporte-mode");
  if (btn) { btn.textContent = "📍 Clic en el mapa para ubicar"; btn.classList.remove("pred-on"); }

  reporteLatLng = e.latlng;
  document.getElementById("reporte-lat").value = e.latlng.lat.toFixed(6);
  document.getElementById("reporte-lng").value = e.latlng.lng.toFixed(6);

  // Marcador temporal
  if (reporteMarkerTmp) map.removeLayer(reporteMarkerTmp);
  reporteMarkerTmp = L.marker(e.latlng, {
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
    const r   = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${e.latlng.lat}&lon=${e.latlng.lng}&format=json`);
    const d   = await r.json();
    const dir = d.display_name || `${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`;
    document.getElementById("reporte-direccion").value = dir.split(",").slice(0, 3).join(",");
  } catch {
    document.getElementById("reporte-direccion").value = `${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`;
  }
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
      <div style="display:flex;gap:4px;margin-top:6px">
        ${r.status !== "resuelto" ? `
          <button onclick="actualizarStatusReporte('${r.id}','${r.status === 'pendiente' ? 'en_proceso' : 'resuelto'}')"
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
      </div>
    `);
    marker.addTo(reportesLayer);
  });
}

// ── Acciones ─────────────────────────────────────────────────────────────────

async function actualizarStatusReporte(id, nuevoStatus) {
  const resp = await fetch(`/api/reportes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: nuevoStatus }),
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
