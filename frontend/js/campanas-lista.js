/* ══════════════════════════════════════════════════════════════════════════
   campanas-lista.js — Lista, detalle y gestión de campañas
   ══════════════════════════════════════════════════════════════════════════ */

let campanaActualId = null;
let _campanaNegocios = [];   // negocios de la campaña actual
let _busquedaAbierta = false;
let _plantillasCache = [];
let _visitaModal = { negocioId: null, nombre: null };
let _plantillaEditorId = null;
let _epCampos = [];

// ── Estado técnico ────────────────────────────────────────────────────────────
let _tecnicoFiltro = "pendientes"; // "pendientes" | "todos"

// ── Lista de campañas ─────────────────────────────────────────────────────────

async function cargarCampanas() {
  const filtro = document.getElementById("filtro-status-campana")?.value || "";
  let campanas;
  // Usar preload si está disponible y no hay filtro activo
  if (!filtro && window._preloads?.campanas) {
    campanas = await window._preloads.campanas;
    window._preloads.campanas = null; // consumir: próximas llamadas van directo al server
  } else {
    let url = "/api/campanas";
    if (filtro) url += `?status=${filtro}`;
    campanas = await fetch(url).then(r => r.json());
  }

  // Modo técnico: solo mostrar campañas asignadas a este usuario
  if (window._tecnicoMode && window._currentUser) {
    campanas = campanas.filter(c => c.asignado_a === window._currentUser.uid);
    _renderListaCampanasTecnico(campanas);
    return;
  }
  _renderListaCampanas(campanas);
}

function _renderListaCampanas(campanas) {
  const el = document.getElementById("campanas-lista");
  if (!el) return;

  if (!campanas.length) {
    el.innerHTML = `<div class="campanas-cards-grid">
      <div style="grid-column:1/-1;color:#334155;font-size:13px;padding:60px 20px;
        text-align:center;line-height:1.8">
        <div style="font-size:40px;margin-bottom:12px;opacity:.4">📋</div>
        No hay campañas aún.<br>
        <span style="color:#475569">Crea la primera con <b style="color:#60a5fa">+ Nueva campaña</b>.</span>
      </div>
    </div>`;
    return;
  }

  // Colores de status alineados con el resto de la app (solo para el acento izquierdo)
  const ST_COLOR = { activa: "#3b82f6", cerrada: "#475569", cancelada: "#ef4444" };
  const ST_LABEL = { activa: "Activa", cerrada: "Finalizada", cancelada: "Cancelada" };

  const cards = campanas.map(c => {
    const total = c.total_negocios || 0;
    const hecho = c.total_completados || 0;
    const pct = total ? Math.round((hecho / total) * 100) : 0;
    const stColor = ST_COLOR[c.status] || "#475569";
    const stLabel = ST_LABEL[c.status] || c.status;
    const cerrada = c.status === "cerrada" || c.status === "cancelada";
    return `
    <div class="campana-card" onclick="verCampana('${c.id}')"
         style="border-left-color:${stColor};${cerrada ? 'opacity:.5;filter:grayscale(.4)' : ''}">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <span class="stat-label" style="margin:0">${stLabel}</span>
        <span style="font-size:13px;font-weight:800;color:${pct === 100 ? '#4ade80' : '#3b6ab5'};
                     font-family:'Plus Jakarta Sans','Inter',sans-serif">${pct}%</span>
      </div>
      <div style="font-size:14px;font-weight:700;color:${cerrada ? '#64748b' : '#f1f5f9'};margin-bottom:6px;
                  overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.nombre}</div>
      ${c.colonia ? `<div style="font-size:11px;color:#475569;margin-bottom:3px">🏘️ ${c.colonia}</div>` : ""}
      ${c.fecha_inicio ? `<div style="font-size:10px;color:#334155;margin-bottom:8px">📅 ${c.fecha_inicio}${c.fecha_fin ? " → " + c.fecha_fin : ""}</div>` : ""}
      <div style="display:flex;justify-content:space-between;font-size:10px;
                  color:#334155;margin-bottom:6px;margin-top:${c.colonia || c.fecha_inicio ? "0" : "8px"}">
        <span>${hecho} / ${total} negocios</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${pct}%;background:${pct === 100 ? '#22c55e' : (cerrada ? '#334155' : '#2563eb')}"></div>
      </div>
    </div>`;
  });
  el.innerHTML = `<div class="campanas-cards-grid">${cards.join("")}</div>`;
}

