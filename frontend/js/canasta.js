/* ══════════════════════════════════════════════════════════════════════════
   canasta.js — Comparativo Costo Canasta Básica · CANACO SERVYTUR Mérida
   ══════════════════════════════════════════════════════════════════════════ */

const CAN_MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const CAN_LABELS = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];

let _canData    = [];   // productos cargados
let _canYear    = '2026';
let _canLoaded  = false;

// ── Carga principal ──────────────────────────────────────────────────────────

async function cargarCanasta(year) {
  const newYear = year || new Date().getFullYear().toString();
  if (_canLoaded && _canData.length && _canYear === newYear) return;
  _canYear = newYear;
  _inicializarSelectorAnio();

  const loading = document.getElementById('can-loading');
  const wrap    = document.getElementById('can-tabla-wrap');
  const resumen = document.getElementById('can-resumen');
  if (loading) loading.style.display = 'flex';
  if (wrap)    wrap.style.display    = 'none';
  if (resumen) resumen.style.display = 'none';

  try {
    const res = await fetch(`/api/canasta/${_canYear}`);
    if (!res.ok) throw new Error(await res.text());
    _canData   = await res.json();
    _canLoaded = true;
    _renderTabla(_canData);
    _renderResumen(_canData);
  } catch (e) {
    if (loading) {
      loading.innerHTML = `<span style="color:#ef4444">Error al cargar: ${e.message}</span>`;
    }
  }
}

// ── Meses visibles según año ─────────────────────────────────────────────────

function _mesesVisibles() {
  const hoy        = new Date();
  const anioActual = hoy.getFullYear().toString();
  const mesActual  = hoy.getMonth(); // 0-based
  if (_canYear < anioActual) return CAN_MONTHS;                        // año pasado: 12 meses
  if (_canYear === anioActual) return CAN_MONTHS.slice(0, mesActual + 1); // solo hasta el mes actual
  return [];                                                             // año futuro: nada
}

function _inicializarSelectorAnio() {
  const sel = document.getElementById('can-year');
  if (!sel) return;
  const anioActual = new Date().getFullYear();
  const PRIMER_ANIO = 2025;
  sel.innerHTML = '';
  for (let a = anioActual; a >= PRIMER_ANIO; a--) {
    const opt = document.createElement('option');
    opt.value = a;
    opt.textContent = a;
    if (a.toString() === _canYear) opt.selected = true;
    sel.appendChild(opt);
  }
}

// ── Renderizado de tabla ─────────────────────────────────────────────────────

function _renderTabla(productos) {
  const loading = document.getElementById('can-loading');
  const wrap    = document.getElementById('can-tabla-wrap');
  if (loading) loading.style.display = 'none';

  const mesesActivos = _mesesVisibles();

  const thead = _buildThead(mesesActivos);
  const tbody = _buildTbody(productos, mesesActivos);
  const tfoot = _buildTfoot(productos, mesesActivos);

  const tabla = document.getElementById('can-tabla');
  tabla.innerHTML = thead + tbody + tfoot;

  if (wrap) wrap.style.display = 'block';
}

function _buildThead(meses) {
  const thMeses = meses.map((m, i) =>
    `<th style="${_thStyle()}">${CAN_LABELS[CAN_MONTHS.indexOf(m)]}</th>`
  ).join('');
  return `
    <thead>
      <tr>
        <th style="${_thStyle()}">CATEGORÍA</th>
        <th style="${_thStyle()}">SUMINISTRO</th>
        <th style="${_thStyle()}">PRES.</th>
        ${thMeses}
        <th style="${_thStyle('48px')}"></th>
      </tr>
    </thead>`;
}

