/* ══════════════════════════════════════════════════════════════════════════
   colonias.js — Polígonos geográficos de Mérida y Yucatán (INEGI + SEPOMEX)
   ══════════════════════════════════════════════════════════════════════════ */

let coloniasLayer      = null;   // L.layerGroup con los polígonos de colonias
let municipioLayer     = null;   // L.geoJSON con el contorno de Mérida
let municipiosYucLayer = null;   // L.geoJSON con los 106 municipios de Yucatán
let agebsLayer         = null;   // L.geoJSON con los 545 AGEBs de Mérida
let coloniasData       = [];     // [{id, nombre, count}]  — para dropdowns
let zonasData          = [];     // Zonas Firestore (legacy fallback)
let coloniasGeoJSON    = null;   // FeatureCollection colonias
let coloniaActual      = null;   // nombre seleccionado (MAYUSCULAS) o null
let _coloniasVisible      = false;
let _municipiosYucVisible = false;
let _agebsVisible         = false;

// Paleta de 14 colores para las colonias
const COLONIA_COLORS = [
  "#3b82f6","#8b5cf6","#ec4899","#f59e0b","#10b981",
  "#06b6d4","#f97316","#6366f1","#84cc16","#ef4444",
  "#14b8a6","#a855f7","#0ea5e9","#f43f5e",
];

// ── Carga principal ───────────────────────────────────────────────────────────
async function cargarColonias() {
  try {
    const [rCol, rZon, rGeo] = await Promise.all([
      fetch("/api/colonias"),
      fetch("/api/zonas"),
      fetch("/api/colonias-geojson"),
    ]);
    coloniasData    = await rCol.json();
    zonasData       = await rZon.json();
    coloniasGeoJSON = await rGeo.json();

    _poblarSelectColonia();
    _renderColoniasReales();
  } catch (e) {
    console.warn("[colonias] Error al cargar:", e.message);
  }
}

// Alias usado por la pestaña Ruta
async function cargarColoniasConCandidatos() {
  try {
    const r    = await fetch("/api/colonias");
    const data = await r.json();
    const sel  = document.getElementById("ruta-colonia-sel");
    if (!sel) return;
    sel.innerHTML = '<option value="">Selecciona una colonia\u2026</option>' +
      data.map(c => `<option value="${c.id}">${c.nombre} (${c.count})</option>`).join("");
  } catch (e) {
    console.warn("[colonias] cargarColoniasConCandidatos:", e.message);
  }
}

// ── Poblar selects ────────────────────────────────────────────────────────────
function _poblarSelectColonia() {
  document.querySelectorAll(".select-colonia").forEach(sel => {
    const placeholder = sel.options[0]?.text || "Todas las colonias";
    sel.innerHTML = `<option value="">${placeholder}</option>`;
    coloniasData.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = `${c.nombre} (${c.count})`;
      sel.appendChild(opt);
    });
  });
}

// ── Contorno del municipio (fondo gris claro) ─────────────────────────────────
function _renderMunicipio(geojson) {
  if (municipioLayer) map.removeLayer(municipioLayer);
  if (!geojson || !geojson.features || !geojson.features.length) return;

  municipioLayer = L.geoJSON(geojson, {
    style: {
      color:       "#475569",
      weight:      2.5,
      dashArray:   "6 4",
      fillColor:   "#1e293b",
      fillOpacity: 0,
    },
    interactive: false,
  });

  // Se muestra solo cuando la capa de colonias está activa
}

// ── Renderiza polígonos reales (INEGI/SEPOMEX) ────────────────────────────────
function _renderColoniasReales() {
  if (coloniasLayer) map.removeLayer(coloniasLayer);
  if (!coloniasGeoJSON || !coloniasGeoJSON.features || !coloniasGeoJSON.features.length) {
    _renderZonasFirestore();
    return;
  }

  coloniasLayer = L.layerGroup();

  coloniasGeoJSON.features.forEach((feat, i) => {
    // Soporta formato INEGI/SEPOMEX: nombre, d_codigo, tipo, colonias[]
    const props = feat.properties || {};
    const nombreRaw = props.nombre || props.nombre_raw || `CP ${props.d_codigo || "?"}`;
    const tipo = props.tipo || "";
    const cp = props.d_codigo || "";
    const numColonias = props.num_colonias || 1;

    // Tooltip con info detallada
    let tooltipText = nombreRaw;
    if (tipo) tooltipText += ` (${tipo})`;
    if (cp) tooltipText += `<br><small>CP: ${cp}</small>`;
    if (numColonias > 1) tooltipText += `<br><small>${numColonias} colonias en este CP</small>`;

    try {
      const color = COLONIA_COLORS[i % COLONIA_COLORS.length];
      const lyr = L.geoJSON(feat, {
        style: {
          color:       "#ffffff",
          weight:      1.2,
          fillColor:   color,
          fillOpacity: 0.14,
        },
      });

      lyr.on("mouseover", e => {
        e.target.setStyle({ fillOpacity: 0.30, weight: 2.5, color: "#ffffff" });
      });
      lyr.on("mouseout", e => {
        const sel = coloniaActual && coloniaActual === (props.nombre || "").toUpperCase();
        e.target.setStyle({ fillOpacity: sel ? 0.35 : 0.14, weight: sel ? 3 : 1.2 });
      });
      lyr.on("click", () => {
        const nombre_upper = (props.nombre || nombreRaw).toUpperCase();
        const match = _buscarColoniaMatch(nombre_upper);
        const val   = match ? match.id : nombre_upper;
        document.querySelectorAll(".select-colonia").forEach(s => { s.value = val; });
        coloniaActual = val || null;
        _resaltarColonia(nombre_upper);
        if (typeof cargarCandidatos === "function") {
          cargarCandidatos(coloniaActual, filtroTipoActual || null);
        }
      });

      lyr.bindTooltip(tooltipText, {
        permanent:  false,
        direction:  "center",
        className:  "colonia-tooltip",
        opacity:    0.93,
        sticky:     true,
      });

      lyr.addTo(coloniasLayer);
    } catch (_) {}
  });
}

