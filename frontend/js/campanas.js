/* ══════════════════════════════════════════════════════════════════════════
   campanas.js — Campañas de visita con checklist y rutas
   ══════════════════════════════════════════════════════════════════════════ */

let campanaActualId = null;

// ── Lista de campañas ─────────────────────────────────────────────────────────

async function cargarCampanas() {
  const filtro = document.getElementById("filtro-status-campana")?.value || "";
  let url = "/api/campanas";
  if (filtro) url += `?status=${filtro}`;
  const r        = await fetch(url);
  const campanas = await r.json();
  _renderListaCampanas(campanas);
}

function _renderListaCampanas(campanas) {
  const el = document.getElementById("campanas-lista");
  if (!el) return;

  if (!campanas.length) {
    el.innerHTML = `<div style="color:#475569;font-size:12px;padding:20px;text-align:center">
      No hay campañas. Crea la primera con el botón de arriba.
    </div>`;
    return;
  }

  el.innerHTML = campanas.map(c => {
    const total   = c.total_negocios    || 0;
    const hecho   = c.total_completados || 0;
    const pct     = total ? Math.round((hecho / total) * 100) : 0;
    const stColor = { activa: "#22c55e", cerrada: "#64748b", cancelada: "#f87171" }[c.status] || "#64748b";
    return `
    <div class="campana-card" onclick="verCampana('${c.id}')">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
        <div style="font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">${c.nombre}</div>
        <span style="font-size:10px;padding:2px 8px;border-radius:10px;font-weight:700;margin-left:8px;flex-shrink:0;
                     background:${stColor}22;color:${stColor}">${c.status}</span>
      </div>
      ${c.colonia ? `<div style="font-size:11px;color:#64748b;margin-bottom:4px">🏘️ ${c.colonia}</div>` : ""}
      ${c.fecha_inicio ? `<div style="font-size:10px;color:#475569;margin-bottom:8px">📅 ${c.fecha_inicio} → ${c.fecha_fin || "…"}</div>` : ""}
      <div style="display:flex;justify-content:space-between;font-size:10px;color:#64748b;margin-bottom:4px">
        <span>${hecho} / ${total} visitados</span><span>${pct}%</span>
      </div>
      <div style="background:#0f172a;border-radius:4px;height:4px;overflow:hidden">
        <div style="background:#2563eb;height:100%;width:${pct}%;transition:width .3s"></div>
      </div>
    </div>`;
  }).join("");
}

// ── Detalle de campaña ────────────────────────────────────────────────────────

async function verCampana(id) {
  campanaActualId = id;
  document.getElementById("campanas-lista-view").style.display  = "none";
  document.getElementById("campanas-detail-view").style.display = "flex";

  const r   = await fetch(`/api/campanas/${id}`);
  const d   = await r.json();
  _renderDetalleCampana(d);
}

function _renderDetalleCampana(d) {
  const { campana, negocios, ruta } = d;
  const total = campana.total_negocios    || 0;
  const hecho = campana.total_completados || 0;
  const pct   = total ? Math.round((hecho / total) * 100) : 0;

  document.getElementById("campana-detail-title").textContent = campana.nombre;
  document.getElementById("campana-detail-meta").innerHTML = `
    <span style="color:#64748b">${campana.colonia || "Sin colonia"}</span>
    ${campana.fecha_inicio ? `· 📅 ${campana.fecha_inicio} → ${campana.fecha_fin || "…"}` : ""}
    · <b style="color:#2563eb">${pct}% completado</b> (${hecho}/${total})`;

  // Tabla de negocios con checklist
  const tbody = document.getElementById("campana-negocios-body");
  tbody.innerHTML = negocios.map(n => {
    let checklist = [];
    try { checklist = JSON.parse(n.checklist_json || "[]"); } catch {}
    const checkHtml = checklist.length
      ? `<details style="margin-top:4px"><summary style="font-size:10px;color:#64748b;cursor:pointer">Checklist (${checklist.length} ítems)</summary>
          ${checklist.map((item, i) => `<label style="display:block;font-size:10px;color:#94a3b8;padding:1px 0">
            <input type="checkbox" ${typeof item === 'object' && item.done ? 'checked' : ''}
                   onchange="actualizarChecklist('${n.cn_id}', '${n.negocio_id}', this)"> ${typeof item === 'object' ? item.texto : item}
          </label>`).join("")}
         </details>`
      : "";
    return `
    <tr id="cn-row-${n.negocio_id}">
      <td style="padding:8px 10px;vertical-align:top">
        <input type="checkbox" ${n.completado ? "checked" : ""}
               onchange="toggleCompletado('${n.negocio_id}', this)"/>
      </td>
      <td style="padding:8px 10px;vertical-align:top">
        <div style="font-size:12px;font-weight:600">${n.nombre || n.negocio_id}</div>
        <div style="font-size:10px;color:#64748b">${n.tipo || "informal"}</div>
        ${checkHtml}
      </td>
      <td style="padding:8px 10px;vertical-align:top">
        <input type="text" value="${n.notas || ""}" placeholder="Notas…"
               class="filtro-input" style="font-size:11px;padding:4px 6px"
               onblur="guardarNotas('${n.negocio_id}', this.value)"/>
      </td>
      <td style="padding:8px 10px;vertical-align:top">
        <input type="date" value="${n.fecha_visita || ""}"
               class="filtro-input" style="font-size:11px;padding:4px 6px;width:130px"
               onchange="guardarFechaVisita('${n.negocio_id}', this.value)"/>
      </td>
    </tr>`;
  }).join("");

  // Si hay ruta, renderizarla en el mapa
  if (ruta && typeof renderRutaEnMapa === "function") {
    document.getElementById("btn-ver-ruta-campana").style.display = "inline-block";
    window._rutaCampana = ruta;
  } else {
    document.getElementById("btn-ver-ruta-campana").style.display = "none";
  }
}

