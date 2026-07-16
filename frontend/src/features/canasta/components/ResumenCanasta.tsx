import { ArrowDown, ArrowUp, ShoppingBasket } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card } from '@shared/ui';
import {
  formatoMoneda,
  mesLabel,
  promediosTrimestralesCanasta,
  totalesPorMes,
  trimestresActivos,
  variaciones,
  type Mes,
  type Producto,
  type VistaCanasta,
} from '../model/canasta';
import { CostoChart, type SerieCosto } from './CostoChart';
import { VariacionChart } from './VariacionChart';

interface ResumenCanastaProps {
  productos: Producto[];
  meses: Mes[];
  year: string;
  /** Año B de comparación y sus productos; si vienen, la gráfica muestra 2 series. */
  yearB?: string | null;
  productosB?: Producto[] | null;
  /** En 'variacion' la gráfica cambia a barras de variación % mes a mes. */
  vista?: VistaCanasta;
  /** Acciones del pie (Excel, Infografía…). */
  acciones?: ReactNode;
}

/**
 * Datos para la gráfica. Al comparar usa TODOS los meses (con huecos donde
 * falte dato) y dos series; si no, solo los meses con precio, sin huecos.
 */
function datosGrafica({
  meses,
  totales,
  year,
  yearB,
  productosB,
}: {
  meses: Mes[];
  totales: (number | null)[];
  year: string;
  yearB: string | null;
  productosB: Producto[] | null;
}): { labels: string[]; series: SerieCosto[] } {
  if (yearB != null && productosB != null) {
    return {
      labels: meses.map(mesLabel),
      series: [
        { name: year, data: totales },
        { name: yearB, data: totalesPorMes(productosB, meses) },
      ],
    };
  }
  const conDatos = meses
    .map((m, i) => ({ m, t: totales[i] }))
    .filter((x): x is { m: Mes; t: number } => x.t != null);
  return { labels: conDatos.map((x) => mesLabel(x.m)), series: [{ name: year, data: conDatos.map((x) => x.t) }] };
}

/**
 * Tarjeta de resumen del costo de la canasta: cifra del último mes, variación
 * vs el anterior y gráfica de columnas. Sigue el patrón de "stat card": la
 * variación se marca con un chip de marca (indigo), no con rojo/verde.
 */
export function ResumenCanasta({
  productos,
  meses,
  year,
  yearB = null,
  productosB = null,
  vista = 'precios',
  acciones,
}: ResumenCanastaProps) {
  const totales = totalesPorMes(productos, meses);
  const conDatos = meses
    .map((m, i) => ({ m, t: totales[i] }))
    .filter((x): x is { m: Mes; t: number } => x.t != null);

  const ultimo = conDatos.at(-1);
  if (!ultimo) {
    return <Card className="p-6 text-sm text-fg-muted">Captura precios para ver la gráfica.</Card>;
  }
  const previo = conDatos.at(-2);
  const pct = previo ? ((ultimo.t - previo.t) / previo.t) * 100 : null;
  const sube = (pct ?? 0) > 0;

  const { labels: chartLabels, series: chartSeries } = datosGrafica({
    meses,
    totales,
    year,
    yearB,
    productosB,
  });

  return (
    <Card className="grid gap-4 p-4 md:p-6">
      <CifraYVariacion ultimo={ultimo} previo={previo} pct={pct} sube={sube} />

      <div className="grid grid-cols-2 text-sm">
        <dl className="flex items-center gap-1">
          <dt className="text-fg-muted">Mes anterior:</dt>
          <dd className="font-semibold tabular-nums text-fg">
            {previo ? formatoMoneda(previo.t) : '—'}
          </dd>
        </dl>
        <dl className="flex items-center justify-end gap-1">
          <dt className="text-fg-muted">Productos:</dt>
          <dd className="font-semibold tabular-nums text-fg">{productos.length}</dd>
        </dl>
      </div>

      {vista === 'variacion' ? (
        <GraficaVariacion totales={totales} meses={meses} />
      ) : vista === 'trimestres' ? (
        <GraficaTrimestres
          productos={productos}
          meses={meses}
          year={year}
          yearB={yearB}
          productosB={productosB}
        />
      ) : (
        <CostoChart labels={chartLabels} series={chartSeries} />
      )}

      {acciones ? (
        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
          {acciones}
        </div>
      ) : null}
    </Card>
  );
}

function CifraYVariacion({
  ultimo,
  previo,
  pct,
  sube,
}: {
  ultimo: { m: Mes; t: number };
  previo: { m: Mes; t: number } | undefined;
  pct: number | null;
  sube: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShoppingBasket className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <h5 className="font-display text-2xl font-extrabold tabular-nums text-fg">
            {formatoMoneda(ultimo.t)}
          </h5>
          <p className="text-sm text-fg-muted">Costo de la canasta · {mesLabel(ultimo.m)}</p>
        </div>
      </div>
      {pct != null && previo ? (
        <div className="grid shrink-0 justify-items-end gap-1">
          <span
            className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary-strong"
            title={`Variación de ${mesLabel(ultimo.m)} vs ${mesLabel(previo.m)}`}
          >
            {sube ? (
              <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {sube ? '+' : ''}
            {pct.toFixed(1)}%
          </span>
          <span className="text-2xs text-fg-subtle">vs {mesLabel(previo.m)}</span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Barras con el costo PROMEDIO de la canasta por trimestre (misma regla que la
 * fila trimestral de la tabla: promedia los totales mensuales). Con más de un
 * trimestre activo el modelo agrega la columna "PROMEDIO ANUAL"; al comparar
 * años, el año B entra como segunda serie (ocre), igual que en la vista mensual.
 */
function GraficaTrimestres({
  productos,
  meses,
  year,
  yearB,
  productosB,
}: {
  productos: Producto[];
  meses: Mes[];
  year: string;
  yearB: string | null;
  productosB: Producto[] | null;
}) {
  const trimestres = trimestresActivos(meses);
  const data = promediosTrimestralesCanasta(productos, trimestres, meses);
  if (!trimestres.length || data.every((v) => v == null)) {
    return (
      <p className="p-6 text-center text-sm text-fg-muted">
        Aún no hay precios capturados para armar los trimestres.
      </p>
    );
  }
  const series: SerieCosto[] = [{ name: year, data }];
  if (yearB != null && productosB != null) {
    series.push({ name: yearB, data: promediosTrimestralesCanasta(productosB, trimestres, meses) });
  }
  return <CostoChart labels={trimestres.map((q) => q.label)} series={series} />;
}

function GraficaVariacion({ totales, meses }: { totales: (number | null)[]; meses: Mes[] }) {
  const datos = variaciones(totales, meses);
  if (!datos.length) {
    return (
      <p className="p-6 text-center text-sm text-fg-muted">
        Aún no hay meses comparables para calcular la variación.
      </p>
    );
  }
  return <VariacionChart datos={datos} />;
}
