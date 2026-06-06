/* ══════════════════════════════════════════════════════════════════════════
   campanas.js — Campañas de visita
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
    return `
    <div class="campana-card" onclick="verCampana('${c.id}')"
         style="border-left-color:${stColor}">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <span class="stat-label" style="margin:0">${stLabel}</span>
        <span style="font-size:13px;font-weight:800;color:${pct === 100 ? '#4ade80' : '#3b6ab5'};
                     font-family:'Plus Jakarta Sans','Inter',sans-serif">${pct}%</span>
      </div>
      <div style="font-size:14px;font-weight:700;color:#f1f5f9;margin-bottom:6px;
                  overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.nombre}</div>
      ${c.colonia ? `<div style="font-size:11px;color:#475569;margin-bottom:3px">🏘️ ${c.colonia}</div>` : ""}
      ${c.fecha_inicio ? `<div style="font-size:10px;color:#334155;margin-bottom:8px">📅 ${c.fecha_inicio}${c.fecha_fin ? " → " + c.fecha_fin : ""}</div>` : ""}
      <div style="display:flex;justify-content:space-between;font-size:10px;
                  color:#334155;margin-bottom:6px;margin-top:${c.colonia || c.fecha_inicio ? "0" : "8px"}">
        <span>${hecho} / ${total} negocios</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${pct}%;background:${pct === 100 ? '#22c55e' : '#2563eb'}"></div>
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
    <div style="display:flex;gap:8px;margin-bottom:8px">
      <button onclick="verRutaCampana()" id="btn-ver-ruta-campana"
              style="flex:1;padding:11px 0;border-radius:9px;border:none;
                     background:linear-gradient(135deg,#2563eb,#1d4ed8);
                     color:#fff;font-size:12px;font-weight:700;cursor:pointer;
                     box-shadow:0 3px 10px rgba(37,99,235,.35)">
        📍 Definir ruta
      </button>
      <button onclick="descargarReporteCampana()"
              style="padding:11px 16px;border-radius:9px;border:1px solid #1a2d56;
                     background:transparent;color:#3b6ab5;font-size:12px;font-weight:600;cursor:pointer">
        📄 Reporte
      </button>
    </div>
    <!-- Fila 2: Filtro -->
    <div style="display:flex;gap:6px">
      <button id="tec-filtro-pend" onclick="_tecFiltro('pendientes')"
              style="flex:1;padding:7px 0;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;
                     font-family:'Inter',sans-serif;border:none;
                     background:${_tecnicoFiltro === 'pendientes' ? '#1e3a8a' : '#0a1428'};
                     color:${_tecnicoFiltro === 'pendientes' ? '#93c5fd' : '#334155'}">
        ⏳ Pendientes (${pendientes})
      </button>
      <button id="tec-filtro-todos" onclick="_tecFiltro('todos')"
              style="flex:1;padding:7px 0;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;
                     font-family:'Inter',sans-serif;border:none;
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

    const meta = visitado
      ? [n.fecha_visita || "", n.notas ? `"${n.notas.slice(0, 40)}${n.notas.length > 40 ? '…' : ''}"` : ""].filter(Boolean).join(" · ")
      : [n.tipo || "informal", n.colonia || ""].filter(Boolean).join(" · ");

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
      <div style="display:flex;gap:6px;padding-left:20px;align-items:center">

        <!-- Par de navegación: Maps + Waze -->
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

        ${visitado
        ? `<button onclick="_revertirPendiente('${safeId}',this)"
                    style="padding:7px 10px;border-radius:7px;font-size:11px;font-weight:600;
                           cursor:pointer;font-family:'Inter',sans-serif;flex-shrink:0;
                           background:transparent;border:1px solid #7f1d1d;color:#f87171">
               ↩ Pendiente
             </button>
             <button onclick="abrirModalVisita('${safeId}','${safeNombre}')"
                     style="flex:1;padding:7px 0;border-radius:7px;font-size:11px;font-weight:600;
                            cursor:pointer;font-family:'Inter',sans-serif;
                            background:transparent;border:1px solid #1e293b;color:#64748b">
               ✏️ Editar
             </button>`
        : `<button onclick="abrirModalVisita('${safeId}','${safeNombre}')"
                    style="flex:1;padding:8px 0;border-radius:8px;font-size:12px;font-weight:700;
                           cursor:pointer;font-family:'Inter',sans-serif;border:none;color:#fff;
                           background:linear-gradient(135deg,#2563eb,#1d4ed8);
                           box-shadow:0 2px 10px rgba(37,99,235,.4)">
              📝 Registrar visita
            </button>`}
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
  const safe = negocioId.replace(/\//g, "__");
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

  // En modo técnico: solo incluir pendientes para que la ruta se actualice conforme avanza
  const fuente = window._tecnicoMode
    ? _campanaNegocios.filter(n => !n.completado)
    : _campanaNegocios;

  const ids = fuente.map(n => n.negocio_id);

  if (ids.length < 2) {
    alert(window._tecnicoMode
      ? "Necesitas al menos 2 negocios pendientes para calcular la ruta."
      : "La campaña necesita al menos 2 negocios para calcular una ruta.");
    return;
  }
  const btn = document.getElementById("btn-ver-ruta-campana");
  if (btn) { btn.disabled = true; btn.textContent = "Calculando…"; }
  try {
    const resp = await fetch("/api/ruta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        place_ids: ids,
        negocios_hint: fuente.map(n => ({ negocio_id: n.negocio_id, nombre: n.nombre, lat: n.lat, lng: n.lng })),
      }),
    });
    const d = await resp.json();
    if (!resp.ok) { alert("Error al calcular ruta: " + (d.detail || "Error")); return; }
    if (d.descartados?.length) {
      console.warn("[ruta] Negocios sin coords descartados:", JSON.stringify(d.descartados, null, 2));
    }
    if (typeof renderRutaEnMapa === "function") {
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

function mostrarModalCrearCampana() {
  document.getElementById("modal-campana").style.display = "flex";
  const sel = document.getElementById("campana-colonia-input");
  if (sel && typeof coloniasData !== "undefined" && coloniasData.length) {
    sel.innerHTML = '<option value="">Sin colonia específica</option>' +
      coloniasData.map(c => `<option value="${c.nombre}">${c.nombre}</option>`).join("");
  }
}

function cerrarModalCampana() {
  document.getElementById("modal-campana").style.display = "none";
  document.getElementById("form-crear-campana").reset();
}

async function crearCampana(e) {
  e.preventDefault();
  const btn = e.target.querySelector("button[type=submit]");
  if (btn) { btn.disabled = true; btn.textContent = "Creando…"; }
  const body = {
    nombre: document.getElementById("campana-nombre").value,
    descripcion: document.getElementById("campana-desc").value,
    colonia: document.getElementById("campana-colonia-input").value,
    fecha_inicio: document.getElementById("campana-fecha-inicio").value,
    fecha_fin: document.getElementById("campana-fecha-fin").value,
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
  if (!confirm("¿Marcar esta campaña como cerrada?")) return;
  await fetch(`/api/campanas/${campanaActualId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "cerrada" }),
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


// ══════════════════════════════════════════════════════════════════════════════
// MODAL DE VISITA
// ══════════════════════════════════════════════════════════════════════════════

async function abrirModalVisita(negocioId, nombre) {
  _visitaModal = { negocioId, nombre };
  _vfFotoCleared = false;
  document.getElementById("modal-visita-negocio").textContent = nombre;

  // Cargar plantillas si no están en caché
  if (!_plantillasCache.length) {
    const r = await fetch("/api/plantillas");
    _plantillasCache = await r.json();
  }

  // Pre-cargar datos de visita existentes
  const negocioData = _campanaNegocios.find(n => n.negocio_id === negocioId) || {};
  const datosExist = negocioData.visita_datos || {};
  // Usar la plantilla que usó la última visita, o la default
  const lastPid = negocioData.plantilla_id;
  const plantilla = (lastPid && _plantillasCache.find(p => p.id === lastPid))
    || _plantillasCache.find(p => p.es_default)
    || _plantillasCache[0]
    || { campos: [], id: null };
  _visitaModal.plantillaId = plantilla.id;

  // Pre-llenar campos fijos: visitado, notas y foto existente
  _vfSetVisitado(!!negocioData.completado);
  const notasEl = document.getElementById("vf-fixed-notas");
  if (notasEl) notasEl.value = negocioData.notas || "";
  const fotoPrev = document.getElementById("vf-fixed-foto-prev");
  const fotoInp  = document.getElementById("vf-fixed-foto");
  const fotoWrap = document.getElementById("vf-fixed-foto-wrap");
  if (fotoInp) fotoInp.value = "";
  if (negocioData.foto_visita_url && fotoPrev && fotoWrap) {
    fotoPrev.src = negocioData.foto_visita_url;
    fotoPrev.onclick = () => window.open(negocioData.foto_visita_url);
    fotoWrap.style.display = "inline-flex";
  } else {
    if (fotoPrev) fotoPrev.src = "";
    if (fotoWrap) fotoWrap.style.display = "none";
  }

  _renderSelectorPlantilla(plantilla.id);
  _renderCamposVisita(plantilla.campos, datosExist);
  document.getElementById("modal-visita").style.display = "flex";
}

// Aplica el estilo visual al toggle visitado/pendiente
function _vfSetVisitado(visitado) {
  const siInp = document.querySelector('input[name="vf-visitado"][value="true"]');
  const noInp = document.querySelector('input[name="vf-visitado"][value="false"]');
  if (!siInp || !noInp) return;
  siInp.checked = visitado;
  noInp.checked = !visitado;
  _vfVisitadoChange();
}

function _vfVisitadoChange() {
  const siInp = document.querySelector('input[name="vf-visitado"][value="true"]');
  const siLbl = document.getElementById("vf-visitado-si-lbl");
  const noLbl = document.getElementById("vf-visitado-no-lbl");
  if (!siInp || !siLbl || !noLbl) return;
  const v = siInp.checked;
  siLbl.style.borderColor = v ? "#22c55e" : "#1e293b";
  siLbl.style.background = v ? "rgba(34,197,94,.1)" : "transparent";
  siLbl.style.color = v ? "#4ade80" : "#475569";
  noLbl.style.borderColor = !v ? "#64748b" : "#1e293b";
  noLbl.style.background = !v ? "rgba(100,116,139,.1)" : "transparent";
  noLbl.style.color = !v ? "#94a3b8" : "#475569";
}

function _renderSelectorPlantilla(activoId) {
  const el = document.getElementById("modal-visita-plantilla-sel");
  if (!el || _plantillasCache.length <= 1) {
    if (el) el.style.display = "none";
    return;
  }
  el.style.display = "flex";
  el.innerHTML = _plantillasCache.map(p => {
    const active = p.id === activoId;
    return `<button onclick="_cambiarPlantillaVisita('${p.id}')"
      style="padding:4px 12px;border-radius:20px;font-size:10px;font-weight:600;
             cursor:pointer;font-family:'Inter',sans-serif;white-space:nowrap;
             ${active ? 'background:#2563eb;color:#fff;border:none'
        : 'background:transparent;color:#64748b;border:1px solid #1e293b'}">
      ${p.nombre}
    </button>`;
  }).join("");
}

function _cambiarPlantillaVisita(plantillaId) {
  const plantilla = _plantillasCache.find(p => p.id === plantillaId) || { campos: [] };
  _visitaModal.plantillaId = plantillaId;
  const negocioData = _campanaNegocios.find(n => n.negocio_id === _visitaModal.negocioId) || {};
  _renderSelectorPlantilla(plantillaId);
  _renderCamposVisita(plantilla.campos, negocioData.visita_datos || {});
}

function cerrarModalVisita() {
  document.getElementById("modal-visita").style.display = "none";
  _visitaModal = { negocioId: null, nombre: null };
  _vfFotoCleared = false;
  _vfClearFoto();
}

function _renderCamposVisita(campos, datosExist) {
  const el = document.getElementById("modal-visita-campos");
  // Excluir "notas" porque ya existe el campo fijo en el modal
  const camposFiltrados = campos.filter(c => c.key !== "notas");
  if (!camposFiltrados.length) {
    el.innerHTML = "";
    return;
  }
  el.innerHTML = camposFiltrados.map(c => {
    const val = datosExist[c.key];
    return `<div style="margin-bottom:14px">
      <div style="font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;
                  letter-spacing:.06em;margin-bottom:6px">
        ${c.label}${c.requerido ? ' <span style="color:#f87171;text-transform:none;font-weight:400">*</span>' : ""}
      </div>
      ${_inputParaCampo(c, val)}
    </div>`;
  }).join("");
}

function _inputParaCampo(c, val) {
  const id = `vf-${c.key}`;
  switch (c.tipo) {
    case "opciones": {
      const opts = (c.opciones || []).map(o =>
        `<option value="${o}" ${val === o ? "selected" : ""}>${o}</option>`).join("");
      return `<select id="${id}" class="filtro-input" style="margin:0">${`<option value="">— Seleccionar —</option>${opts}`
        }</select>`;
    }
    case "bool": {
      const isTrue = val === true || val === "true" || val === "Sí";
      const isFalse = val === false || val === "false" || val === "No";
      return `<div style="display:flex;gap:6px">
        ${["true", "false"].map((v, vi) => {
        const label = v === "true" ? "Sí" : "No";
        const active = v === "true" ? isTrue : isFalse;
        const col = v === "true" ? "#22c55e" : "#f87171";
        return `<label style="flex:1;display:flex;align-items:center;justify-content:center;
            gap:6px;cursor:pointer;border-radius:8px;padding:8px;font-size:12px;font-weight:600;
            border:1.5px solid ${active ? col : '#1e293b'};
            background:${active ? col + '18' : 'transparent'};
            color:${active ? col : '#475569'};transition:all .15s">
            <input type="radio" name="${id}" value="${v}" ${active ? "checked" : ""}
                   style="display:none" onchange="_vfBoolChange('${id}')">
            <span style="font-size:15px">${v === "true" ? "✓" : "✗"}</span> ${label}
          </label>`;
      }).join("")}
      </div>`;
    }
    case "numero":
      return `<input id="${id}" type="number" class="filtro-input" style="margin:0"
               value="${val !== undefined && val !== null ? val : ""}" min="0"/>`;
    case "textarea":
      return `<textarea id="${id}" class="filtro-input"
               style="margin:0;height:80px;resize:vertical">${val || ""}</textarea>`;
    case "foto": {
      const preview = val
        ? `<img id="${id}-prev" src="${val}" onclick="window.open('${val}')"
               style="height:56px;width:56px;object-fit:cover;border-radius:6px;
                      margin-right:8px;cursor:pointer;display:inline-block;vertical-align:middle"/>`
        : `<img id="${id}-prev" style="display:none;height:56px;width:56px;
               object-fit:cover;border-radius:6px;margin-right:8px;vertical-align:middle"/>`;
      return `<div style="display:flex;align-items:center">
        ${preview}
        <input id="${id}" type="file" accept="image/*" style="display:none"
               onchange="_vfFotoChange('${id}')"/>
        <div style="flex:1;display:flex;gap:5px">
          <button type="button" onclick="_vfPlantillaAbrirCamara('${id}')"
                  style="flex:1;padding:7px 4px;border-radius:7px;border:1px solid #1e3a5f;
                         background:#0a1e38;color:#60a5fa;font-size:11px;font-weight:600;
                         cursor:pointer;font-family:'Inter',sans-serif">
            📷 Cámara
          </button>
          <button type="button" onclick="_vfPlantillaAbrirGaleria('${id}')"
                  style="flex:1;padding:7px 4px;border-radius:7px;border:1px dashed #334155;
                         background:transparent;color:#94a3b8;font-size:11px;font-weight:600;
                         cursor:pointer;font-family:'Inter',sans-serif">
            🖼 Galería
          </button>
        </div>
      </div>`;
    }
    default:
      return `<input id="${id}" type="text" class="filtro-input" style="margin:0"
               value="${val || ""}"/>`;
  }
}

function _vfBoolChange(groupId) {
  // Re-style the sibling labels when a radio changes
  document.querySelectorAll(`input[name="${groupId}"]`).forEach(inp => {
    const lbl = inp.closest("label");
    if (!lbl) return;
    const isTrue = inp.value === "true";
    const col = isTrue ? "#22c55e" : "#f87171";
    if (inp.checked) {
      lbl.style.borderColor = col;
      lbl.style.background = col + "18";
      lbl.style.color = col;
    } else {
      lbl.style.borderColor = "#1e293b";
      lbl.style.background = "transparent";
      lbl.style.color = "#475569";
    }
  });
}

function _vfPlantillaAbrirCamara(id) {
  _abrirCamara(id, file => {
    const dt = new DataTransfer();
    dt.items.add(file);
    document.getElementById(id).files = dt.files;
    _vfFotoChange(id);
  });
}

function _vfPlantillaAbrirGaleria(id) {
  const inp = document.getElementById(id);
  inp.removeAttribute('capture');
  inp.click();
}

function _vfFotoChange(id) {
  const input = document.getElementById(id);
  const prev = document.getElementById(`${id}-prev`);
  if (!input || !input.files || !input.files[0] || !prev) return;
  prev.src = URL.createObjectURL(input.files[0]);
  prev.style.display = "inline-block";
}

function _vfAbrirCamara() {
  _abrirCamara('vf-fixed-foto', file => {
    const dt = new DataTransfer();
    dt.items.add(file);
    document.getElementById('vf-fixed-foto').files = dt.files;
    _vfFixedFotoChange();
  });
}

function _vfAbrirGaleria() {
  const inp = document.getElementById('vf-fixed-foto');
  inp.removeAttribute('capture');
  inp.click();
}

function _vfFixedFotoChange() {
  const input = document.getElementById('vf-fixed-foto');
  const prev  = document.getElementById('vf-fixed-foto-prev');
  const wrap  = document.getElementById('vf-fixed-foto-wrap');
  if (!input || !input.files[0] || !prev) return;
  const url = URL.createObjectURL(input.files[0]);
  prev.src = url;
  prev.onclick = () => window.open(url);
  if (wrap) wrap.style.display = 'inline-flex';
}

let _vfFotoCleared = false;

function _vfClearFoto() {
  const inp  = document.getElementById('vf-fixed-foto');
  const prev = document.getElementById('vf-fixed-foto-prev');
  const wrap = document.getElementById('vf-fixed-foto-wrap');
  if (inp)  { inp.value = ''; }
  if (prev) { prev.src = ''; }
  if (wrap) { wrap.style.display = 'none'; }
  _vfFotoCleared = true;
}

function _haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

async function guardarVisita() {
  if (!_visitaModal.negocioId || !campanaActualId) return;

  const btn = document.getElementById("btn-guardar-visita");
  if (btn) { btn.disabled = true; btn.textContent = "Guardando…"; }

  // Obtener la plantilla seleccionada en el modal
  const plantilla = (_visitaModal.plantillaId && _plantillasCache.find(p => p.id === _visitaModal.plantillaId))
    || _plantillasCache[0] || { campos: [] };
  const datos = {};
  let fotoFile = null;

  for (const c of plantilla.campos) {
    const id = `vf-${c.key}`;
    if (c.tipo === "foto") {
      const input = document.getElementById(id);
      if (input && input.files && input.files[0]) fotoFile = input.files[0];
    } else if (c.tipo === "bool") {
      const checked = document.querySelector(`input[name="${id}"]:checked`);
      if (checked) datos[c.key] = checked.value === "true";
    } else if (c.tipo === "numero") {
      const el = document.getElementById(id);
      if (el && el.value !== "") datos[c.key] = Number(el.value);
    } else {
      const el = document.getElementById(id);
      if (el && el.value) datos[c.key] = el.value;
    }
  }

  // Leer campos fijos
  const visitadoInp = document.querySelector('input[name="vf-visitado"]:checked');
  const visitado = visitadoInp ? visitadoInp.value === "true" : false;
  const notasEl = document.getElementById("vf-fixed-notas");
  const notas = notasEl ? notasEl.value.trim() : "";

  // Foto fija del modal (tiene prioridad sobre la de plantilla)
  const fixedFotoInput = document.getElementById('vf-fixed-foto');
  if (fixedFotoInput && fixedFotoInput.files[0]) fotoFile = fixedFotoInput.files[0];

  const negId  = _visitaModal.negocioId;
  const negData = _campanaNegocios.find(n => n.negocio_id === negId);
  const base   = `/api/campanas/${campanaActualId}/negocios/${negId}`;

  const fd = new FormData();
  fd.append("datos_json", JSON.stringify(datos));
  fd.append("plantilla_id", _visitaModal.plantillaId || "");
  fd.append("completado", visitado ? "true" : "false");
  if (fotoFile) fd.append("foto", fotoFile);

  // Guardar visita (datos de plantilla + foto)
  const resp = await fetch(`${base}/visita`, { method: "POST", body: fd });

  // Forzar completado y notas via PATCH (garantiza el valor correcto)
  const patchBody = { completado: visitado, ...(notas ? { notas } : {}) };
  // Si el usuario borró la foto activamente (X) y no subió una nueva, limpiarla
  if (_vfFotoCleared && !fotoFile) patchBody.foto_visita_url = "";
  await fetch(base, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patchBody),
  });

  if (btn) { btn.disabled = false; btn.textContent = "Guardar visita"; }

  if (resp.ok) {
    cerrarModalVisita();
    const r = await fetch(`/api/campanas/${campanaActualId}`);
    const d = await r.json();
    _campanaNegocios = d.negocios || [];
    _renderTablaNegociosCampana(_campanaNegocios);
    _actualizarMeta(d.campana);
    // GPS en background — no bloquea el cierre del modal
    _guardarGPSVisita(base, negData);
  } else {
    alert("Error al guardar la visita.");
  }
}

async function _guardarGPSVisita(base, negData) {
  try {
    const pos = await new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject,
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 })
    );
    const gps = {
      visita_lat:       pos.coords.latitude,
      visita_lng:       pos.coords.longitude,
      visita_precision: Math.round(pos.coords.accuracy),
    };
    if (negData && negData.lat && negData.lng) {
      const dist = _haversineM(negData.lat, negData.lng, pos.coords.latitude, pos.coords.longitude);
      if (dist < 10000) gps.visita_distancia = dist;
    }
    try {
      const geo = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`
      ).then(r => r.json());
      gps.visita_direccion = (geo.display_name || "").split(",").slice(0, 3).join(",").trim();
    } catch { gps.visita_direccion = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`; }

    await fetch(base, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(gps),
    });
    // Actualizar tarjeta en el DOM directamente (el modal ya está cerrado)
    const negId = base.split("/negocios/")[1];
    const neg = _campanaNegocios.find(n => n.negocio_id === negId);
    if (neg) {
      Object.assign(neg, gps);
      const row = document.getElementById(`cn-row-${negId}`);
      if (row) _actualizarBadgeGPS(row, gps);
    }
  } catch { /* GPS no disponible o denegado — sin problema */ }
}

