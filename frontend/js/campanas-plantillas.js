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
