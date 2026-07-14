import ApexCharts from 'apexcharts';
import type { ApexOptions } from 'apexcharts';
import { useEffect, useRef } from 'react';

/** Lee un token HSL del tema (`239 62% 55%`) y lo vuelve un color CSS válido. */
function tokenColor(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `hsl(${v.replace(/\s+/g, ', ')})` : fallback;
}

interface CostoChartProps {
  labels: string[];
  valores: number[];
}

/**
 * Gráfica de columnas (ApexCharts) del costo total de la canasta por mes.
 * Toma el color de marca del tema, así que respeta claro/oscuro sin recompilar.
 */
export function CostoChart({ labels, valores }: CostoChartProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nodo = ref.current;
    if (!nodo) return;

    const brand = tokenColor('--primary', '#4648d4');
    const muted = tokenColor('--fg-muted', '#5f6368');

    const options: ApexOptions = {
      series: [{ name: 'Costo total', data: valores }],
      colors: [brand],
      chart: {
        type: 'bar',
        height: 280,
        fontFamily: 'Inter, sans-serif',
        toolbar: { show: false },
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '58%',
          borderRadiusApplication: 'end',
          borderRadius: 8,
        },
      },
      dataLabels: { enabled: false },
      legend: { show: false },
      grid: { show: false, padding: { left: 2, right: 2, top: -14 } },
      stroke: { show: true, width: 0, colors: ['transparent'] },
      states: { hover: { filter: { type: 'darken', value: 0.9 } } },
      tooltip: {
        shared: true,
        intersect: false,
        style: { fontFamily: 'Inter, sans-serif' },
        y: { formatter: (v: number) => `$${v.toFixed(2)}` },
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
  }, [labels, valores]);

  return <div ref={ref} className="w-full" />;
}