function _renderListaCampanasTecnico(campanas) {
  const el = document.getElementById("campanas-lista");
  if (!el) return;

  if (!campanas.length) {
    el.innerHTML = `<div style="color:#334155;font-size:13px;padding:60px 20px;text-align:center;line-height:1.9">
      <div style="font-size:40px;margin-bottom:12px;opacity:.4">📋</div>
      No tienes campañas asignadas aún.<br>
      <span style="color:#475569;font-size:11px">Contacta a tu administrador.</span>
    </div>`;
    return;
  }

  const ST_COLOR = { activa: "#3b82f6", cerrada: "#475569", cancelada: "#ef4444" };
  const ST_LABEL = { activa: "Activa", cerrada: "Finalizada", cancelada: "Cancelada" };

  const cards = campanas.map(c => {
    const total = c.total_negocios || 0;
    const hecho = c.total_completados || 0;
    const pct = total ? Math.round((hecho / total) * 100) : 0;
    const done = pct === 100 && total > 0;
    const stColor = ST_COLOR[c.status] || "#475569";
    const stLabel = ST_LABEL[c.status] || c.status;
    return `
    <div onclick="verCampana('${c.id}')"
         style="margin:0 0 10px;padding:18px 20px;border-radius:14px;cursor:pointer;
                background:#080d1c;border:1px solid ${done ? '#166534' : '#111e35'};
                border-left:3px solid ${stColor};transition:border-color .15s"
         onmouseover="this.style.borderColor='${stColor}';this.style.background='#0a1020'"
         onmouseout="this.style.borderColor='${done ? '#166534' : '#111e35'}';this.style.background='#080d1c'">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
        <div style="flex:1;min-width:0;margin-right:12px">
          <div style="font-size:15px;font-weight:800;color:#f1f5f9;
                      font-family:'Plus Jakarta Sans','Inter',sans-serif;
                      white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.nombre}</div>
          ${c.colonia ? `<div style="font-size:11px;color:#3b5080;margin-top:3px">🏘️ ${c.colonia}</div>` : ""}
          ${c.fecha_inicio ? `<div style="font-size:10px;color:#243351;margin-top:2px">📅 ${c.fecha_inicio}${c.fecha_fin ? " → " + c.fecha_fin : ""}</div>` : ""}
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:22px;font-weight:900;color:${done ? '#4ade80' : stColor};
                      font-family:'Plus Jakarta Sans','Inter',sans-serif;line-height:1">${pct}%</div>
          <div style="font-size:9px;color:#334155;margin-top:2px">${hecho}/${total}</div>
        </div>
      </div>
      <div style="background:#0a1428;border-radius:20px;height:4px;overflow:hidden;margin-bottom:12px">
        <div style="height:100%;border-radius:20px;width:${pct}%;
                    background:${done ? '#22c55e' : stColor};transition:width .4s"></div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between">
        <span style="font-size:10px;padding:3px 10px;border-radius:20px;font-weight:700;
                     background:${stColor}18;color:${stColor};border:1px solid ${stColor}30">${stLabel}</span>
        <span style="font-size:11px;color:${done ? '#4ade80' : '#3b82f6'};font-weight:700">
          ${done ? '¡Completada! →' : (total - hecho) + ' pendientes →'}
        </span>
      </div>
    </div>`;
  }).join("");
  el.innerHTML = `<div class="campanas-cards-grid">${cards}</div>`;
}

// ── Detalle de campaña ────────────────────────────────────────────────────────

async function verCampana(id) {
  campanaActualId = id;
  _campanaNegocios = [];
  _busquedaAbierta = false;
  _tecnicoFiltro = "pendientes"; // reset al abrir campaña nueva
  document.getElementById("campanas-lista-view").style.display = "none";
  document.getElementById("campanas-detail-view").style.display = "flex";
  document.getElementById("campana-negocios-body").innerHTML =
    `<div style="grid-column:1/-1;color:#334155;font-size:12px;padding:40px;text-align:center">
      <div class="spin" style="width:20px;height:20px;border-width:2px;margin:0 auto 10px"></div>
      Cargando negocios…
    </div>`;

  const r = await fetch(`/api/campanas/${id}`);
  const d = await r.json();
  _campanaNegocios = d.negocios || [];
  _renderDetalleCampana(d);
}

function _renderDetalleCampana(d) {
  if (window._tecnicoMode) { _renderDetalleCampanaTecnico(d); return; }

  const { campana, negocios } = d;
  const total = campana.total_negocios || 0;
  const hecho = campana.total_completados || 0;
  const pct = total ? Math.round((hecho / total) * 100) : 0;
  const stLabel = { activa: "Activa", cerrada: "Finalizada", cancelada: "Cancelada" }[campana.status] || campana.status;

  // Botón Finalizar ↔ Reactivar según el estado actual
  const btnFin = document.getElementById("btn-finalizar-campana");
  if (btnFin) {
    if (campana.status === "cerrada") {
      btnFin.textContent = "▶ Reactivar campaña";
      btnFin.onclick = reactivarCampana;
      btnFin.style.background = "rgba(34,197,94,.12)";
      btnFin.style.color = "#4ade80";
      btnFin.style.borderColor = "#166534";
    } else {
      btnFin.textContent = "✅ Finalizar campaña";
      btnFin.onclick = cerrarCampana;
      btnFin.style.background = "";
      btnFin.style.color = "";
      btnFin.style.borderColor = "";
    }
  }

  document.getElementById("campana-detail-title").textContent = campana.nombre;
  document.getElementById("campana-detail-meta").innerHTML =
    `<span class="stat-label" style="margin-right:10px">${stLabel}</span>` +
    (campana.colonia ? `<span style="color:#475569">🏘️ ${campana.colonia}</span> · ` : "") +
    `<span style="color:#3b6ab5;font-weight:700">${pct}%</span> completado (${hecho} / ${total})` +
    (campana.fecha_inicio ? ` · <span style="color:#334155">📅 ${campana.fecha_inicio}</span>` : "");

  _renderTablaNegociosCampana(negocios);
}

// ── Vista técnico: detalle de campaña ─────────────────────────────────────────

