import ApexCharts from 'apexcharts';
import type { ApexOptions } from 'apexcharts';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { getTheme, subscribeTheme } from '@core/theme';
import type { VariacionMes } from '../model/canasta';

/** Lee un token HSL del tema (`239 62% 55%`) y lo vuelve un color CSS válido. */
function tokenColor(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `hsl(${v.replace(/\s+/g, ', ')})` : fallback;
}

interface VariacionChartProps {
  datos: VariacionMes[];
}

/**
 * Gráfica de columnas divergentes con la variación % mes a mes, como la
 * "Infografía PNG" pero en vivo y con el par de marca del sistema (sube =
 * --secondary ocre, el polo cálido llama la atención sobre el encarecimiento;
 * baja = --primary marino). El signo ya lo codifica la dirección de la barra
 * desde 0%, así que no dependemos del color para leerlo. Par validado
 * (CVD ΔE ≥ 27, contraste ≥ 3:1 en ambos temas).
 */
export function VariacionChart({ datos }: VariacionChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const theme = useSyncExternalStore(subscribeTheme, getTheme, () => 'light' as const);

  useEffect(() => {
    const nodo = ref.current;
    if (!nodo) return;

    const muted = tokenColor('--fg-muted', '#5f6368');
    const sube = tokenColor('--secondary', '#c77b2c');
    const baja = tokenColor('--primary', '#111e4c');
    const surface = tokenColor('--surface', '#ffffff');
    // Con `background.enabled`, ApexCharts intercambia estos dos: el color
    // de `dataLabels.style` pinta la píldora de fondo y `background.foreColor`
    // pinta el texto (al revés de lo que sugieren sus nombres).
    const chipFondo = muted;
    const chipTexto = surface;

    const options: ApexOptions = {
      series: [{ name: 'Variación', data: datos.map((d) => d.pct) }],
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
          columnWidth: '52%',
          borderRadiusApplication: 'end',
          borderRadius: 6,
          dataLabels: { position: 'top' },
          colors: {
            ranges: [
              { from: -1000, to: 0, color: baja },
              { from: 0.001, to: 1000, color: sube },
            ],
          },
        },
      },
      dataLabels: {
        enabled: true,
        offsetY: -20,
        formatter: (v: number) => `${v > 0 ? '+' : ''}${v}%`,
        style: { fontSize: '10px', fontFamily: 'Inter, sans-serif', colors: [chipFondo], fontWeight: '700' },
        // Fondo propio: en barras negativas la etiqueta cae parcialmente
        // encima de la barra (limitación de ApexCharts con offsetY en
        // valores negativos) — el fondo garantiza contraste en cualquier caso.
        background: {
          enabled: true,
          foreColor: chipTexto,
          borderRadius: 3,
          padding: 4,
          opacity: 1,
          borderWidth: 0,
        },
      },
      // Espacio arriba y abajo: las etiquetas de subidas quedan sobre la barra,
      // las de bajadas quedan debajo (barras divergentes desde 0%).
      grid: { show: false, padding: { left: 2, right: 2, top: 14, bottom: 14 } },
      stroke: { show: true, width: 0, colors: ['transparent'] },
      states: { hover: { filter: { type: 'darken', value: 0.9 } } },
      tooltip: {
        theme,
        style: { fontFamily: 'Inter, sans-serif' },
        y: { formatter: (v: number) => `${v > 0 ? '+' : ''}${v}%` },
      },
      xaxis: {
        categories: datos.map((d) => d.label),
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
  }, [datos, theme]);

  return <div ref={ref} className="w-full" />;
}
