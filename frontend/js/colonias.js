/* ══════════════════════════════════════════════════════════════════════════
   colonias.js — Polígonos reales de colonias de Mérida (OpenStreetMap)
                 + contorno del municipio como fondo
   ══════════════════════════════════════════════════════════════════════════ */

let coloniasLayer   = null;   // L.layerGroup con los polígonos de colonias
let municipioLayer  = null;   // L.geoJSON con el contorno de la ciudad
let coloniasData    = [];     // [{id, nombre, count}]  — para dropdowns
let zonasData       = [];     // Zonas Firestore (legacy fallback)
let coloniasGeoJSON = null;   // FeatureCollection OSM colonias
let coloniaActual   = null;   // nombre seleccionado (MAYUSCULAS) o null
let _coloniasVisible = false;

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

// ── Renderiza polígonos reales de OSM ─────────────────────────────────────────
function _renderColoniasReales() {
  if (coloniasLayer) map.removeLayer(coloniasLayer);
  if (!coloniasGeoJSON || !coloniasGeoJSON.features || !coloniasGeoJSON.features.length) {
    _renderZonasFirestore();
    return;
  }

  coloniasLayer = L.layerGroup();

  coloniasGeoJSON.features.forEach((feat, i) => {
    const nombreRaw = feat.properties.nombre_raw || feat.properties.nombre || "Colonia";

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
        const sel = coloniaActual && coloniaActual === (feat.properties.nombre || "").toUpperCase();
        e.target.setStyle({ fillOpacity: sel ? 0.35 : 0.14, weight: sel ? 3 : 1.2 });
      });
      lyr.on("click", () => {
        const nombre_upper = (feat.properties.nombre || nombreRaw).toUpperCase();
        const match = _buscarColoniaMatch(nombre_upper);
        const val   = match ? match.id : nombre_upper;
        document.querySelectorAll(".select-colonia").forEach(s => { s.value = val; });
        coloniaActual = val || null;
        _resaltarColonia(nombre_upper);
        if (typeof cargarCandidatos === "function") {
          cargarCandidatos(coloniaActual, filtroTipoActual || null);
        }
      });

      lyr.bindTooltip(nombreRaw, {
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