function _renderDetalleCampanaTecnico(d) {
  const { campana, negocios } = d;
  const total = campana.total_negocios || 0;
  const hecho = campana.total_completados || 0;
  const pendientes = total - hecho;
  const pct = total ? Math.round((hecho / total) * 100) : 0;
  const done = pct === 100 && total > 0;

  // Visitados hoy
  const hoy = new Date().toISOString().slice(0, 10);
  const hoy2 = hoy.split("-").reverse().join("/"); // "dd/mm/yyyy" por si el backend guarda así
  const hoyCount = negocios.filter(n => n.fecha_visita && (n.fecha_visita.startsWith(hoy) || n.fecha_visita.startsWith(hoy2))).length;

  document.getElementById("campana-detail-title").textContent = campana.nombre;

  // Hero de progreso
  document.getElementById("campana-detail-meta").innerHTML = done
    ? `<div style="display:flex;align-items:center;gap:14px;margin-top:4px;
                   padding:14px 16px;border-radius:12px;
                   background:linear-gradient(135deg,rgba(20,83,45,.6),rgba(5,46,22,.4));
                   border:1px solid #166534">
        <div style="font-size:32px;line-height:1">🎉</div>
        <div>
          <div style="font-size:14px;font-weight:800;color:#4ade80;
                      font-family:'Plus Jakarta Sans','Inter',sans-serif">¡Campaña completada!</div>
          <div style="font-size:11px;color:#86efac;margin-top:2px">${total} negocios visitados · 100%</div>
        </div>
      </div>`
    : `<div style="display:flex;gap:16px;align-items:center;margin-top:4px">
        <div style="text-align:center;flex-shrink:0;
                    width:58px;height:58px;border-radius:50%;
                    background:conic-gradient(#3b82f6 ${pct * 3.6}deg, #0a1428 0deg);
                    display:flex;align-items:center;justify-content:center">
          <div style="width:44px;height:44px;border-radius:50%;background:#070f1f;
                      display:flex;align-items:center;justify-content:center;
                      font-size:13px;font-weight:900;color:#3b82f6;
                      font-family:'Plus Jakarta Sans','Inter',sans-serif">${pct}%</div>
        </div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;gap:12px;font-size:12px;margin-bottom:7px;flex-wrap:wrap">
            <span style="color:#f59e0b;font-weight:700">⏳ ${pendientes} pendientes</span>
            <span style="color:#4ade80;font-weight:600">✓ ${hecho} total</span>
            ${hoyCount ? `<span style="color:#818cf8;font-weight:700">📅 ${hoyCount} hoy</span>` : ""}
          </div>
          ${campana.colonia ? `<div style="font-size:10px;color:#3b5080;margin-bottom:5px">🏘️ ${campana.colonia}</div>` : ""}
          <div style="background:#0a1428;border-radius:20px;height:5px;overflow:hidden">
            <div style="height:100%;border-radius:20px;width:${pct}%;
                        background:#3b82f6;transition:width .4s"></div>
          </div>
        </div>
      </div>`;

  // Ocultar herramientas admin
  const toolRow = document.getElementById("btn-plantillas-campana")?.closest('div[style*="space-between"]');
  if (toolRow) toolRow.style.display = "none";

  // Barra de acciones técnico
  let tecBar = document.getElementById("tecnico-action-bar");
  if (!tecBar) {
    tecBar = document.createElement("div");
    tecBar.id = "tecnico-action-bar";
    tecBar.style.cssText = "margin-top:12px;padding-top:12px;border-top:1px solid #111e35";
    document.getElementById("campana-detail-meta").after(tecBar);
  }

  tecBar.innerHTML = `
    <!-- Fila 1: Acciones principales -->
    <div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap">
      <button onclick="verRutaCampana()" id="btn-ver-ruta-campana"
              style="flex:1;min-width:120px;padding:11px 8px;border-radius:9px;border:none;
                     background:linear-gradient(135deg,#2563eb,#1d4ed8);
                     color:#fff;font-size:12px;font-weight:700;cursor:pointer;
                     box-shadow:0 3px 10px rgba(37,99,235,.35);white-space:nowrap">
        📍 Definir ruta
      </button>
      <button onclick="descargarReporteCampana()"
              style="flex-shrink:0;padding:11px 14px;border-radius:9px;border:1px solid #1a2d56;
                     background:transparent;color:#3b6ab5;font-size:12px;font-weight:600;
                     cursor:pointer;white-space:nowrap">
        📄 Reporte
      </button>
    </div>
    <!-- Fila 2: Filtro -->
    <div style="display:flex;gap:6px">
      <button id="tec-filtro-pend" onclick="_tecFiltro('pendientes')"
              style="flex:1;min-width:0;padding:7px 4px;border-radius:7px;font-size:11px;font-weight:700;
                     cursor:pointer;font-family:'Inter',sans-serif;border:none;overflow:hidden;
                     text-overflow:ellipsis;white-space:nowrap;
                     background:${_tecnicoFiltro === 'pendientes' ? '#1e3a8a' : '#0a1428'};
                     color:${_tecnicoFiltro === 'pendientes' ? '#93c5fd' : '#334155'}">
        ⏳ Pendientes (${pendientes})
      </button>
      <button id="tec-filtro-todos" onclick="_tecFiltro('todos')"
              style="flex:1;min-width:0;padding:7px 4px;border-radius:7px;font-size:11px;font-weight:700;
                     cursor:pointer;font-family:'Inter',sans-serif;border:none;overflow:hidden;
                     text-overflow:ellipsis;white-space:nowrap;
                     background:${_tecnicoFiltro === 'todos' ? '#1e3a8a' : '#0a1428'};
                     color:${_tecnicoFiltro === 'todos' ? '#93c5fd' : '#334155'}">
        Todos (${total})
      </button>
    </div>`;

  _renderChecklistTecnico(negocios);
}