function _actualizarBadgeGPS(row, gps) {
  let badge = row.querySelector('.gps-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.className = 'gps-badge';
    const notasEl = row.querySelector('[style*="color:#475569"]');
    if (notasEl) notasEl.after(badge);
    else row.querySelector('[style*="flex:1"]')?.append(badge);
  }
  const d = gps.visita_distancia;
  const c = d != null ? (d <= 100 ? '#22c55e' : d <= 300 ? '#f59e0b' : '#ef4444') : '#64748b';
  const distTxt = d != null ? ` · a ${d} m` : '';
  badge.style.cssText = `font-size:9px;color:${c};margin-top:3px;font-weight:600;line-height:1.4`;
  badge.textContent = `📍 ${gps.visita_direccion || ''}${distTxt}`;
}


// ══════════════════════════════════════════════════════════════════════════════
// GESTIÓN DE PLANTILLAS
// ══════════════════════════════════════════════════════════════════════════════

async function abrirModalPlantillas() {
  document.getElementById("modal-plantillas").style.display = "flex";
  const r = await fetch("/api/plantillas");
  _plantillasCache = await r.json();
  _renderListaPlantillas(_plantillasCache);
}

function cerrarModalPlantillas() {
  document.getElementById("modal-plantillas").style.display = "none";
}

