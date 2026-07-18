import ApexCharts from 'apexcharts';
import type { ApexOptions } from 'apexcharts';
import { PieChart } from 'lucide-react';
import { useInView } from 'motion/react';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { getTheme, subscribeTheme } from '@core/theme';
import { formatNumero } from '@shared/lib/format';
import { Card } from '@shared/ui';
import { ANIMACION } from './IndiceDashboard';
import { MiniStat, PasoHeader } from './IndicePasos';
import type { Indice } from '../model/indice';

const fmt = formatNumero;

/**
 * Paleta de las gráficas de este archivo: hex FIJOS (no tokens), iguales en
 * ambos temas. `--primary` crudo falla la validación de contraste en tema
 * claro (se lee casi gris, mismo problema que ya se corrigió en los clusters
 * del mapa) — por eso el azul es un literal, no `hsl(var(--primary))`. Mismo
 * criterio que `TIPO_COLORS` (candidato.ts): color de dato, estable, no de
 * tema. Validado con el validador de paletas (CVD y contraste, ambos temas).
 */
const COLOR_VERDE = '#188038'; // formal / DENUE
const COLOR_AZUL = '#5d83e9'; // formal / CANACO · OpenStreetMap
const COLOR_ROJO = '#dc2626'; // informal / candidatos
const COLOR_OCRE = '#c77b2c'; // Google Maps

/** Suscribe al tema para repintar tooltips/leyenda al alternar claro/oscuro. */
function useThemeTick() {
  return useSyncExternalStore(subscribeTheme, getTheme, () => 'light' as const);
}

/** Lee un token HSL del tema (`227 63% 18%`) y lo vuelve un color CSS. */
function tokenColor(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `hsl(${v.replace(/\s+/g, ', ')})` : fallback;
}

/** Paso 3: cruce de cada fuente digital contra las dos oficiales. */
export function Paso3Cruce({ indice }: { indice: Indice }) {
  const f = indice.fuentes;
  return (
    <Card raised className="grid gap-5 p-6">
      <PasoHeader numero={3} titulo="Cruce entre fuentes: ¿quién es formal?">
        Para cada negocio, buscamos si aparece en el DENUE o en la CANACO. Si coincide con alguno:{' '}
        <b className="text-success">formal confirmado</b>. Si no coincide con ninguno:{' '}
        <b className="text-danger">candidato a informal</b>. El cruce exige similitud de nombre y
        distancia máxima para evitar falsos positivos.
      </PasoHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <CruceTile
          titulo="Cruce con DENUE (INEGI)"
          tono="text-primary"
          filas={[
            ['Google Maps × DENUE', f.gm_denue],
            ['OpenStreetMap × DENUE', f.osm_denue],
          ]}
          total={f.gm_denue + f.osm_denue}
          totalLabel="Total encontrados en DENUE"
        />
        <CruceTile
          titulo="Cruce con CANACO"
          tono="text-primary"
          filas={[
            ['Google Maps × CANACO', f.gm_canaco],
            ['OpenStreetMap × CANACO', f.osm_canaco],
          ]}
          total={f.gm_canaco + f.osm_canaco}
          totalLabel="Total encontrados en CANACO"
        />
      </div>

      <div className="rounded-card border border-border bg-bg p-4">
        <h3 className="mb-1 text-sm font-bold text-fg">Comparación por fuente</h3>
        <p className="mb-2 text-2xs text-fg-subtle">
          Mismos números de arriba, uno junto al otro: ¿quién aporta más coincidencias, Google Maps
          u OpenStreetMap?
        </p>
        <BarrasCruce indice={indice} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-secondary/30 bg-bg p-5">
        <div>
          <h3 className="text-2xs font-bold uppercase tracking-wide text-secondary">
            Cruce Google Maps × OpenStreetMap
          </h3>
          <p className="mt-1 max-w-md text-xs leading-relaxed text-fg-muted">
            Negocios que aparecen en ambas fuentes digitales (mismo nombre, misma ubicación
            cercana). Este solapamiento es la clave del método Captura-Recaptura → Paso 5.
          </p>
        </div>
        <div className="text-center">
          <div className="font-display text-3xl font-extrabold tabular-nums text-fg">
            {fmt(f.gm_osm_overlap)}
          </div>
          <div className="text-xs font-semibold text-secondary">coincidencias</div>
        </div>
      </div>
    </Card>
  );
}