// ── Herramientas de campo ─────────────────────────────────────────────────────

// Revierte un negocio visitado de vuelta a pendiente
async function _revertirPendiente(negocioId, btn) {
  if (!confirm("¿Marcar este negocio como pendiente de nuevo?")) return;
  if (btn) { btn.disabled = true; btn.textContent = "…"; }
  try {
    await fetch(`/api/campanas/${campanaActualId}/negocios/${negocioId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completado: false, fecha_visita: "" }),
    });
    const neg = _campanaNegocios.find(n => n.negocio_id === negocioId);
    if (neg) { neg.completado = false; neg.fecha_visita = ""; }
    const r = await fetch(`/api/campanas/${campanaActualId}`);
    const d = await r.json();
    _actualizarMeta(d.campana);
  } catch (e) {
    if (btn) { btn.disabled = false; btn.textContent = "↩ Pendiente"; }
    alert("Error: " + e.message);
  }
}

function _tecFiltro(val) {
  _tecnicoFiltro = val;
  const pendBtn = document.getElementById("tec-filtro-pend");
  const todosBtn = document.getElementById("tec-filtro-todos");
  if (pendBtn) {
    pendBtn.style.background = val === "pendientes" ? "#1e3a8a" : "#0a1428";
    pendBtn.style.color = val === "pendientes" ? "#93c5fd" : "#334155";
  }
  if (todosBtn) {
    todosBtn.style.background = val === "todos" ? "#1e3a8a" : "#0a1428";
    todosBtn.style.color = val === "todos" ? "#93c5fd" : "#334155";
  }
  _renderChecklistTecnico(_campanaNegocios);
}


function _renderChecklistTecnico(negocios) {
  const cont = document.getElementById("campana-negocios-body");
  cont.style.display = "flex";
  cont.style.flexDirection = "column";
  cont.style.gap = "0";

  const pendientes = negocios.filter(n => !n.completado);
  const visitados = negocios.filter(n => n.completado);
  const mostrar = _tecnicoFiltro === "pendientes" ? pendientes : [...pendientes, ...visitados];

  if (!negocios.length) {
    cont.innerHTML = `<div style="color:#334155;font-size:13px;padding:50px 20px;text-align:center">
      <div style="font-size:36px;margin-bottom:10px;opacity:.4">🏪</div>
      Sin negocios asignados aún.
    </div>`;
    return;
  }

  if (!mostrar.length) {
    cont.innerHTML = `<div style="color:#4ade80;font-size:13px;padding:50px 20px;text-align:center;line-height:1.8">
      <div style="font-size:36px;margin-bottom:10px">🎉</div>
      ¡Todos los negocios visitados!<br>
      <button onclick="_tecFiltro('todos')"
              style="margin-top:14px;padding:8px 18px;border-radius:8px;border:1px solid #166534;
                     background:rgba(20,83,45,.3);color:#4ade80;font-size:12px;font-weight:600;cursor:pointer">
        Ver historial completo
      </button>
    </div>`;
    return;
  }

  const items = mostrar.map((n, i) => {
    const visitado = !!n.completado;
    const safeId = n.negocio_id.replace(/'/g, "\\'");
    const safeNombre = (n.nombre || n.negocio_id).replace(/'/g, "\\'").replace(/"/g, "&quot;");
    const sepHtml = _tecnicoFiltro === "todos" && visitado && i > 0 && !mostrar[i - 1].completado
      ? `<div style="font-size:10px;color:#334155;font-weight:700;text-transform:uppercase;
                     letter-spacing:.6px;padding:8px 16px 4px;background:#070f1f;
                     border-top:2px solid #0f1929">✓ Ya visitados</div>` : "";

    const mapsUrl = (n.lat && n.lng)
      ? `https://www.google.com/maps/search/?api=1&query=${n.lat},${n.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((n.nombre || '') + (n.colonia ? ' ' + n.colonia : '') + ' Mérida Yucatán')}`;

    const wazeUrl = (n.lat && n.lng)
      ? `https://waze.com/ul?ll=${n.lat},${n.lng}&navigate=yes`
      : `https://waze.com/ul?q=${encodeURIComponent((n.nombre || '') + (n.colonia ? ' ' + n.colonia : '') + ' Mérida Yucatán')}&navigate=yes`;

    const infoLinea1 = n.nombre || n.negocio_id;
    const infoLinea2 = visitado
      ? [n.fecha_visita ? `✓ ${n.fecha_visita}` : "", n.notas ? `"${n.notas.slice(0, 50)}${n.notas.length > 50 ? '…' : ''}"` : ""].filter(Boolean).join("  ·  ")
      : [n.tipo || "informal", n.colonia || n.direccion || ""].filter(Boolean).join("  ·  ");

    return `${sepHtml}
    <div style="padding:13px 16px 11px;border-bottom:1px solid #0d1526;
                background:${visitado ? '#070e1a' : '#090f1d'}">

      <!-- Fila 1: dot · nombre · foto -->
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:9px">
        <div style="width:10px;height:10px;border-radius:50%;margin-top:4px;flex-shrink:0;
                    background:${visitado ? '#22c55e' : '#f59e0b'};
                    box-shadow:0 0 7px ${visitado ? 'rgba(34,197,94,.55)' : 'rgba(245,158,11,.55)'}">
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:700;
                      color:${visitado ? '#64748b' : '#f1f5f9'};
                      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
                      font-family:'Plus Jakarta Sans','Inter',sans-serif;
                      ${visitado ? 'text-decoration:line-through' : ''}">
            ${infoLinea1}
          </div>
          <div style="font-size:11px;color:${visitado ? '#4ade8099' : '#475569'};
                      margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            ${infoLinea2}
          </div>
        </div>
        ${n.foto_visita_url && visitado
        ? `<img src="${n.foto_visita_url}" onclick="window.open('${n.foto_visita_url}')"
                 style="width:42px;height:42px;object-fit:cover;border-radius:8px;
                        cursor:pointer;flex-shrink:0;border:2px solid #166534"/>` : ""}
      </div>

      <!-- Fila 2: acciones -->
      <div style="display:flex;flex-direction:column;gap:6px;padding-left:20px">

        <!-- Fila nav: Maps + Waze -->
        <div style="display:flex;gap:6px;align-items:center">
          <div style="display:flex;border-radius:8px;overflow:hidden;border:1px solid #1a2d56;flex-shrink:0">
            <a href="${mapsUrl}" target="_blank" rel="noopener"
               style="padding:7px 10px;font-size:11px;font-weight:600;text-decoration:none;
                      background:transparent;color:#3b82f6;display:inline-flex;
                      align-items:center;gap:3px;border-right:1px solid #1a2d56;
                      transition:background .15s"
               onmouseover="this.style.background='rgba(59,130,246,.12)'"
               onmouseout="this.style.background='transparent'">
              📍 Maps
            </a>
            <a href="${wazeUrl}" target="_blank" rel="noopener"
               style="padding:7px 10px;font-size:11px;font-weight:600;text-decoration:none;
                      background:transparent;color:#33ccff;display:inline-flex;
                      align-items:center;gap:3px;transition:background .15s"
               onmouseover="this.style.background='rgba(51,204,255,.1)'"
               onmouseout="this.style.background='transparent'">
              🚗 Waze
            </a>
          </div>

          ${!visitado
          ? `<button onclick="abrirModalVisita('${safeId}','${safeNombre}')"
                      style="flex:1;padding:8px 0;border-radius:8px;font-size:12px;font-weight:700;
                             cursor:pointer;font-family:'Inter',sans-serif;border:none;color:#fff;
                             background:linear-gradient(135deg,#2563eb,#1d4ed8);
                             box-shadow:0 2px 10px rgba(37,99,235,.4)">
                📝 Registrar visita
              </button>`
          : ``}
        </div>

        ${visitado
        ? `<!-- Fila extra: Pendiente + Editar (solo visitados) -->
           <div style="display:flex;gap:6px">
             <button onclick="_revertirPendiente('${safeId}',this)"
                     style="flex:1;padding:7px 0;border-radius:7px;font-size:11px;font-weight:600;
                            cursor:pointer;font-family:'Inter',sans-serif;white-space:nowrap;
                            background:transparent;border:1px solid #7f1d1d;color:#f87171">
               ↩ Pendiente
             </button>
             <button onclick="abrirModalVisita('${safeId}','${safeNombre}')"
                     style="flex:1;padding:7px 0;border-radius:7px;font-size:11px;font-weight:600;
                            cursor:pointer;font-family:'Inter',sans-serif;white-space:nowrap;
                            background:transparent;border:1px solid #1e293b;color:#64748b">
               ✏️ Editar
             </button>
           </div>`
        : ``}
      </div>

    </div>`;
  }).join("");
  cont.innerHTML = `<div>${items}</div>`;
}

function _renderTablaNegociosCampana(negocios) {
  if (window._tecnicoMode) { _renderChecklistTecnico(negocios); return; }
  const cont = document.getElementById("campana-negocios-body");
  if (!negocios.length) {
    cont.innerHTML = `<div style="grid-column:1/-1;color:#334155;font-size:13px;padding:50px 20px;
      text-align:center;line-height:1.8">
      <div style="font-size:36px;margin-bottom:10px;opacity:.4">🏪</div>
      Sin negocios aún.<br>
      <span style="color:#475569">Usa <b style="color:#60a5fa">+ Agregar negocio</b> para añadir.</span>
    </div>`;
    return;
  }
  cont.innerHTML = negocios.map(n => {
    const visitado = n.completado;
    const datos = n.visita_datos || {};
    const resumenHtml = visitado
      ? `<span style="display:inline-block;font-size:10px;color:#475569;
                      background:rgba(71,85,105,.1);padding:2px 8px;
                      border-radius:4px;border:1px solid #1e2d4d">
           ✓ ${datos.resultado || "Visitado"}
         </span>`
      : "";
    const fotoThumb = n.foto_visita_url
      ? `<img src="${n.foto_visita_url}" onclick="window.open('${n.foto_visita_url}')"
              title="Ver foto"
              style="width:52px;height:52px;object-fit:cover;border-radius:6px;
                     cursor:pointer;flex-shrink:0;border:1px solid #1a2d56"/>`
      : "";
    const safeNombre = (n.nombre || n.negocio_id).replace(/'/g, "\\'");
    const metaDatos = [
      datos.interesado ? `Int: <b style="color:#e2e8f0">${datos.interesado}</b>` : "",
      datos.tiene_rfc !== undefined ? `RFC: ${datos.tiene_rfc ? "Sí" : "No"}` : "",
      datos.num_empleados !== undefined && datos.num_empleados !== "" ? `Empl: ${datos.num_empleados}` : "",
    ].filter(Boolean).join(" · ");

    return `
    <div id="cn-row-${n.negocio_id}" class="negocio-campana-card${visitado ? " negocio-visitado" : ""}">
      <!-- Info superior: checkbox + nombre + foto -->
      <div style="display:flex;gap:10px;align-items:flex-start">
        <input type="checkbox" ${visitado ? "checked" : ""}
               onchange="toggleCompletado('${n.negocio_id}', this)"
               style="margin-top:3px;flex-shrink:0;width:15px;height:15px;
                      accent-color:#2563eb;cursor:pointer"/>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:700;color:#f1f5f9;
                      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
                      font-family:'Plus Jakarta Sans','Inter',sans-serif">${n.nombre || n.negocio_id}</div>
          <div style="font-size:10px;color:#64748b;margin-top:2px">${n.tipo || "informal"}</div>
          ${resumenHtml ? `<div style="margin-top:6px">${resumenHtml}</div>` : ""}
          ${metaDatos ? `<div style="font-size:10px;color:#64748b;margin-top:5px;line-height:1.5">${metaDatos}</div>` : ""}
          ${n.notas ? `<div style="font-size:10px;color:#475569;margin-top:4px;line-height:1.4">${n.notas.slice(0, 80)}${n.notas.length > 80 ? "…" : ""}</div>` : ""}
          ${n.visita_lat != null ? (() => {
            const d = n.visita_distancia;
            const c = d != null ? (d <= 100 ? '#22c55e' : d <= 300 ? '#f59e0b' : '#ef4444') : '#64748b';
            const distTxt = d != null ? ` · a ${d} m` : '';
            const dir = n.visita_direccion || `${n.visita_lat.toFixed(5)}, ${n.visita_lng.toFixed(5)}`;
            return `<div class="gps-badge" style="font-size:9px;color:${c};margin-top:3px;font-weight:600;line-height:1.4">📍 ${dir}${distTxt}</div>`;
          })() : ""}
        </div>
        ${fotoThumb}
      </div>
      <!-- Acciones inferiores -->
      <div style="display:flex;gap:6px;margin-top:10px;padding-top:10px;
                  border-top:1px solid #0f1929;align-items:center">
        <button onclick="abrirModalVisita('${n.negocio_id}', '${safeNombre}')"
                style="flex:1;padding:6px 0;border-radius:7px;border:1px solid #1a2d56;
                       background:transparent;color:#3b6ab5;font-size:10px;
                       cursor:pointer;font-family:'Inter',sans-serif;font-weight:600;
                       transition:all .12s"
                onmouseover="this.style.background='rgba(29,58,122,.25)';this.style.color='#94a3b8'"
                onmouseout="this.style.background='transparent';this.style.color='#3b6ab5'">
          📝 ${visitado ? "Editar" : "Registrar"}
        </button>
        <input type="date" value="${n.fecha_visita || ""}"
               class="filtro-input"
               style="font-size:10px;padding:5px 7px;margin:0;width:130px;flex-shrink:0"
               onchange="guardarFechaVisita('${n.negocio_id}', this.value)"/>
        <button onclick="quitarNegocioCampana('${n.negocio_id}')"
                style="width:28px;height:28px;border-radius:6px;border:1px solid #7f1d1d;
                       background:transparent;color:#f87171;font-size:13px;
                       cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center"
                title="Quitar de campaña">🗑</button>
      </div>
    </div>`;
  }).join("");
}

// ── Buscar y agregar negocios ─────────────────────────────────────────────────

function toggleBusquedaAgregar() {
  _busquedaAbierta = !_busquedaAbierta;
  const panel = document.getElementById("panel-agregar-negocio");
  const btn = document.getElementById("btn-toggle-agregar");
  if (_busquedaAbierta) {
    panel.style.display = "block";
    btn.textContent = "✕ Cerrar";
    btn.style.background = "#1e293b";
    document.getElementById("buscar-negocio-input").focus();
    buscarNegociosParaAgregar();
  } else {
    panel.style.display = "none";
    btn.textContent = "+ Agregar negocio";
    btn.style.background = "#2563eb";
  }
}

async function buscarNegociosParaAgregar() {
  const q = (document.getElementById("buscar-negocio-input")?.value || "").toLowerCase();
  const el = document.getElementById("lista-busqueda-negocios");
  if (!el) return;

  // Usar datos ya cargados en memoria (allData de app.js)
  const base = (typeof _rutaData !== "undefined" && _rutaData.length) ? _rutaData
    : (typeof allData !== "undefined" && allData.length) ? allData
      : [];

  if (!base.length) {
    // Si no hay datos en memoria, cargar de la API
    const r = await fetch("/api/candidatos?limit=2000");
    const data = await r.json();
    renderBusquedaResultados(data, q, el);
    return;
  }
  renderBusquedaResultados(base, q, el);
}

function renderBusquedaResultados(base, q, el) {
  const yaEnCampana = new Set(_campanaNegocios.map(n => n.negocio_id));
  const filtrados = base
    .filter(c => c.lat && c.lng)  // solo negocios con coords — si no tiene coords no se puede rutear
    .filter(c => !q || c.nombre.toLowerCase().includes(q))
    .slice(0, 60);

  if (!filtrados.length) {
    el.innerHTML = `<div style="color:#475569;font-size:11px;padding:12px;text-align:center">Sin resultados</div>`;
    return;
  }

  el.innerHTML = filtrados.map(c => {
    const yaEsta = yaEnCampana.has(c.place_id);
    return `
    <div style="display:flex;align-items:center;gap:8px;padding:7px 10px;
                border-bottom:1px solid #1e293b;${yaEsta ? 'opacity:.45' : 'cursor:pointer'}
                " ${!yaEsta ? `onclick="agregarNegocio('${c.place_id}', this)"` : ""}>
      <div style="flex:1;overflow:hidden">
        <div style="font-size:11px;font-weight:600;color:#f1f5f9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.nombre}</div>
        <div style="font-size:10px;color:#64748b">${c.colonia_nombre || c.colonia_denue || ""}</div>
      </div>
      <span style="font-size:10px;padding:2px 7px;border-radius:8px;flex-shrink:0;
                   background:${yaEsta ? '#1e293b' : '#2563eb22'};color:${yaEsta ? '#475569' : '#60a5fa'};font-weight:600">
        ${yaEsta ? "ya está" : "+ agregar"}
      </span>
    </div>`;
  }).join("");
}

async function agregarNegocio(placeId, rowEl) {
  if (!campanaActualId) return;

  // Feedback visual inmediato
  if (rowEl) {
    rowEl.style.opacity = ".45";
    rowEl.style.pointerEvents = "none";
    rowEl.querySelector("span").textContent = "agregando…";
  }

  const resp = await fetch(`/api/campanas/${campanaActualId}/negocios`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ negocio_ids: [placeId] }),
  });
  const d = await resp.json();

  if (d.insertados > 0) {
    if (rowEl) rowEl.querySelector("span").textContent = "ya está";
    // Recargar la tabla de la campaña
    const r2 = await fetch(`/api/campanas/${campanaActualId}`);
    const d2 = await r2.json();
    _campanaNegocios = d2.negocios || [];
    _renderTablaNegociosCampana(_campanaNegocios);
    _actualizarMeta(d2.campana);
    // Re-renderizar búsqueda para reflejar el nuevo estado
    buscarNegociosParaAgregar();
  }
}