function _renderListaPlantillas(plantillas) {
  const el = document.getElementById("modal-plantillas-lista");
  if (!plantillas.length) {
    el.innerHTML = `<div style="color:#475569;font-size:12px;padding:16px;text-align:center">
      No hay plantillas.</div>`;
    return;
  }
  el.innerHTML = plantillas.map(p => `
    <div style="background:linear-gradient(135deg,#0c1a30,#080f1e);
                border:1px solid #1a2d4a;border-radius:8px;padding:10px 12px;
                margin-bottom:6px;box-shadow:0 2px 8px rgba(0,0,0,.3)">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
        <div style="min-width:0">
          <div style="font-size:12px;font-weight:700;color:#e2e8f0;
                      display:flex;align-items:center;gap:6px">
            ${p.nombre}
            ${p.es_default ? `<span style="font-size:9px;font-weight:600;color:#60a5fa;
              background:rgba(37,99,235,.18);padding:1px 6px;border-radius:10px;
              border:1px solid rgba(37,99,235,.3)">default</span>` : ""}
          </div>
          <div style="font-size:10px;color:#2d4a6e;margin-top:3px">
            ${(p.campos || []).length} campos${p.descripcion ? ` · ${p.descripcion}` : ""}
          </div>
        </div>
        <div style="display:flex;gap:5px;flex-shrink:0">
          <button onclick="mostrarEditorPlantilla('${p.id}')"
                  style="padding:4px 10px;border-radius:6px;border:1px solid #1f3460;
                         background:transparent;color:#3d5a8a;font-size:10px;
                         cursor:pointer;font-weight:600;font-family:'Inter',sans-serif">
            Editar
          </button>
          ${!p.es_default ? `<button onclick="eliminarPlantilla('${p.id}')"
                  style="width:26px;height:26px;border-radius:6px;border:1px solid #2d1515;
                         background:transparent;color:#7f1d1d;font-size:12px;
                         cursor:pointer;line-height:1">🗑</button>` : ""}
        </div>
      </div>
    </div>`).join("");
}

async function mostrarEditorPlantilla(id) {
  _plantillaEditorId = id;
  document.getElementById("ep-titulo").textContent = id ? "Editar plantilla" : "Nueva plantilla";
  cerrarModalPlantillas();

  if (id) {
    const p = _plantillasCache.find(x => x.id === id) || {};
    document.getElementById("ep-nombre").value = p.nombre || "";
    document.getElementById("ep-desc").value = p.descripcion || "";
    _epCampos = JSON.parse(JSON.stringify(p.campos || []));
  } else {
    document.getElementById("ep-nombre").value = "";
    document.getElementById("ep-desc").value = "";
    _epCampos = [];
  }
  _renderEditorCampos();
  document.getElementById("modal-editor-plantilla").style.display = "flex";
}

function cerrarEditorPlantilla() {
  document.getElementById("modal-editor-plantilla").style.display = "none";
  abrirModalPlantillas();
}

// ── Sync + render ─────────────────────────────────────────────────────────────

function _epSyncDOM() {
  _epCampos.forEach((c, i) => {
    const lbl = document.querySelector(`[data-ep-label="${i}"]`);
    if (lbl) c.label = lbl.value;
    const ops = document.querySelector(`[data-ep-opciones="${i}"]`);
    if (ops) c.opciones = ops.value.split(",").map(x => x.trim()).filter(Boolean);
  });
}

function _renderEditorCampos() {
  const cnt = document.getElementById("ep-campos-count");
  if (cnt) cnt.textContent = `${_epCampos.length} campo${_epCampos.length !== 1 ? "s" : ""}`;
  const el = document.getElementById("ep-campos-lista");
  if (!_epCampos.length) {
    el.innerHTML = `<div style="color:#334155;font-size:13px;padding:20px;text-align:center;
      border:1px dashed #1e293b;border-radius:8px">Sin campos aún</div>`;
    return;
  }
  const TIPOS = [
    { k: "texto", label: "Texto" },
    { k: "textarea", label: "Párrafo" },
    { k: "numero", label: "Número" },
    { k: "bool", label: "Sí/No" },
    { k: "opciones", label: "Lista" },
    { k: "foto", label: "Foto" },
  ];
  el.innerHTML = _epCampos.map((c, i) => `
    <div data-ep-card="${i}"
         style="background:linear-gradient(135deg,#0c1a30 0%,#080f1e 100%);
                border:1px solid #1a2d4a;border-radius:10px;
                padding:10px 12px;margin-bottom:6px;user-select:none;
                box-shadow:0 2px 8px rgba(0,0,0,.3)">
      <div style="display:flex;align-items:center;gap:7px">
        <span onpointerdown="_epHandleDown(event,${i})"
              style="cursor:grab;color:#1f3460;font-size:16px;letter-spacing:-.5px;
                     flex-shrink:0;padding:0 3px;touch-action:none;
                     transition:color .15s" title="Arrastra para reordenar">⠿⠿</span>
        <input value="${(c.label || "").replace(/"/g, '&quot;')}"
               placeholder="Nombre del campo…"
               class="filtro-input" data-ep-label="${i}"
               style="flex:1;margin:0;font-size:13px;padding:7px 10px;
                      background:#060d1a;border-color:#1a2d4a"/>
        <button onclick="_epQuitarCampo(${i})"
                style="width:26px;height:26px;border-radius:5px;border:1px solid #2d1515;
                       background:transparent;color:#7f1d1d;font-size:13px;
                       cursor:pointer;line-height:1;flex-shrink:0;
                       transition:color .15s,border-color .15s"
                onmouseover="this.style.color='#f87171';this.style.borderColor='#7f1d1d'"
                onmouseout="this.style.color='#7f1d1d';this.style.borderColor='#2d1515'">✕</button>
      </div>
      <div style="display:flex;gap:4px;margin-top:8px;overflow-x:auto;scrollbar-width:none;padding-bottom:1px">
        ${TIPOS.map(t => {
    const a = c.tipo === t.k;
    return `<button onclick="_epUpdateCampo(${i},'tipo','${t.k}')"
            style="flex-shrink:0;padding:4px 11px;border-radius:20px;font-size:11px;
                   font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;
                   transition:all .12s;
                   ${a ? 'background:linear-gradient(135deg,#1d4ed8,#1e40af);color:#fff;border:1px solid #1d4ed8;box-shadow:0 1px 6px rgba(29,78,216,.4)'
        : 'background:transparent;color:#2d4a6e;border:1px solid #1a2d4a'
      }">${t.label}</button>`;
  }).join("")}
      </div>
      ${c.tipo === "opciones" ? `
      <input value="${(c.opciones || []).join(", ").replace(/"/g, '&quot;')}"
             placeholder="Opción A, Opción B, Opción C…"
             class="filtro-input" data-ep-opciones="${i}"
             style="margin:7px 0 0;font-size:12px;padding:6px 10px;
                    color:#64748b;background:#060d1a;border-color:#1a2d4a"/>` : ""}
    </div>`).join("");
}

// ── Pointer drag-and-drop ─────────────────────────────────────────────────────

let _epDragState = null;

function _epHandleDown(e, idx) {
  e.preventDefault();
  _epSyncDOM();

  const lista = document.getElementById("ep-campos-lista");
  const card = lista?.querySelector(`[data-ep-card="${idx}"]`);
  if (!card) return;

  const rect = card.getBoundingClientRect();
  const ghost = card.cloneNode(true);
  Object.assign(ghost.style, {
    position: "fixed", left: rect.left + "px", top: rect.top + "px",
    width: rect.width + "px", zIndex: "10000", pointerEvents: "none",
    opacity: "0.9", background: "#1a2d56", border: "1.5px solid #3b82f6",
    borderRadius: "7px", boxShadow: "0 8px 28px rgba(0,0,0,.6)", transition: "none",
  });
  document.body.appendChild(ghost);
  card.style.opacity = "0.2";

  _epDragState = { idx, toIdx: idx, startY: e.clientY, ghostTop: rect.top, ghost, card };
  document.addEventListener("pointermove", _epHandleMove, { passive: false });
  document.addEventListener("pointerup", _epHandleUp, { once: true });
}

function _epHandleMove(e) {
  if (!_epDragState) return;
  e.preventDefault();
  const { ghost, ghostTop, startY } = _epDragState;
  ghost.style.top = (ghostTop + e.clientY - startY) + "px";

  const lista = document.getElementById("ep-campos-lista");
  if (!lista) return;
  const cards = Array.from(lista.querySelectorAll("[data-ep-card]"));
  let toIdx = _epCampos.length - 1;
  for (let i = 0; i < cards.length; i++) {
    const r = cards[i].getBoundingClientRect();
    if (e.clientY < r.top + r.height / 2) { toIdx = i; break; }
  }
  cards.forEach((c, i) => {
    c.style.borderTopColor = (i === toIdx && toIdx !== _epDragState.idx) ? "#3b82f6" : "#1a2640";
  });
  _epDragState.toIdx = toIdx;
}

function _epHandleUp() {
  if (!_epDragState) return;
  document.removeEventListener("pointermove", _epHandleMove);
  const { idx, toIdx, ghost, card } = _epDragState;
  _epDragState = null;
  ghost.remove();
  if (card) card.style.opacity = "";
  if (toIdx !== idx) {
    const moved = _epCampos.splice(idx, 1)[0];
    _epCampos.splice(toIdx, 0, moved);
  }
  _renderEditorCampos();
}

// ── Field mutations ───────────────────────────────────────────────────────────

function _epUpdateCampo(idx, key, val) {
  _epSyncDOM();
  _epCampos[idx][key] = val;
  if (key === "tipo") {
    if (val !== "opciones") delete _epCampos[idx].opciones;
    _renderEditorCampos();
  }
}

function _epQuitarCampo(idx) {
  _epSyncDOM();
  _epCampos.splice(idx, 1);
  _renderEditorCampos();
}

function agregarCampoPlantilla() {
  _epSyncDOM();
  _epCampos.push({ key: `c_${Date.now()}`, label: "", tipo: "texto" });
  _renderEditorCampos();
  const lista = document.getElementById("ep-campos-lista");
  lista?.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function guardarPlantilla() {
  const nombre = document.getElementById("ep-nombre").value.trim();
  if (!nombre) { alert("El nombre es requerido."); return; }

  // Sync any un-saved label/opciones from DOM inputs
  _epSyncDOM();

  // Sync labels → keys (slug)
  const campos = _epCampos
    .filter(c => c.label)
    .map(c => ({
      ...c,
      key: c.key || c.label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
    }));

  const body = {
    nombre,
    descripcion: document.getElementById("ep-desc").value.trim(),
    campos,
  };

  let resp;
  if (_plantillaEditorId) {
    resp = await fetch(`/api/plantillas/${_plantillaEditorId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } else {
    resp = await fetch("/api/plantillas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  if (resp.ok) {
    _plantillasCache = [];  // invalidar caché
    cerrarEditorPlantilla();
  } else {
    alert("Error al guardar la plantilla.");
  }
}

async function eliminarPlantilla(id) {
  if (!confirm("¿Eliminar esta plantilla?")) return;
  const resp = await fetch(`/api/plantillas/${id}`, { method: "DELETE" });
  if (resp.ok) {
    _plantillasCache = [];
    await abrirModalPlantillas();
  } else {
    const d = await resp.json().catch(() => ({}));
    alert(d.detail || "No se puede eliminar.");
  }
}