/** Barras agrupadas: Google Maps vs OpenStreetMap, una por registro oficial. */
function BarrasCruce({ indice }: { indice: Indice }) {
  const contRef = useRef<HTMLDivElement>(null);
  const enVista = useInView(contRef, { once: true, margin: '-60px' });
  return (
    <div ref={contRef} className="min-h-[220px]">
      {enVista ? <BarrasCruceChart indice={indice} /> : null}
    </div>
  );
}

function BarrasCruceChart({ indice }: { indice: Indice }) {
  const ref = useRef<HTMLDivElement>(null);
  const theme = useThemeTick();
  const f = indice.fuentes;

  useEffect(() => {
    const nodo = ref.current;
    if (!nodo) return;
    const muted = tokenColor('--fg-muted', '#5f6368');

    const options: ApexOptions = {
      series: [
        { name: 'Google Maps', data: [f.gm_denue, f.gm_canaco] },
        { name: 'OpenStreetMap', data: [f.osm_denue, f.osm_canaco] },
      ],
      colors: [COLOR_OCRE, COLOR_AZUL],
      chart: {
        type: 'bar',
        height: 220,
        fontFamily: 'Inter, sans-serif',
        toolbar: { show: false },
        ...ANIMACION,
      },
      plotOptions: {
        bar: { columnWidth: '55%', borderRadius: 4, borderRadiusApplication: 'end' },
      },
      dataLabels: {
        enabled: true,
        offsetY: -18,
        formatter: (v: number) => formatNumero(v),
        style: { fontSize: '10px', fontFamily: 'Inter, sans-serif', colors: [muted], fontWeight: '700' },
      },
      legend: {
        position: 'top',
        horizontalAlign: 'right',
        fontFamily: 'Inter, sans-serif',
        labels: { colors: muted },
        markers: { radius: 4 },
      },
      grid: { show: false, padding: { top: 14 } },
      stroke: { show: true, width: 0, colors: ['transparent'] },
      xaxis: {
        categories: ['DENUE', 'CANACO'],
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

function CruceTile({
  titulo,
  tono,
  filas,
  total,
  totalLabel,
}: {
  titulo: string;
  tono: string;
  filas: [string, number][];
  total: number;
  totalLabel: string;
}) {
  return (
    <div className="grid gap-3 rounded-card border border-border bg-bg p-5">
      <h3 className={`text-2xs font-bold uppercase tracking-wide ${tono}`}>{titulo}</h3>
      <div className="grid gap-1.5 text-sm">
        {filas.map(([label, valor]) => (
          <div key={label} className="flex items-center justify-between text-fg-muted">
            <span>{label}</span>
            <span className="font-bold tabular-nums text-fg">{fmt(valor)}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-border pt-3 text-sm font-bold text-fg">
        <span>{totalLabel}</span>
        <span className="tabular-nums">{fmt(total)}</span>
      </div>
    </div>
  );
}

/** Paso 4: resultado del inventario — formales vs. candidatos a informal. */
export function Paso4Resultado({ indice }: { indice: Indice }) {
  const d = indice.datos_entrada;
  const total = d.m_overlap + d.n_formales_base + d.n_formales_otros + d.n_inf_observados;

  return (
    <Card raised className="grid gap-5 p-6">
      <PasoHeader numero={4} titulo="Resultado del inventario: formales vs. informales detectados">
        Con los cruces completados, cada negocio queda clasificado.{' '}
        <b className="text-fg">Importante: solo vemos los informales con presencia digital.</b> Los
        siguientes pasos estiman cuántos hay en total.
      </PasoHeader>

      <div className="grid gap-5 lg:grid-cols-[1fr_minmax(0,20rem)]">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <ResultadoTile
            etiqueta="Formales en DENUE"
            valor={fmt(d.m_overlap)}
            nota="confirmados en el padrón del INEGI"
            tono="text-success"
          />
          <ResultadoTile
            etiqueta="Formales CANACO + cadenas"
            valor={fmt(d.n_formales_base + d.n_formales_otros)}
            nota="identificados por directorio o nombre reconocido"
            tono="text-success"
          />
          <ResultadoTile
            etiqueta="Candidatos a informal"
            valor={fmt(d.n_inf_observados)}
            nota="sin registro en ninguna fuente oficial"
            tono="text-danger"
          />
        </div>
        <Card className="grid content-start gap-4 p-5">
          <header className="flex items-center gap-2 border-b border-border pb-3">
            <PieChart className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <h3 className="font-display text-base font-bold text-fg">Reparto del inventario</h3>
            <span
              className="ml-auto cursor-help text-xs text-fg-subtle"
              title="Las tres cifras de la izquierda (Formales DENUE, Formales CANACO + cadenas, Candidatos a informal), en proporción sobre el total analizado."
            >
              ⓘ
            </span>
          </header>
          <DonutResultado indice={indice} />
        </Card>
      </div>

      <p className="rounded-card border border-success/30 bg-success/5 p-4 text-center text-sm text-fg">
        Verificación: {fmt(d.m_overlap)} (DENUE) + {fmt(d.n_formales_base + d.n_formales_otros)}{' '}
        (CANACO + cadenas) + {fmt(d.n_inf_observados)} (informales) ={' '}
        <b className="tabular-nums">{fmt(total)}</b> analizados ✓
      </p>
    </Card>
  );
}

/** Dona: las 3 rebanadas del inventario (2 formales + 1 informal). */
function DonutResultado({ indice }: { indice: Indice }) {
  const contRef = useRef<HTMLDivElement>(null);
  const enVista = useInView(contRef, { once: true, margin: '-60px' });
  return (
    <div ref={contRef} className="min-h-[220px]">
      {enVista ? <DonutResultadoChart indice={indice} /> : null}
    </div>
  );
}

function DonutResultadoChart({ indice }: { indice: Indice }) {
  const ref = useRef<HTMLDivElement>(null);
  const theme = useThemeTick();
  const d = indice.datos_entrada;

  useEffect(() => {
    const nodo = ref.current;
    if (!nodo) return;
    const muted = tokenColor('--fg-muted', '#5f6368');
    const surface = tokenColor('--surface', '#ffffff');
    const fg = tokenColor('--fg', '#202124');

    const formalesDenue = d.m_overlap;
    const formalesCanaco = d.n_formales_base + d.n_formales_otros;
    const informales = d.n_inf_observados;
    const totalDonut = formalesDenue + formalesCanaco + informales;

    const options: ApexOptions = {
      series: [formalesDenue, formalesCanaco, informales],
      labels: ['Formales DENUE', 'Formales CANACO + cadenas', 'Candidatos a informal'],
      colors: [COLOR_VERDE, COLOR_AZUL, COLOR_ROJO],
      chart: { type: 'donut', height: 260, fontFamily: 'Inter, sans-serif', ...ANIMACION },
      // Anillo más grueso y sin % en el arco: el número exacto ya vive en las
      // tarjetas de la izquierda — aquí el trabajo de la dona es solo mostrar
      // la proporción de un vistazo, sin duplicar cifras sobre el dibujo.
      stroke: { width: 2, colors: [surface] },
      dataLabels: { enabled: false },
      plotOptions: {
        pie: {
          donut: {
            size: '74%',
            labels: {
              show: true,
              name: { show: false },
              value: {
                fontSize: '26px',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 800,
                color: fg,
                formatter: (v: string) => formatNumero(Number(v)),
              },
              total: {
                show: true,
                label: 'Analizados',
                fontFamily: 'Inter, sans-serif',
                fontSize: '13px',
                color: muted,
                formatter: () => formatNumero(totalDonut),
              },
            },
          },
        },
      },
      legend: {
        position: 'bottom',
        fontSize: '12px',
        fontFamily: 'Inter, sans-serif',
        labels: { colors: muted },
        markers: { radius: 4 },
        itemMargin: { horizontal: 8, vertical: 4 },
      },
      tooltip: { theme, fillSeriesColor: false, y: { formatter: (v: number) => formatNumero(v) } },
    };

    const chart = new ApexCharts(nodo, options);
    void chart.render();
    return () => chart.destroy();
  }, [d, theme]);

  return <div ref={ref} className="w-full" />;
}

function ResultadoTile({
  etiqueta,
  valor,
  nota,
  tono,
}: {
  etiqueta: string;
  valor: string;
  nota: string;
  tono: string;
}) {
  return (
    <Card className="grid gap-1 p-5 text-center">
      {/* El color va en la etiqueta, no en el número (ver MiniStat): tres
          cifras de colores distintos lado a lado se leen como "arcoíris". */}
      <span className={`text-xs2 font-bold uppercase tracking-wide ${tono}`}>{etiqueta}</span>
      <span className="font-display text-2xl font-extrabold tabular-nums text-fg">{valor}</span>
      <span className="text-xs text-fg-muted">{nota}</span>
    </Card>
  );
}

/** Paso 5: derivación completa del estimador Chapman (captura-recaptura). */
export function Paso5Chapman({ indice }: { indice: Indice }) {
  const f = indice.fuentes;
  const c = indice.chapman;

  return (
    <Card raised className="grid gap-5 p-6">
      <PasoHeader numero={5} titulo="Captura-recaptura: ¿cuántos negocios existen en total?" metodo="Método 1">
        Método adoptado de la ecología y la epidemiología para estimar poblaciones a partir del
        solapamiento entre dos muestras independientes. <b className="text-fg">No requiere ningún
        supuesto</b> sobre la visibilidad de los negocios informales — solo los conteos y el cruce
        entre Google Maps y OpenStreetMap.
      </PasoHeader>

      <div className="grid gap-2 rounded-card border border-border bg-bg p-4 text-xs leading-relaxed text-fg-muted">
        <p>
          <b className="text-fg">¿Por qué {fmt(f.gmaps_limpio)} y no {fmt(f.gmaps_limpio + f.osm_total)}?</b> El
          Paso 2 limpió Google Maps a {fmt(f.gmaps_limpio)} negocios reales; OSM venía limpio con
          sus {fmt(f.osm_total)}. Juntos dan {fmt(f.gmaps_limpio + f.osm_total)}, pero el método{' '}
          <b className="text-fg">prohíbe sumarlos</b>: necesita las dos fuentes por separado para
          que el solapamiento entre ellas revele qué tan completa es cada una.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStat valor={fmt(f.gmaps_limpio)} etiqueta="Google Maps · n₁" tono="text-secondary" />
        <MiniStat valor={fmt(f.osm_total)} etiqueta="OpenStreetMap · n₂" tono="text-secondary" />
        <MiniStat valor={fmt(f.gm_osm_overlap)} etiqueta="En ambas · m" tono="text-fg" />
      </div>

      <div className="grid gap-2 rounded-card border border-border bg-bg p-4">
        <span className="text-2xs font-bold uppercase tracking-wide text-primary">
          Fórmula de Chapman (estimador insesgado)
        </span>
        <p className="font-mono text-xs tabular-nums text-fg-muted">
          N̂ = (n₁+1)(n₂+1) / (m+1) − 1
        </p>
        <p className="font-mono text-xs tabular-nums text-fg-muted">
          N̂ = ({fmt(f.gmaps_limpio)}+1)({fmt(f.osm_total)}+1) / ({fmt(f.gm_osm_overlap)}+1) − 1
        </p>
        <p className="font-mono text-sm font-bold tabular-nums text-fg">
          N̂ = {fmt(c.N_estimado_total)} negocios totales estimados en Mérida
        </p>
      </div>

      <div className="grid gap-1.5 rounded-card border border-primary/30 bg-primary/5 p-4 text-sm">
        <Fila etiqueta="Total estimado de negocios en Mérida" valor={fmt(c.N_estimado_total)} />
        <Fila etiqueta="Menos formales registrados en DENUE Mérida" valor={`− ${fmt(c.n_denue_ancla)}`} />
        <Fila etiqueta="Informales estimados" valor={fmt(c.N_inf_estimado)} tono="text-danger" />
        <div className="mt-1 flex items-center justify-between border-t border-border pt-2 font-bold text-fg">
          <span>Índice Chapman</span>
          <span className="text-lg tabular-nums text-primary">{c.indice_pct}%</span>
        </div>
      </div>
    </Card>
  );
}

function Fila({ etiqueta, valor, tono }: { etiqueta: string; valor: string; tono?: string }) {
  return (
    <div className="flex items-center justify-between text-fg-muted">
      <span className={tono}>{etiqueta}</span>
      <span className="font-bold tabular-nums text-fg">{valor}</span>
    </div>
  );
}