async function quitarNegocioCampana(negocioId) {
  if (!campanaActualId) return;
  await fetch(`/api/campanas/${campanaActualId}/negocios/${negocioId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ _quitar: true }),
  });
  // Actualizar localmente
  _campanaNegocios = _campanaNegocios.filter(n => n.negocio_id !== negocioId);
  _renderTablaNegociosCampana(_campanaNegocios);
}

function _actualizarMeta(campana) {
  if (!campana) return;
  if (window._tecnicoMode) {
    // Re-renderizar el hero de progreso técnico
    _renderDetalleCampanaTecnico({ campana, negocios: _campanaNegocios });
    return;
  }
  const total = campana.total_negocios || 0;
  const hecho = campana.total_completados || 0;
  const pct = total ? Math.round((hecho / total) * 100) : 0;
  const stLabel = { activa: "Activa", cerrada: "Finalizada", cancelada: "Cancelada" }[campana.status] || campana.status;
  const el = document.getElementById("campana-detail-meta");
  if (el) el.innerHTML =
    `<span class="stat-label" style="margin-right:10px">${stLabel}</span>` +
    (campana.colonia ? `<span style="color:#475569">🏘️ ${campana.colonia}</span> · ` : "") +
    `<span style="color:#3b6ab5;font-weight:700">${pct}%</span> completado (${hecho} / ${total})` +
    (campana.fecha_inicio ? ` · <span style="color:#334155">📅 ${campana.fecha_inicio}</span>` : "");
}

// ── Acciones sobre negocios ───────────────────────────────────────────────────

async function toggleCompletado(negocioId, checkbox) {
  await fetch(`/api/campanas/${campanaActualId}/negocios/${negocioId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ completado: checkbox.checked }),
  });
  const row = document.getElementById(`cn-row-${negocioId}`);
  if (row) row.classList.toggle("negocio-visitado", checkbox.checked);
  // Actualizar meta
  const r = await fetch(`/api/campanas/${campanaActualId}`);
  const d = await r.json();
  _actualizarMeta(d.campana);
}