// ── Acciones sobre negocios ───────────────────────────────────────────────────

async function actualizarChecklist(cnId, negocioId, checkbox) {
  // Recopilar estado actual de todos los checkboxes del mismo negocio
  const row = document.getElementById(`cn-row-${negocioId}`);
  if (!row) return;
  const items = Array.from(row.querySelectorAll('details input[type="checkbox"]'));
  const checklist = items.map(cb => ({ texto: cb.nextSibling?.textContent?.trim() || "", done: cb.checked }));
  await fetch(`/api/campanas/${campanaActualId}/negocios/${negocioId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ checklist_json: JSON.stringify(checklist) }),
  });
}

async function toggleCompletado(negocioId, checkbox) {
  await fetch(`/api/campanas/${campanaActualId}/negocios/${negocioId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ completado: checkbox.checked }),
  });
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

function verRutaCampana() {
  if (window._rutaCampana && typeof renderRutaEnMapa === "function") {
    renderRutaEnMapa(window._rutaCampana);
    showTab("ruta");
  }
}

async function descargarReporteCampana() {
  const r   = await fetch(`/api/campanas/${campanaActualId}`);
  const d   = await r.json();
  const ids = d.negocios.map(n => n.negocio_id);
  if (typeof descargarReporte === "function") descargarReporte(ids);
}

// ── Modal: crear campaña ──────────────────────────────────────────────────────

function mostrarModalCrearCampana() {
  document.getElementById("modal-campana").style.display = "flex";
  // Poblar select de colonia si hay datos
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
  const body = {
    nombre:       document.getElementById("campana-nombre").value,
    descripcion:  document.getElementById("campana-desc").value,
    colonia:      document.getElementById("campana-colonia-input").value,
    fecha_inicio: document.getElementById("campana-fecha-inicio").value,
    fecha_fin:    document.getElementById("campana-fecha-fin").value,
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
  if (!confirm("¿Eliminar esta campaña permanentemente? Esta acción no se puede deshacer.")) return;
  await fetch(`/api/campanas/${campanaActualId}`, { method: "DELETE" });
  volverListaCampanas();
}

function volverListaCampanas() {
  campanaActualId = null;
  document.getElementById("campanas-detail-view").style.display = "none";
  document.getElementById("campanas-lista-view").style.display  = "flex";
  cargarCampanas();
}

// ── Agregar negocios desde la selección actual del mapa ──────────────────────

async function agregarNegociosSeleccionados() {
  if (!campanaActualId) return;
  const ids = Array.from(typeof rutaSeleccion !== "undefined" ? rutaSeleccion : []);
  if (!ids.length) { alert("Selecciona negocios en la pestaña Mapa o Ruta primero."); return; }
  const resp = await fetch(`/api/campanas/${campanaActualId}/negocios`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ negocio_ids: ids }),
  });
  const d = await resp.json();
  alert(`${d.insertados} negocio(s) agregado(s). ${d.duplicados_ignorados} ya estaban en la campaña.`);
  verCampana(campanaActualId);
}
