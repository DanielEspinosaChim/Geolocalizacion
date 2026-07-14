import {
  MESES,
  totalesPorMes,
  variaciones,
  type Producto,
  type VariacionMes,
} from '../model/canasta';

/** Paleta de la infografía, alineada con el tema claro de la app. */
const COL = {
  indigo: '#4648d4',
  texto: '#202124',
  subtle: '#80868b',
  sube: '#d93025',
  baja: '#188038',
  reja: '#eef0f3',
  reja0: '#c7c4d7',
  pie: '#f1f3f4',
} as const;

const W = 1280;
const H = 720;
const CHART = { x0: 72, y0: 148, w: W - 108, h: H - 230 };

type Ctx = CanvasRenderingContext2D;

/**
 * Dibuja la infografía mensual de variación % en un canvas y dispara su
 * descarga como PNG. Portada del módulo original, repintada al tema claro.
 * Devuelve false si no hay meses comparables.
 */
export function generarInfografia(productos: Producto[], year: string): boolean {
  const datos = variaciones(totalesPorMes(productos, [...MESES]), [...MESES]);
  if (!datos.length) return false;

  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const c = cv.getContext('2d');
  if (!c) return false;

  dibujarFondo(c);
  dibujarEncabezado(c, year);
  const midY = CHART.y0 + CHART.h / 2;
  const yscale = (CHART.h * 0.44) / Math.max(...datos.map((d) => Math.abs(d.pct)), 1);
  dibujarRejilla(c, datos, midY, yscale);
  dibujarBarras(c, datos, midY, yscale);
  dibujarPie(c);
  descargarPng(cv, year);
  return true;
}

function dibujarFondo(c: Ctx) {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, W, H);
  c.fillStyle = COL.indigo;
  c.fillRect(0, 0, 6, H);
}

function dibujarEncabezado(c: Ctx, year: string) {
  c.fillStyle = COL.indigo;
  c.font = 'bold 11px Arial';
  c.fillText('CANACO SERVYTUR MÉRIDA', 36, 46);
  c.fillStyle = COL.texto;
  c.font = 'bold 28px Arial';
  c.fillText('VARIACIÓN % COSTO CANASTA BÁSICA', 36, 82);
  c.fillStyle = COL.subtle;
  c.font = '13px Arial';
  c.fillText(`Variación porcentual mensual · Mérida, Yucatán · ${year}`, 36, 106);
  c.strokeStyle = '#e3e6ea';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(36, 122);
  c.lineTo(W - 36, 122);
  c.stroke();
}

function dibujarRejilla(c: Ctx, datos: VariacionMes[], midY: number, yscale: number) {
  const maxAbs = Math.max(...datos.map((d) => Math.abs(d.pct)), 1);
  const step = maxAbs > 4 ? 2 : 1;
  for (let v = -Math.ceil(maxAbs); v <= Math.ceil(maxAbs); v += step) {
    const y = midY - v * yscale;
    c.strokeStyle = v === 0 ? COL.reja0 : COL.reja;
    c.lineWidth = v === 0 ? 1.5 : 1;
    c.beginPath();
    c.moveTo(CHART.x0, y);
    c.lineTo(CHART.x0 + CHART.w, y);
    c.stroke();
    if (v !== 0) {
      c.fillStyle = COL.subtle;
      c.font = '10px Arial';
      c.textAlign = 'right';
      c.fillText(`${v > 0 ? '+' : ''}${v}%`, CHART.x0 - 8, y + 4);
    }
  }
  c.strokeStyle = COL.indigo;
  c.lineWidth = 1;
  c.setLineDash([4, 4]);
  c.beginPath();
  c.moveTo(CHART.x0, midY);
  c.lineTo(CHART.x0 + CHART.w, midY);
  c.stroke();
  c.setLineDash([]);
}

function dibujarBarras(c: Ctx, datos: VariacionMes[], midY: number, yscale: number) {
  const slotW = CHART.w / datos.length;
  const barW = Math.min(64, slotW * 0.52);
  c.textAlign = 'center';
  datos.forEach((d, i) => {
    const barH = Math.abs(d.pct) * yscale;
    const bx = CHART.x0 + slotW * i + slotW / 2;
    const by = d.pct >= 0 ? midY - barH : midY;
    const col = d.pct > 0 ? COL.sube : COL.baja;
    c.fillStyle = col;
    c.beginPath();
    c.roundRect(bx - barW / 2, by, barW, barH, 5);
    c.fill();
    c.fillStyle = col;
    c.font = 'bold 15px Arial';
    c.fillText(`${d.pct > 0 ? '+' : ''}${d.pct}%`, bx, d.pct >= 0 ? by - 10 : by + barH + 20);
    c.fillStyle = COL.subtle;
    c.font = '10px Arial';
    c.fillText(`$${d.total.toFixed(0)}`, bx, CHART.y0 + CHART.h + 36);
    c.fillStyle = COL.texto;
    c.font = 'bold 12px Arial';
    c.fillText(d.label, bx, CHART.y0 + CHART.h + 18);
  });
}

function dibujarPie(c: Ctx) {
  c.fillStyle = COL.pie;
  c.fillRect(0, H - 38, W, 38);
  c.fillStyle = COL.indigo;
  c.fillRect(0, H - 38, 4, 38);
  c.fillStyle = COL.subtle;
  c.font = '10px Arial';
  c.textAlign = 'left';
  c.fillText(
    'CANACO SERVYTUR Mérida — Cámara Nacional de Comercio, Servicios y Turismo',
    24,
    H - 14,
  );
  c.textAlign = 'right';
  const hoy = new Date().toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  c.fillText(`Elaborado el ${hoy}`, W - 24, H - 14);
}

function descargarPng(cv: HTMLCanvasElement, year: string) {
  cv.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `canasta_basica_${year}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}