async function guardarNotas(negocioId, notas) {
  await fetch(`/api/campanas/${campanaActualId}/negocios/${negocioId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notas }),
  });
}

async function guardarFechaVisita(negocioId, fecha) {
  await fetch(`/api/campanas/${campanaActualId}/negocios/${negocioId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fecha_visita: fecha }),
  });
}

async function verRutaCampana() {
  if (!campanaActualId || !_campanaNegocios.length) return;

  // Solo pendientes — excluir negocios ya visitados
  const fuente = _campanaNegocios.filter(n => !n.completado);

  const ids = fuente.map(n => n.negocio_id);

  if (ids.length < 2) {
    alert(window._tecnicoMode
      ? "Necesitas al menos 2 negocios pendientes para calcular la ruta."
      : "La campaña necesita al menos 2 negocios para calcular una ruta.");
    return;
  }

  // Marcar contexto de campaña para que el popup de ruta sepa que puede abrir el modal de visita
  window._rutaCampanaId = campanaActualId;

  const btn = document.getElementById("btn-ver-ruta-campana");
  if (btn) { btn.disabled = true; btn.textContent = "⏳ Calculando ruta…"; }
  try {
    const resp = await fetch("/api/ruta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        place_ids: ids,
        negocios_hint: fuente.map(n => ({ negocio_id: n.negocio_id, place_id: n.negocio_id, nombre: n.nombre, lat: n.lat, lng: n.lng, tipo: n.tipo || "informal" })),
      }),
    });
    const d = await resp.json();
    if (!resp.ok) { alert("Error al calcular ruta: " + (d.detail || "Error")); return; }
    if (d.descartados?.length) {
      console.warn("[ruta] Negocios sin coords descartados:", JSON.stringify(d.descartados, null, 2));
    }
    if (typeof renderRutaEnMapa === "function") {
      window._rutaEsCampana = true;
      renderRutaEnMapa(d);
      showTab("ruta");
    }
  } catch (err) {
    alert("Error de conexión: " + err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = window._tecnicoMode ? "📍 Definir ruta" : "🗺️ Ver ruta"; }
  }
}

