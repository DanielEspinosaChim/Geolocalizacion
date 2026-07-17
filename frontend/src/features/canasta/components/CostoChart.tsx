import ApexCharts from 'apexcharts';
import type { ApexOptions } from 'apexcharts';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { getTheme, subscribeTheme } from '@core/theme';
import { formatoMoneda } from '../model/canasta';

/** Lee un token HSL del tema (`239 62% 55%`) y lo vuelve un color CSS válido. */
function tokenColor(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `hsl(${v.replace(/\s+/g, ', ')})` : fallback;
}

export interface SerieCosto {
  name: string;
  data: (number | null)[];
}

interface CostoChartProps {
  labels: string[];
  /** Una serie (año actual) o dos cuando se compara con otro año. */
  series: SerieCosto[];
}

/**
 * Gráfica de columnas (ApexCharts) del costo total de la canasta por mes.
 * Toma los colores del tema y se vuelve a pintar al cambiar claro/oscuro
 * (se suscribe al store de tema), así nunca queda con el color del tema previo.
 */
export function CostoChart({ labels, series }: CostoChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Redibuja al alternar tema: los colores salen de tokens resueltos en runtime.
  const theme = useSyncExternalStore(subscribeTheme, getTheme, () => 'light' as const);

  useEffect(() => {
    const nodo = ref.current;
    if (!nodo) return;

    const brand = tokenColor('--primary', '#4648d4');
    const muted = tokenColor('--fg-muted', '#5f6368');
    // La segunda serie (año de comparación) va en el naranja de marca (--secondary).
    const comparado = tokenColor('--secondary', '#c77b2c');
    const comparando = series.length > 1;

    const options: ApexOptions = {
      series,
      colors: comparando ? [brand, comparado] : [brand],
      chart: {
        type: 'bar',
        height: 280,
        fontFamily: 'Inter, sans-serif',
        toolbar: { show: false },
        // Barras que crecen al montar y transición suave al cambiar de datos.
        animations: {
          enabled: true,
          speed: 900,
          animateGradually: { enabled: true, delay: 120 },
          dynamicAnimation: { enabled: true, speed: 350 },
        },
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: comparando ? '70%' : '58%',
          borderRadiusApplication: 'end',
          borderRadius: 6,
          // Etiqueta del total encima de cada barra (como las gráficas de CANACO).
          dataLabels: { position: 'top' },
        },
      },
      dataLabels: {
        enabled: true,
        offsetY: -18,
        formatter: (v: number) => (v == null ? '' : `$${Math.round(v).toLocaleString('es-MX')}`),
        style: { fontSize: '10px', fontFamily: 'Inter, sans-serif', colors: [muted], fontWeight: '700' },
      },
      legend: {
        show: comparando,
        position: 'top',
        horizontalAlign: 'right',
        fontFamily: 'Inter, sans-serif',
        labels: { colors: muted },
        markers: { radius: 4 },
      },
      // Espacio arriba para las etiquetas de total sobre las barras.
      grid: { show: false, padding: { left: 2, right: 2, top: 14 } },
      stroke: { show: true, width: 0, colors: ['transparent'] },
      states: { hover: { filter: { type: 'darken', value: 0.9 } } },
      tooltip: {
        shared: true,
        intersect: false,
        theme,
        style: { fontFamily: 'Inter, sans-serif' },
        y: { formatter: (v: number) => (v == null ? '—' : formatoMoneda(v)) },
      },
      xaxis: {
        categories: labels,
        labels: { style: { fontFamily: 'Inter, sans-serif', colors: muted, fontSize: '12px' } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: { show: false },
      fill: { opacity: 1 },
    };

    const chart = new ApexCharts(nodo, options);
    void chart.render();
    return () => chart.destroy();
  }, [labels, series, theme]);

  return <div ref={ref} className="w-full" />;
}