function _buildTbody(productos, meses) {
  let html = '<tbody>';
  let lastCat = null;
  for (const p of productos) {
    const isNewCat = p.category !== lastCat;
    lastCat = p.category;
    const catCell = isNewCat
      ? `<td style="${_tdStyle()};font-weight:700;color:#dde9ff">${p.category}</td>`
      : `<td style="${_tdStyle()};color:#475569">${p.category}</td>`;

    const priceCells = meses.map(m => {
      const val = p.prices ? p.prices[m] : null;
      const display = val != null ? val.toFixed(2) : '';
      return `<td style="${_tdStyle()};text-align:right;padding-right:10px">
        <span class="can-cell"
              contenteditable="true"
              data-id="${p.id}" data-month="${m}"
              onblur="guardarPrecioCanasta(this)"
              onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}"
              style="display:inline-block;min-width:52px;outline:none;cursor:text;
                     border-radius:4px;padding:2px 4px;
                     ${val == null ? 'color:#334155' : 'color:#dde9ff'}"
        >${display}</span>
      </td>`;
    }).join('');

    html += `<tr style="border-bottom:1px solid #0f1f3d">
      ${catCell}
      <td style="${_tdStyle()};color:#94a3b8">${p.name}</td>
      <td style="${_tdStyle()};color:#475569">${p.unit}</td>
      ${priceCells}
      <td style="${_tdStyle()};text-align:center">
        <button onclick="eliminarProductoCanasta('${p.id}')"
                title="Desactivar producto"
                style="background:transparent;border:none;color:#334155;cursor:pointer;
                       font-size:14px;padding:2px 6px;border-radius:4px"
                onmouseover="this.style.color='#ef4444'"
                onmouseout="this.style.color='#334155'">✕</button>
      </td>
    </tr>`;
  }
  html += '</tbody>';
  return html;
}