async function descargarReporteCampana() {
  const r = await fetch(`/api/campanas/${campanaActualId}`);
  const d = await r.json();
  if (!d.negocios || !d.negocios.length) { alert("La campaña no tiene negocios."); return; }

  const place_ids = d.negocios.map(n => n.negocio_id);

  try {
    const resp = await fetch("/api/reporte-visita", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // El backend lee los datos de visita directo de Firestore con campana_id
      body: JSON.stringify({ place_ids, campana_id: campanaActualId }),
    });
    if (!resp.ok) { const e = await resp.json().catch(() => ({})); alert("Error: " + (e.detail || resp.status)); return; }
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte_${campanaActualId.slice(0, 8)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert("Error al generar reporte: " + err.message);
  }
}

// ── Modal: crear campaña ──────────────────────────────────────────────────────

async function mostrarModalCrearCampana() {
  document.getElementById("modal-campana").style.display = "flex";
  const sel = document.getElementById("campana-colonia-input");
  if (!sel) return;

  const colonias = window._preloads?.colonias
    ? await window._preloads.colonias.catch(() => [])
    : await fetch("/api/colonias").then(r => r.json()).catch(() => []);

  sel.innerHTML = '<option value="">Sin colonia específica</option>' +
    colonias.map(c => `<option value="${c.nombre}">${c.nombre}</option>`).join("");
}

