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
    // Obtener coords del negocio: primero del dato de campaña, luego de allData como fallback
    let negLat = negData?.lat;
    let negLng = negData?.lng;
    if ((!negLat || !negLng) && negData?.negocio_id) {
      const base2 = typeof allData !== "undefined" ? allData : (typeof _rutaData !== "undefined" ? _rutaData : []);
      const cand = base2.find(c => c.place_id === negData.negocio_id);
      if (cand) { negLat = cand.lat; negLng = cand.lng; }
    }
    if (negLat && negLng) {
      const dist = _haversineM(negLat, negLng, pos.coords.latitude, pos.coords.longitude);
      gps.visita_distancia = dist;
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