// Fallback: Firestore bounding boxes
function _renderZonasFirestore() {
  if (!zonasData.length) return;
  coloniasLayer = L.layerGroup();
  zonasData.forEach((z, i) => {
    if (!z.geometry) return;
    try {
      const color = COLONIA_COLORS[i % COLONIA_COLORS.length];
      L.geoJSON(z.geometry, {
        style: { color, weight: 1.5, fillColor: color, fillOpacity: 0.07, dashArray: "4 3" },
      })
        .bindTooltip(z.nombre, { permanent: false, direction: "center", className: "colonia-tooltip" })
        .addTo(coloniasLayer);
    } catch (_) {}
  });
}

// ── Resalta la colonia seleccionada ───────────────────────────────────────────
function _resaltarColonia(nombre_upper) {
  if (!coloniasLayer) return;
  coloniasLayer.eachLayer(lyr => {
    if (!lyr.getLayers) return;
    const subLyrs = lyr.getLayers();
    if (!subLyrs.length) return;
    const feat = subLyrs[0].feature;
    if (!feat) return;
    const n = (feat.properties.nombre || "").toUpperCase();
    const sel = n === nombre_upper;
    lyr.setStyle({ fillOpacity: sel ? 0.35 : 0.14, weight: sel ? 3 : 1.2 });
  });
}

// ── Búsqueda fuzzy para emparejar con candidatos ──────────────────────────────
function _buscarColoniaMatch(nombre_upper) {
  if (!coloniasData.length) return null;
  // Exacta
  let m = coloniasData.find(c => c.id === nombre_upper);
  if (m) return m;
  // Sin prefijo "COL.", "COLONIA", "FRACC.", "FRACCIONAMIENTO"
  const clean = nombre_upper
    .replace(/^(COL\.|COLONIA|FRACC\.|FRACCIONAMIENTO|BARRIO)\s+/i, "").trim();
  m = coloniasData.find(c => {
    const cClean = c.id.replace(/^(COL\.|COLONIA|FRACC\.|FRACCIONAMIENTO)\s+/i, "").trim();
    return cClean === clean || c.id.includes(clean) || clean.includes(c.id);
  });
  return m || null;
}

// ── Toggle botón "Colonias" ───────────────────────────────────────────────────
function toggleColoniasLayer(btn) {
  if (!coloniasLayer) {
    _coloniasVisible = true;
    btn.classList.add("active");
    cargarColonias().then(() => {
      if (_coloniasVisible && coloniasLayer) coloniasLayer.addTo(map);
    });
    return;
  }

  _coloniasVisible = !_coloniasVisible;
  if (_coloniasVisible) {
    if (coloniasLayer) coloniasLayer.addTo(map);
    btn.classList.add("active");
  } else {
    if (coloniasLayer) map.removeLayer(coloniasLayer);
    btn.classList.remove("active");
  }
}

// ── Cambio de colonia en cualquier select ─────────────────────────────────────
function onColoniaChange(selectEl) {
  coloniaActual = selectEl.value || null;
  document.querySelectorAll(".select-colonia").forEach(s => {
    if (s !== selectEl) s.value = selectEl.value;
  });
  if (coloniaActual && coloniasLayer) _resaltarColonia(coloniaActual);
  if (typeof cargarCandidatos === "function") {
    cargarCandidatos(coloniaActual, filtroTipoActual || null);
  }
}


// ══════════════════════════════════════════════════════════════════════════════
// MUNICIPIOS DE YUCATÁN (106 municipios con polígonos INEGI)
// ══════════════════════════════════════════════════════════════════════════════

async function cargarMunicipiosYucatan() {
  console.log("[DEBUG] Iniciando fetch /api/municipios-yucatan-geojson");
  try {
    const r = await fetch("/api/municipios-yucatan-geojson");
    console.log("[DEBUG] Response status:", r.status);
    const geojson = await r.json();
    console.log("[DEBUG] Municipios features:", geojson?.features?.length);
    _renderMunicipiosYucatan(geojson);
  } catch (e) {
    console.error("[municipios] Error al cargar:", e);
  }
}