function cerrarModalCampana() {
  document.getElementById("modal-campana").style.display = "none";
  document.getElementById("form-crear-campana").reset();
}

async function crearCampana(e) {
  e.preventDefault();
  const btn = e.target.querySelector("button[type=submit]");
  const fecha_inicio = document.getElementById("campana-fecha-inicio").value;
  const fecha_fin = document.getElementById("campana-fecha-fin").value;
  if (fecha_inicio && fecha_fin && fecha_fin < fecha_inicio) {
    alert("La fecha de fin no puede ser anterior a la fecha de inicio.");
    return;
  }
  if (btn) { btn.disabled = true; btn.textContent = "Creando…"; }
  const body = {
    nombre: document.getElementById("campana-nombre").value,
    descripcion: document.getElementById("campana-desc").value,
    colonia: document.getElementById("campana-colonia-input").value,
    fecha_inicio,
    fecha_fin,
  };
  const resp = await fetch("/api/campanas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (resp.ok) {
    cerrarModalCampana();
    await cargarCampanas();
  } else {
    alert("Error al crear la campaña.");
  }
  if (btn) { btn.disabled = false; btn.textContent = "Crear campaña"; }
}

async function cerrarCampana() {
  if (!confirm("¿Marcar esta campaña como finalizada?")) return;
  await fetch(`/api/campanas/${campanaActualId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "cerrada" }),
  });
  volverListaCampanas();
}

async function reactivarCampana() {
  if (!confirm("¿Reactivar esta campaña?")) return;
  await fetch(`/api/campanas/${campanaActualId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "activa" }),
  });
  volverListaCampanas();
}

async function eliminarCampana() {
  if (!confirm("¿Eliminar esta campaña permanentemente?")) return;
  await fetch(`/api/campanas/${campanaActualId}`, { method: "DELETE" });
  volverListaCampanas();
}

function volverListaCampanas() {
  campanaActualId = null;
  _campanaNegocios = [];
  _busquedaAbierta = false;
  const panel = document.getElementById("panel-agregar-negocio");
  if (panel) panel.style.display = "none";
  document.getElementById("campanas-detail-view").style.display = "none";
  document.getElementById("campanas-lista-view").style.display = "flex";
  cargarCampanas();
}