function _buildTfoot(productos, meses) {
  const totales = meses.map(m => {
    const precios = productos.filter(p => p.prices && p.prices[m] != null).map(p => p.prices[m]);
    return precios.length ? precios.reduce((a, b) => a + b, 0) : null;
  });

  const totalRow = `<tr style="border-top:2px solid #1a2d56;background:#0a1428">
    <td colspan="3" style="${_tdStyle()};font-weight:700;color:#dde9ff">TOTAL</td>
    ${totales.map(t => `<td style="${_tdStyle()};text-align:right;padding-right:10px;
      font-weight:700;color:#dde9ff">${t != null ? '$ ' + t.toFixed(2) : ''}</td>`).join('')}
    <td style="${_tdStyle()}"></td>
  </tr>`;

  const difRow = `<tr style="background:#0a1428">
    <td colspan="3" style="${_tdStyle()};color:#475569">Diferencia vs mes anterior</td>
    ${totales.map((t, i) => {
      if (i === 0 || t == null || totales[i-1] == null) return `<td style="${_tdStyle()}"></td>`;
      const diff = t - totales[i-1];
      const color = diff > 0 ? '#ef4444' : diff < 0 ? '#22c55e' : '#475569';
      const sign  = diff > 0 ? '+' : '';
      return `<td style="${_tdStyle()};text-align:right;padding-right:10px;color:${color}">
        ${sign}$ ${diff.toFixed(2)}
      </td>`;
    }).join('')}
    <td style="${_tdStyle()}"></td>
  </tr>`;

  const pctRow = `<tr style="background:#0a1428;border-bottom:1px solid #1a2d56">
    <td colspan="3" style="${_tdStyle()};color:#475569">% vs mes anterior</td>
    ${totales.map((t, i) => {
      if (i === 0 || t == null || totales[i-1] == null || totales[i-1] === 0)
        return `<td style="${_tdStyle()}"></td>`;
      const pct = ((t - totales[i-1]) / totales[i-1]) * 100;
      const color = pct > 0 ? '#ef4444' : pct < 0 ? '#22c55e' : '#475569';
      const sign  = pct > 0 ? '+' : '';
      return `<td style="${_tdStyle()};text-align:right;padding-right:10px;
        font-weight:700;color:${color}">${sign}${pct.toFixed(1)}%</td>`;
    }).join('')}
    <td style="${_tdStyle()}"></td>
  </tr>`;

  return `<tfoot>${totalRow}${difRow}${pctRow}</tfoot>`;
}

function _thStyle(w) {
  return `padding:10px 12px;background:#0d1830;color:#475569;font-size:10px;font-weight:700;
    text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid #1a2d56;
    white-space:nowrap;position:sticky;top:0;z-index:1${w ? ';width:' + w : ''}`;
}

function _tdStyle() {
  return 'padding:8px 12px;border-bottom:1px solid #0f1f3d;font-size:12px;color:#94a3b8';
}

// ── Gráfica Chart.js ─────────────────────────────────────────────────────────

let _canChart = null;

function _renderResumen(productos) {
  const resumen = document.getElementById('can-resumen');
  const canvas  = document.getElementById('can-chart');
  if (!resumen || !canvas) return;

  const totales = CAN_MONTHS.map(m => {
    const vals = productos.filter(p => p.prices && p.prices[m] != null).map(p => p.prices[m]);
    return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
  });

  const labels = [];
  const pcts   = [];
  const colors = [];

  totales.forEach((t, i) => {
    if (i === 0 || t == null || totales[i - 1] == null) return;
    const pct = parseFloat(((t - totales[i - 1]) / totales[i - 1] * 100).toFixed(1));
    labels.push(CAN_LABELS[i]);
    pcts.push(pct);
    colors.push(pct > 0 ? 'rgba(239,68,68,0.85)' : 'rgba(34,197,94,0.85)');
  });

  if (!labels.length) return;

  if (_canChart) { _canChart.destroy(); _canChart = null; }

  _canChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data:            pcts,
        backgroundColor: colors,
        borderRadius:    6,
        borderSkipped:   false,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => {
              const v = ctx.parsed.y;
              return ` ${v > 0 ? '+' : ''}${v}%`;
            },
          },
        },
        datalabels: { display: false },
      },
      scales: {
        x: {
          grid:  { color: '#0f1f3d' },
          ticks: { color: '#64748b', font: { size: 11, weight: '600' } },
        },
        y: {
          grid:  { color: '#0f1f3d' },
          ticks: {
            color: '#64748b',
            font:  { size: 10 },
            callback: v => `${v > 0 ? '+' : ''}${v}%`,
          },
        },
      },
    },
  });

  resumen.style.display = 'block';
}

// ── Descarga Excel ───────────────────────────────────────────────────────────

async function descargarExcelCanasta() {
  try {
    const res = await fetch(`/api/canasta/${_canYear}/export/excel`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert('Error al generar Excel: ' + (err.detail || res.statusText));
      return;
    }
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `canasta_basica_${_canYear}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

// ── Guardar precio (edición inline) ─────────────────────────────────────────

async function guardarPrecioCanasta(cell) {
  const id    = cell.dataset.id;
  const month = cell.dataset.month;
  const raw   = cell.textContent.trim().replace(',', '.');
  const price = raw === '' ? null : parseFloat(raw);

  if (raw !== '' && isNaN(price)) {
    cell.style.color = '#ef4444';
    setTimeout(() => { cell.style.color = '#dde9ff'; }, 800);
    return;
  }

  cell.style.opacity = '.5';
  try {
    const r = await fetch(`/api/canasta/${_canYear}/${id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ month, price }),
    });
    if (!r.ok) throw new Error();

    // Actualizar dato en memoria y re-renderizar resumen
    const prod = _canData.find(p => p.id === id);
    if (prod) {
      if (!prod.prices) prod.prices = {};
      prod.prices[month] = price;
    }
    cell.style.color   = price == null ? '#334155' : '#dde9ff';
    cell.style.opacity = '1';
    cell.textContent   = price != null ? price.toFixed(2) : '';

    // Refrescar fila de totales y mini barras sin recargar toda la tabla
    _refreshTfoot();
    _renderResumen(_canData);
  } catch {
    cell.style.color   = '#ef4444';
    cell.style.opacity = '1';
    setTimeout(() => { cell.style.color = '#dde9ff'; }, 1000);
  }
}

function _refreshTfoot() {
  const tabla = document.getElementById('can-tabla');
  if (!tabla) return;
  const tfoot = tabla.querySelector('tfoot');
  if (!tfoot) return;
  const mesesActivos = _mesesVisibles();
  const nuevoTfoot = document.createElement('tfoot');
  nuevoTfoot.innerHTML = _buildTfoot(_canData, mesesActivos)
    .replace('<tfoot>', '').replace('</tfoot>', '');
  tfoot.replaceWith(nuevoTfoot);
}

// ── Agregar producto ─────────────────────────────────────────────────────────

function abrirModalCanasta() {
  document.getElementById('can-new-name').value = '';
  document.getElementById('can-new-unit').value = '';
  document.getElementById('can-modal-msg').style.display = 'none';
  const title = document.getElementById('can-modal-title');
  if (title) title.textContent = `Agregar producto · ${_canYear}`;
  document.getElementById('modal-canasta').style.display = 'flex';
  setTimeout(() => document.getElementById('can-new-name').focus(), 50);
}

function cerrarModalCanasta() {
  document.getElementById('modal-canasta').style.display = 'none';
}

async function confirmarAgregarProducto() {
  const name = document.getElementById('can-new-name').value.trim();
  const cat  = document.getElementById('can-new-cat').value;
  const unit = document.getElementById('can-new-unit').value.trim();
  const msg  = document.getElementById('can-modal-msg');

  if (!name) {
    msg.textContent = 'El nombre es requerido';
    msg.style.cssText = 'display:block;background:#7f1d1d33;color:#fca5a5;border-radius:6px;padding:8px 12px;font-size:12px;margin-bottom:14px';
    return;
  }

  try {
    const r = await fetch(`/api/canasta/${_canYear}/product`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, category: cat, unit }),
    });
    if (!r.ok) throw new Error(await r.text());
    cerrarModalCanasta();
    _canLoaded = false;
    cargarCanasta(_canYear);
  } catch (e) {
    msg.textContent = `Error: ${e.message}`;
    msg.style.cssText = 'display:block;background:#7f1d1d33;color:#fca5a5;border-radius:6px;padding:8px 12px;font-size:12px;margin-bottom:14px';
  }
}

// ── Eliminar (desactivar) producto ───────────────────────────────────────────

async function eliminarProductoCanasta(productId) {
  if (!confirm('¿Desactivar este producto de la canasta?')) return;
  try {
    await fetch(`/api/canasta/${_canYear}/${productId}`, { method: 'DELETE' });
    _canLoaded = false;
    cargarCanasta(_canYear);
  } catch { /* silent */ }
}

// ── Escaneo de facturas con IA ───────────────────────────────────────────────

let _scanResultados = [];

async function _procesarImagenCanasta(file) {
  if (!file) return;

  // Spinner en botones mientras procesa
  const overlay = document.createElement('div');
  overlay.id = 'scan-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.6);' +
    'display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px';
  overlay.innerHTML = `
    <div style="width:48px;height:48px;border:3px solid #1a2d56;border-top-color:#3b82f6;
                border-radius:50%;animation:spin 0.8s linear infinite"></div>
    <div style="color:#dde9ff;font-size:14px;font-weight:600">Analizando imagen con IA…</div>
    <div style="color:#475569;font-size:12px">Gemini está leyendo los precios</div>`;
  document.body.appendChild(overlay);

  try {
    const form = new FormData();
    form.append('imagen', file);

    const res = await fetch(`/api/canasta/${_canYear}/scan-invoice`, {
      method: 'POST',
      body:   form,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || res.statusText);
    }

    const data = await res.json();
    _scanResultados = data.items || [];

    document.body.removeChild(overlay);
    _mostrarModalScan(_scanResultados);
  } catch (e) {
    document.body.removeChild(overlay);
    alert('Error al escanear: ' + e.message);
  }

  // Reset file input para permitir subir la misma imagen de nuevo
  const inp = document.getElementById('can-file-input');
  if (inp) inp.value = '';
}

function _mostrarModalScan(items) {
  const tbody = document.getElementById('scan-tbody');
  const checkAll = document.getElementById('scan-check-all');
  if (checkAll) checkAll.checked = true;

  // Preseleccionar el mes actual
  const mesActual = CAN_MONTHS[new Date().getMonth()];
  const selMes = document.getElementById('scan-mes');
  if (selMes) selMes.value = mesActual;

  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="padding:24px;text-align:center;color:#475569">
      No se detectaron productos en la imagen.</td></tr>`;
  } else {
    tbody.innerHTML = items.map((item, i) => {
      const conf = item.confidence;
      const confColor = conf === 'high' ? '#22c55e' : conf === 'medium' ? '#f59e0b' : '#ef4444';
      const confLabel = conf === 'high' ? 'Alta' : conf === 'medium' ? 'Media' : 'Baja';
      const checked   = conf !== 'low' ? 'checked' : '';
      const mapped    = item.matched_name || '<span style="color:#ef4444">Sin mapear</span>';

      return `<tr style="border-bottom:1px solid #0f1f3d" data-idx="${i}">
        <td style="padding:9px 12px">
          <input type="checkbox" class="scan-item-check" data-idx="${i}" ${checked}
                 style="cursor:pointer"/>
        </td>
        <td style="padding:9px 12px;color:#94a3b8">${item.detected_name}
          <span style="color:#475569;font-size:10px;margin-left:4px">${item.detected_unit}</span>
        </td>
        <td style="padding:9px 12px;color:#dde9ff;font-weight:600">${mapped}</td>
        <td style="padding:9px 12px;text-align:right;color:#dde9ff;font-weight:700">
          $${item.detected_price.toFixed(2)}
        </td>
        <td style="padding:9px 12px;text-align:center">
          <span style="font-size:10px;font-weight:700;color:${confColor};
                       background:${confColor}18;border:1px solid ${confColor}40;
                       border-radius:99px;padding:2px 8px">${confLabel}</span>
        </td>
      </tr>`;
    }).join('');
  }

  document.getElementById('scan-msg').style.display = 'none';
  document.getElementById('modal-scan').style.display = 'flex';
}

function _scanToggleAll(checked) {
  document.querySelectorAll('.scan-item-check').forEach(cb => { cb.checked = checked; });
}

function cerrarModalScan() {
  document.getElementById('modal-scan').style.display = 'none';
  _scanResultados = [];
}

async function guardarEscaneo() {
  const mes  = document.getElementById('scan-mes').value;
  const msg  = document.getElementById('scan-msg');
  const checks = document.querySelectorAll('.scan-item-check:checked');

  if (!checks.length) {
    msg.textContent = 'Selecciona al menos un producto para guardar.';
    msg.style.cssText = 'display:block;background:#451a0340;color:#fde68a;border-radius:6px;padding:8px 12px;font-size:12px';
    return;
  }

  const seleccionados = Array.from(checks)
    .map(cb => _scanResultados[parseInt(cb.dataset.idx)])
    .filter(item => item && item.matched_id);

  if (!seleccionados.length) {
    msg.textContent = 'Los productos seleccionados no tienen producto mapeado en el catálogo.';
    msg.style.cssText = 'display:block;background:#7f1d1d33;color:#fca5a5;border-radius:6px;padding:8px 12px;font-size:12px';
    return;
  }

  // Guardar en paralelo
  const saves = seleccionados.map(item =>
    fetch(`/api/canasta/${_canYear}/${item.matched_id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ month: mes, price: item.detected_price }),
    })
  );

  try {
    await Promise.all(saves);
    cerrarModalScan();
    _canLoaded = false;
    await cargarCanasta(_canYear);
  } catch (e) {
    msg.textContent = 'Error al guardar: ' + e.message;
    msg.style.cssText = 'display:block;background:#7f1d1d33;color:#fca5a5;border-radius:6px;padding:8px 12px;font-size:12px';
  }
}

// ── Generar infografía PNG ───────────────────────────────────────────────────

function generarInfografiaCanasta() {
  if (!_canData.length) { alert('Carga los datos primero.'); return; }

  // Calcular totales y variaciones
  const totales = CAN_MONTHS.map(m => {
    const vals = _canData.filter(p => p.prices && p.prices[m] != null).map(p => p.prices[m]);
    return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
  });

  const meses = [], pcts = [], totMeses = [];
  totales.forEach((t, i) => {
    if (i === 0 || t == null || totales[i - 1] == null) return;
    meses.push(CAN_LABELS[i]);
    pcts.push(parseFloat(((t - totales[i - 1]) / totales[i - 1] * 100).toFixed(1)));
    totMeses.push(t);
  });

  if (!meses.length) { alert('Sin datos suficientes para generar imagen.'); return; }

  const W = 1280, H = 720;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');

  // ── Fondo ──────────────────────────────────────────────────────────────────
  const bg = c.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#060d1b');
  bg.addColorStop(1, '#0a1428');
  c.fillStyle = bg;
  c.fillRect(0, 0, W, H);

  // Borde izquierdo azul
  c.fillStyle = '#2563eb';
  c.fillRect(0, 0, 6, H);

  // ── Header ─────────────────────────────────────────────────────────────────
  c.fillStyle = '#2563eb';
  c.font = 'bold 11px Arial';
  c.fillText('CANACO SERVYTUR MÉRIDA', 36, 46);

  c.fillStyle = '#dde9ff';
  c.font = 'bold 28px Arial';
  c.fillText('VARIACIÓN % COSTO CANASTA BÁSICA', 36, 82);

  c.fillStyle = '#475569';
  c.font = '13px Arial';
  c.fillText(`Variación porcentual mensual · Mérida, Yucatán · ${_canYear}`, 36, 106);

  // Línea separadora
  c.strokeStyle = '#1a2d56';
  c.lineWidth = 1;
  c.beginPath(); c.moveTo(36, 122); c.lineTo(W - 36, 122); c.stroke();

  // ── Área del chart ─────────────────────────────────────────────────────────
  const cx0 = 72, cy0 = 148, cW = W - 108, cH = H - 230;
  const n = meses.length;
  const maxAbs = Math.max(...pcts.map(Math.abs), 1);
  const yscale = (cH * 0.44) / maxAbs;
  const midY = cy0 + cH / 2;

  // Grid horizontal
  const step = maxAbs > 4 ? 2 : 1;
  for (let v = -Math.ceil(maxAbs); v <= Math.ceil(maxAbs); v += step) {
    const y = midY - v * yscale;
    c.strokeStyle = v === 0 ? '#1e3a5f' : '#0f1a2e';
    c.lineWidth = v === 0 ? 1.5 : 1;
    c.beginPath(); c.moveTo(cx0, y); c.lineTo(cx0 + cW, y); c.stroke();

    if (v !== 0) {
      c.fillStyle = '#2d3f55';
      c.font = '10px Arial';
      c.textAlign = 'right';
      c.fillText(`${v > 0 ? '+' : ''}${v}%`, cx0 - 8, y + 4);
    }
  }

  // Línea cero (más visible)
  c.strokeStyle = '#2563eb';
  c.lineWidth = 1;
  c.setLineDash([4, 4]);
  c.beginPath(); c.moveTo(cx0, midY); c.lineTo(cx0 + cW, midY); c.stroke();
  c.setLineDash([]);

  // ── Barras ─────────────────────────────────────────────────────────────────
  const slotW = cW / n;
  const barW  = Math.min(64, slotW * 0.52);

  c.textAlign = 'center';
  meses.forEach((lbl, i) => {
    const pct  = pcts[i];
    const barH = Math.abs(pct) * yscale;
    const bx   = cx0 + slotW * i + slotW / 2;
    const by   = pct >= 0 ? midY - barH : midY;
    const col  = pct > 0 ? '#ef4444' : '#22c55e';

    // Barra con gradiente
    const gr = c.createLinearGradient(bx - barW / 2, by, bx + barW / 2, by + barH);
    gr.addColorStop(0, col + 'ff');
    gr.addColorStop(1, col + '88');
    c.fillStyle = gr;

    // Rounded rect manual (top corners)
    const r = 5;
    c.beginPath();
    if (pct >= 0) {
      c.moveTo(bx - barW / 2 + r, by);
      c.lineTo(bx + barW / 2 - r, by);
      c.quadraticCurveTo(bx + barW / 2, by, bx + barW / 2, by + r);
      c.lineTo(bx + barW / 2, by + barH);
      c.lineTo(bx - barW / 2, by + barH);
      c.lineTo(bx - barW / 2, by + r);
      c.quadraticCurveTo(bx - barW / 2, by, bx - barW / 2 + r, by);
    } else {
      c.moveTo(bx - barW / 2, by);
      c.lineTo(bx + barW / 2, by);
      c.lineTo(bx + barW / 2, by + barH - r);
      c.quadraticCurveTo(bx + barW / 2, by + barH, bx + barW / 2 - r, by + barH);
      c.lineTo(bx - barW / 2 + r, by + barH);
      c.quadraticCurveTo(bx - barW / 2, by + barH, bx - barW / 2, by + barH - r);
      c.lineTo(bx - barW / 2, by);
    }
    c.closePath();
    c.fill();

    // Etiqueta % sobre/bajo la barra
    c.fillStyle = col;
    c.font = 'bold 15px Arial';
    const lblY = pct >= 0 ? by - 10 : by + barH + 20;
    c.fillText(`${pct > 0 ? '+' : ''}${pct}%`, bx, lblY);

    // Total del mes debajo del mes
    c.fillStyle = '#334155';
    c.font = '10px Arial';
    c.fillText(`$${totMeses[i].toFixed(0)}`, bx, cy0 + cH + 36);

    // Etiqueta mes
    c.fillStyle = '#64748b';
    c.font = 'bold 12px Arial';
    c.fillText(lbl, bx, cy0 + cH + 18);
  });

  // ── Footer ──────────────────────────────────────────────────────────────────
  c.fillStyle = '#0a1020';
  c.fillRect(0, H - 38, W, 38);
  c.fillStyle = '#2563eb';
  c.fillRect(0, H - 38, 4, 38);

  c.fillStyle = '#334155';
  c.font = '10px Arial';
  c.textAlign = 'left';
  c.fillText('CANACO SERVYTUR Mérida — Cámara Nacional de Comercio, Servicios y Turismo', 24, H - 14);
  c.textAlign = 'right';
  const hoy = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  c.fillText(`Elaborado el ${hoy}`, W - 24, H - 14);

  // ── Descargar ───────────────────────────────────────────────────────────────
  cv.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = `canasta_basica_${_canYear}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

// ── Seed de datos históricos 2026 ────────────────────────────────────────────

async function seedCanasta() {
  if (!confirm('¿Cargar los datos históricos 2026 (Ene–Jul)? Solo se insertan los que no existen.')) return;
  try {
    const r = await fetch(`/api/canasta/2026/seed`, { method: 'POST' });
    const d = await r.json();
    alert(`Listo. Insertados: ${d.insertados} | Ya existían: ${d.ya_existian}`);
    _canLoaded = false;
    cargarCanasta('2026');
  } catch (e) {
    alert('Error al inicializar: ' + e.message);
  }
}