function _renderMunicipiosYucatan(geojson) {
  if (municipiosYucLayer) map.removeLayer(municipiosYucLayer);
  if (!geojson || !geojson.features || !geojson.features.length) return;

  municipiosYucLayer = L.geoJSON(geojson, {
    style: (feat) => ({
      color:       "#f59e0b",
      weight:      2,
      fillColor:   "#f59e0b",
      fillOpacity: 0.08,
    }),
    onEachFeature: (feat, lyr) => {
      const props = feat.properties || {};
      const nombre = props.nomgeo || props.nom_mun || "Municipio";
      const pob = props.pob_total ? parseInt(props.pob_total).toLocaleString() : "?";

      lyr.bindTooltip(`<b>${nombre}</b><br>Población: ${pob}`, {
        permanent: false,
        direction: "center",
        className: "colonia-tooltip",
      });

      lyr.on("mouseover", e => {
        e.target.setStyle({ fillOpacity: 0.25, weight: 3 });
      });
      lyr.on("mouseout", e => {
        e.target.setStyle({ fillOpacity: 0.08, weight: 2 });
      });
    }
  });
}

function toggleMunicipiosYucatan(btn) {
  console.log("[DEBUG] toggleMunicipiosYucatan llamado");
  if (!municipiosYucLayer) {
    _municipiosYucVisible = true;
    btn.classList.add("active");
    cargarMunicipiosYucatan().then(() => {
      console.log("[DEBUG] municipiosYucLayer cargado:", municipiosYucLayer);
      if (_municipiosYucVisible && municipiosYucLayer) municipiosYucLayer.addTo(map);
    }).catch(e => console.error("[DEBUG] Error cargando municipios:", e));
    return;
  }

  _municipiosYucVisible = !_municipiosYucVisible;
  if (_municipiosYucVisible) {
    municipiosYucLayer.addTo(map);
    btn.classList.add("active");
  } else {
    map.removeLayer(municipiosYucLayer);
    btn.classList.remove("active");
  }
}


// ══════════════════════════════════════════════════════════════════════════════
// AGEBs DE MÉRIDA (545 zonas censales con datos del Censo 2020)
// ══════════════════════════════════════════════════════════════════════════════

async function cargarAgebs() {
  console.log("[DEBUG] Iniciando fetch /api/agebs-geojson");
  try {
    const r = await fetch("/api/agebs-geojson");
    console.log("[DEBUG] Response status:", r.status);
    const geojson = await r.json();
    console.log("[DEBUG] AGEBs features:", geojson?.features?.length);
    _renderAgebs(geojson);
  } catch (e) {
    console.error("[agebs] Error al cargar:", e);
  }
}

function _renderAgebs(geojson) {
  if (agebsLayer) map.removeLayer(agebsLayer);
  if (!geojson || !geojson.features || !geojson.features.length) return;

  // Calcular max población para escala de colores
  const pobs = geojson.features.map(f => parseInt(f.properties?.pob_total || 0));
  const maxPob = Math.max(...pobs);

  agebsLayer = L.geoJSON(geojson, {
    style: (feat) => {
      const pob = parseInt(feat.properties?.pob_total || 0);
      const intensity = Math.min(pob / (maxPob * 0.5), 1); // Normalizar
      return {
        color:       "#10b981",
        weight:      1,
        fillColor:   `rgba(16, 185, 129, ${0.1 + intensity * 0.4})`,
        fillOpacity: 0.1 + intensity * 0.4,
      };
    },
    onEachFeature: (feat, lyr) => {
      const props = feat.properties || {};
      const clave = props.cve_ageb || props.cvegeo || "?";
      const pob = props.pob_total ? parseInt(props.pob_total).toLocaleString() : "?";
      const viv = props.total_viviendas_habitadas ? parseInt(props.total_viviendas_habitadas).toLocaleString() : "?";

      lyr.bindTooltip(
        `<b>AGEB ${clave}</b><br>` +
        `Población: ${pob}<br>` +
        `Viviendas: ${viv}`,
        { permanent: false, direction: "center", className: "colonia-tooltip" }
      );

      lyr.on("mouseover", e => {
        e.target.setStyle({ weight: 3, color: "#ffffff" });
      });
      lyr.on("mouseout", e => {
        e.target.setStyle({ weight: 1, color: "#10b981" });
      });
    }
  });
}

function toggleAgebs(btn) {
  console.log("[DEBUG] toggleAgebs llamado");
  if (!agebsLayer) {
    _agebsVisible = true;
    btn.classList.add("active");
    cargarAgebs().then(() => {
      console.log("[DEBUG] agebsLayer cargado:", agebsLayer);
      if (_agebsVisible && agebsLayer) agebsLayer.addTo(map);
    }).catch(e => console.error("[DEBUG] Error cargando agebs:", e));
    return;
  }

  _agebsVisible = !_agebsVisible;
  if (_agebsVisible) {
    agebsLayer.addTo(map);
    btn.classList.add("active");
  } else {
    map.removeLayer(agebsLayer);
    btn.classList.remove("active");
  }
}
