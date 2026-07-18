import ApexCharts from 'apexcharts';
import type { ApexOptions } from 'apexcharts';
import { animate, useInView, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { getTheme, subscribeTheme } from '@core/theme';
import { formatNumero } from '@shared/lib/format';
import { Badge, Card } from '@shared/ui';
import type { Indice } from '../model/indice';

/** Lee un token HSL del tema (`227 63% 18%`) y lo vuelve un color CSS. */
function tokenColor(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `hsl(${v.replace(/\s+/g, ', ')})` : fallback;
}

/** Suscribe al tema para repintar con los tokens correctos al alternar claro/oscuro. */
function useThemeTick() {
  return useSyncExternalStore(subscribeTheme, getTheme, () => 'light' as const);
}

/**
 * Animación de entrada de las gráficas (ApexCharts trae su propio motor):
 * barras que crecen, dona que se dibuja. Se dispara al montar — por eso cada
 * tile monta su gráfica hasta que entra al viewport (useInView de motion).
 */
const ANIMACION: ApexOptions['chart'] = {
  animations: {
    enabled: true,
    speed: 900,
    animateGradually: { enabled: true, delay: 120 },
    dynamicAnimation: { enabled: true, speed: 350 },
  },
};

/**
 * Panorama visual del índice: fila de KPIs (contadores animados) + tres
 * tarjetas-gráfica con encabezado de cifra, al estilo de las chart cards de
 * dashboard. Colores de marca por tokens (navy = oficial/formal, ocre =
 * digital/informal), repintadas al cambiar tema.
 */
export function IndiceDashboard({ indice }: { indice: Indice }) {
  const d = indice.datos_entrada;
  const c = indice.chapman;
  const formales = d.m_overlap + d.n_formales_base + d.n_formales_otros;
  const informales = d.n_inf_observados;
  const pctInfObs = Math.round((informales / Math.max(1, formales + informales)) * 100);
  const alto = indice.escenarios.reduce((m, e) => Math.max(m, e.indice_pct), c.indice_pct);
  const totalFuentes =
    indice.fuentes.gmaps_limpio +
    indice.fuentes.osm_total +
    indice.fuentes.denue_total +
    indice.fuentes.canaco_total;

  return (
    <Card raised className="grid gap-5 p-6">
      <header className="grid gap-1">
        <h2 className="text-2xs font-bold uppercase tracking-widest text-primary">
          Panorama · resumen visual
        </h2>
        <p className="text-xs leading-relaxed text-fg-muted">
          Las mismas cifras de la metodología, en indicadores y gráficas: qué se observó, cuánto
          varía el índice según el supuesto y de dónde salen los datos.
        </p>
      </header>

      {/* ── KPIs: los números que resumen todo, con contador animado ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi etiqueta="Negocios estimados" valor={c.N_estimado_total} nota="en Mérida · Chapman" />
        <Kpi
          etiqueta="Informales estimados"
          valor={c.N_inf_estimado}
          nota="fuera del padrón"
          tono="text-secondary"
        />
        <Kpi
          etiqueta="Cobertura digital"
          valor={indice.cobertura_gmaps_pct}
          sufijo="%"
          nota="del DENUE visible en GMaps+OSM"
        />
        <Kpi
          etiqueta="Multiplicador"
          valor={indice.multiplicador}
          prefijo="×"
          decimales={2}
          nota="obs. → total estimado"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartTile
          titulo="Composición observada"
          cifra={formatNumero(formales + informales)}
          nota="negocios digitales clasificados"
          badge={<Badge tone="warning">{pctInfObs}% informal obs.</Badge>}
        >
          <DonutComposicion formales={formales} informales={informales} />
        </ChartTile>
        <ChartTile
          titulo="Índice por escenario"
          cifra={`${c.indice_pct}%–${alto}%`}
          nota="rango según método / supuesto α"
          badge={<Badge tone="info">4 escenarios</Badge>}
        >
          <BarrasEscenarios indice={indice} />
        </ChartTile>
      </div>

      <ChartTile
        titulo="Volumen por fuente"
        cifra={formatNumero(totalFuentes)}
        nota="registros tras limpieza"
        badge={<Badge tone="info">4 fuentes</Badge>}
      >
        <BarrasFuentes indice={indice} />
      </ChartTile>
    </Card>
  );
}

/* ────────────────────────── piezas ────────────────────────── */

/** KPI con contador animado (motion): cuenta de 0 al valor al entrar en vista. */
function Kpi({
  etiqueta,
  valor,
  nota,
  prefijo = '',
  sufijo = '',
  decimales = 0,
  tono = 'text-fg',
}: {
  etiqueta: string;
  valor: number;
  nota: string;
  prefijo?: string;
  sufijo?: string;
  decimales?: number;
  tono?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const enVista = useInView(ref, { once: true, margin: '-40px' });
  const sinMovimiento = useReducedMotion();
  const formato = (v: number) =>
    `${prefijo}${decimales ? v.toFixed(decimales) : formatNumero(Math.round(v))}${sufijo}`;

  useEffect(() => {
    const nodo = ref.current;
    if (!nodo || !enVista) return;
    if (sinMovimiento) {
      nodo.textContent = formato(valor);
      return;
    }
    const controls = animate(0, valor, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        nodo.textContent = formato(v);
      },
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enVista, valor, sinMovimiento]);

  return (
    <div className="grid content-start gap-0.5 rounded-card border border-border bg-bg p-4">
      <span className="text-2xs font-bold uppercase tracking-wide text-fg-muted">{etiqueta}</span>
      <span ref={ref} className={`font-display text-2xl font-extrabold tabular-nums ${tono}`}>
        {formato(0)}
      </span>
      <span className="text-2xs text-fg-subtle">{nota}</span>
    </div>
  );
}

/**
 * Marco de cada gráfica al estilo "chart card" de dashboard: encabezado con
 * cifra grande + badge, separador y la gráfica debajo. La gráfica se monta
 * hasta que el tile entra al viewport, para que su animación de entrada
 * (ApexCharts) se vea de verdad.
 */
function ChartTile({
  titulo,
  cifra,
  nota,
  badge,
  children,
}: {
  titulo: string;
  cifra: string;
  nota: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const enVista = useInView(ref, { once: true, margin: '-60px' });

  return (
    <div ref={ref} className="grid content-start gap-3 rounded-card border border-border bg-bg p-4">
      <div className="flex items-start justify-between gap-3 border-b border-border/70 pb-3">
        <dl>
          <dt className="text-xs text-fg-muted">{titulo}</dt>
          <dd className="font-display text-2xl font-extrabold tabular-nums text-fg">{cifra}</dd>
          <dd className="text-2xs text-fg-subtle">{nota}</dd>
        </dl>
        {badge}
      </div>
      <div className="min-h-[240px]">{enVista ? children : null}</div>
    </div>
  );
}

/** Dona: formales confirmados vs. informales observados en la muestra digital. */
function DonutComposicion({ formales, informales }: { formales: number; informales: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const theme = useThemeTick();

  useEffect(() => {
    const nodo = ref.current;
    if (!nodo) return;
    const navy = tokenColor('--primary', '#111e4c');
    const ocre = tokenColor('--secondary', '#c77b2c');
    const muted = tokenColor('--fg-muted', '#5f6368');
    const surface = tokenColor('--surface', '#ffffff');
    const fg = tokenColor('--fg', '#202124');

    const options: ApexOptions = {
      series: [formales, informales],
      labels: ['Formales confirmados', 'Informales observados'],
      colors: [navy, ocre],
      chart: { type: 'donut', height: 240, fontFamily: 'Inter, sans-serif', ...ANIMACION },
      // Anillo de 2px del color de superficie entre segmentos (mark spec).
      stroke: { width: 2, colors: [surface] },
      dataLabels: {
        enabled: true,
        formatter: (v: number) => `${Math.round(v)}%`,
        style: { fontSize: '11px', fontFamily: 'Inter, sans-serif', fontWeight: '700' },
        dropShadow: { enabled: false },
      },
      plotOptions: {
        pie: {
          donut: {
            size: '62%',
            labels: {
              show: true,
              // Solo números en el centro: el nombre de la serie ("Formales
              // confirmados") es más ancho que el hueco y se desbordaba sobre
              // el anillo. La simbología de abajo ya identifica cada color.
              name: { show: false },
              value: {
                fontSize: '20px',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 800,
                color: fg,
                formatter: (v: string) => formatNumero(Number(v)),
              },
              total: {
                show: true,
                label: 'Total',
                fontFamily: 'Inter, sans-serif',
                color: muted,
                formatter: () => formatNumero(formales + informales),
              },
            },
          },
        },
      },
      legend: {
        position: 'bottom',
        fontFamily: 'Inter, sans-serif',
        labels: { colors: muted },
        markers: { radius: 4 },
      },
      // `fillSeriesColor` (default en donas) pinta el tooltip del color de la
      // rebanada — texto ilegible sobre marino. Tooltip del tema, siempre.
      tooltip: { theme, fillSeriesColor: false, y: { formatter: (v: number) => formatNumero(v) } },
    };

    const chart = new ApexCharts(nodo, options);
    void chart.render();
    return () => chart.destroy();
  }, [formales, informales, theme]);

  return <div ref={ref} className="w-full" />;
}

/** Barras: índice % de Chapman + cada escenario del multiplicador. */
function BarrasEscenarios({ indice }: { indice: Indice }) {
  const ref = useRef<HTMLDivElement>(null);
  const theme = useThemeTick();

  useEffect(() => {
    const nodo = ref.current;
    if (!nodo) return;
    const navy = tokenColor('--primary', '#111e4c');
    const muted = tokenColor('--fg-muted', '#5f6368');
    // Tinta pensada para leerse SOBRE la barra navy (blanca en claro, oscura en
    // oscuro) — el token existe justo para texto encima de --primary.
    const sobreNavy = tokenColor('--primary-fg', '#ffffff');

    const filas = [
      { label: 'Chapman', pct: indice.chapman.indice_pct },
      ...indice.escenarios.map((e) => ({ label: `${e.etiqueta} · α${e.alpha}`, pct: e.indice_pct })),
    ];

    const options: ApexOptions = {
      series: [{ name: 'Índice', data: filas.map((f) => f.pct) }],
      colors: [navy],
      chart: {
        type: 'bar',
        height: 240,
        fontFamily: 'Inter, sans-serif',
        toolbar: { show: false },
        ...ANIMACION,
      },
      plotOptions: {
        bar: { horizontal: true, borderRadius: 4, borderRadiusApplication: 'end', barHeight: '58%' },
      },
      dataLabels: {
        enabled: true,
        formatter: (v: number) => `${v}%`,
        style: { fontSize: '11px', fontFamily: 'Inter, sans-serif', colors: [sobreNavy], fontWeight: '700' },
      },
      grid: { show: false, padding: { right: 24 } },
      xaxis: {
        categories: filas.map((f) => f.label),
        labels: { show: false },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: { style: { fontFamily: 'Inter, sans-serif', colors: muted, fontSize: '11px' } },
      },
      tooltip: { theme, y: { formatter: (v: number) => `${v}%` } },
      fill: { opacity: 1 },
    };

    const chart = new ApexCharts(nodo, options);
    void chart.render();
    return () => chart.destroy();
  }, [indice, theme]);

  return <div ref={ref} className="w-full" />;
}

/** Barras: volumen de cada fuente; navy = oficial, ocre = digital. */
function BarrasFuentes({ indice }: { indice: Indice }) {
  const ref = useRef<HTMLDivElement>(null);
  const theme = useThemeTick();

  useEffect(() => {
    const nodo = ref.current;
    if (!nodo) return;
    const navy = tokenColor('--primary', '#111e4c');
    const ocre = tokenColor('--secondary', '#c77b2c');
    const muted = tokenColor('--fg-muted', '#5f6368');
    const f = indice.fuentes;

    // Digital = ocre, oficial = navy (mismo criterio de color que el Paso 1).
    const filas = [
      { label: 'Google Maps', v: f.gmaps_limpio, color: ocre },
      { label: 'OpenStreetMap', v: f.osm_total, color: ocre },
      { label: 'DENUE', v: f.denue_total, color: navy },
      { label: 'CANACO', v: f.canaco_total, color: navy },
    ];

    const options: ApexOptions = {
      series: [{ name: 'Registros', data: filas.map((x) => ({ x: x.label, y: x.v, fillColor: x.color })) }],
      chart: {
        type: 'bar',
        height: 220,
        fontFamily: 'Inter, sans-serif',
        toolbar: { show: false },
        ...ANIMACION,
      },
      plotOptions: {
        bar: {
          columnWidth: '52%',
          borderRadius: 4,
          borderRadiusApplication: 'end',
          distributed: true,
          // Etiqueta ENCIMA de la barra, no dentro (queda sobre el fondo de la
          // tarjeta, en gris legible, no gris sobre navy).
          dataLabels: { position: 'top' },
        },
      },
      // `distributed` colorea por barra; ocultamos su leyenda automática.
      legend: { show: false },
      colors: filas.map((x) => x.color),
      dataLabels: {
        enabled: true,
        offsetY: -18,
        formatter: (v: number) => formatNumero(v),
        style: { fontSize: '10px', fontFamily: 'Inter, sans-serif', colors: [muted], fontWeight: '700' },
      },
      grid: { show: false, padding: { top: 14 } },
      stroke: { show: true, width: 0, colors: ['transparent'] },
      xaxis: {
        labels: { style: { fontFamily: 'Inter, sans-serif', colors: muted, fontSize: '12px' } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: { show: false },
      tooltip: { theme, y: { formatter: (v: number) => formatNumero(v) } },
      fill: { opacity: 1 },
    };

    const chart = new ApexCharts(nodo, options);
    void chart.render();
    return () => chart.destroy();
  }, [indice, theme]);

  return <div ref={ref} className="w-full" />;
}

/**
 * Curva de sensibilidad para el Paso 6: índice % en función de α. Muestra la
 * relación inversa (a menor visibilidad asumida del informal, mayor índice) y
 * ancla el Chapman como línea de referencia punteada. Se monta al entrar en
 * vista para que la línea se dibuje (animación de ApexCharts).
 */
export function CurvaSensibilidad({ indice }: { indice: Indice }) {
  const contRef = useRef<HTMLDivElement>(null);
  const enVista = useInView(contRef, { once: true, margin: '-60px' });
  return (
    <div ref={contRef} className="min-h-[230px]">
      {enVista ? <CurvaSensibilidadChart indice={indice} /> : null}
    </div>
  );
}

function CurvaSensibilidadChart({ indice }: { indice: Indice }) {
  const ref = useRef<HTMLDivElement>(null);
  const theme = useThemeTick();

  useEffect(() => {
    const nodo = ref.current;
    if (!nodo) return;
    const navy = tokenColor('--primary', '#111e4c');
    const ocre = tokenColor('--secondary', '#c77b2c');
    const muted = tokenColor('--fg-muted', '#5f6368');
    const surface = tokenColor('--surface', '#ffffff');

    const puntos = [...indice.escenarios]
      .sort((a, b) => a.alpha - b.alpha)
      .map((e) => ({ x: `α ${e.alpha.toFixed(2)}`, y: e.indice_pct }));

    const options: ApexOptions = {
      series: [{ name: 'Índice estimado', data: puntos }],
      colors: [navy],
      chart: {
        type: 'line',
        height: 230,
        fontFamily: 'Inter, sans-serif',
        toolbar: { show: false },
        ...ANIMACION,
      },
      stroke: { curve: 'smooth', width: 3 },
      markers: {
        size: 5,
        strokeWidth: 2,
        strokeColors: surface,
        hover: { size: 7 },
      },
      dataLabels: {
        enabled: true,
        formatter: (v: number) => `${v}%`,
        offsetY: -8,
        style: { fontSize: '11px', fontFamily: 'Inter, sans-serif', colors: [muted], fontWeight: '700' },
        background: { enabled: false },
      },
      annotations: {
        yaxis: [
          {
            y: indice.chapman.indice_pct,
            borderColor: ocre,
            strokeDashArray: 5,
            label: {
              text: `Chapman ${indice.chapman.indice_pct}% (sin supuestos)`,
              // 'right': el primer tramo de la curva (α bajas) suele pasar MUY
              // cerca del Chapman — la etiqueta ahí se encima con el punto y
              // su dataLabel. A la derecha, donde el índice ya bajó bastante,
              // queda lejos de cualquier marcador.
              position: 'right',
              textAnchor: 'end',
              offsetY: -8,
              style: { color: ocre, background: surface, fontFamily: 'Inter, sans-serif', fontWeight: 700 },
            },
          },
        ],
      },
      // Padding lateral generoso: el dataLabel del primer punto se centra
      // sobre su marcador, que vive justo en x=0 — la mitad izquierda del
      // texto invade el hueco de las etiquetas del eje Y si el padding es
      // corto. 36px es lo que necesita un rótulo tipo "62.6%" para no tocarlas.
      grid: { borderColor: `${muted}22`, padding: { top: 24, left: 36, right: 20 } },
      xaxis: {
        labels: { style: { fontFamily: 'Inter, sans-serif', colors: muted, fontSize: '12px' } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        // Techo con aire extra sobre el punto más alto: si el eje termina justo
        // en el valor máximo, su dataLabel (que flota arriba del marcador)
        // queda cortado o pegado al tick superior.
        max: (max: number) => Math.ceil((max + 6) / 5) * 5,
        labels: {
          formatter: (v: number) => `${Math.round(v)}%`,
          style: { fontFamily: 'Inter, sans-serif', colors: muted, fontSize: '11px' },
        },
      },
      tooltip: { theme, y: { formatter: (v: number) => `${v}%` } },
    };

    const chart = new ApexCharts(nodo, options);
    void chart.render();
    return () => chart.destroy();
  }, [indice, theme]);

  return <div ref={ref} className="w-full" />;
}
