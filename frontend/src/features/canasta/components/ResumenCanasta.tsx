import { ArrowDown, ArrowUp, ShoppingBasket } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card } from '@shared/ui';
import { mesLabel, totalesPorMes, type Mes, type Producto } from '../model/canasta';
import { CostoChart } from './CostoChart';

interface ResumenCanastaProps {
  productos: Producto[];
  meses: Mes[];
  /** Acciones del pie (Excel, Infografía…). */
  acciones?: ReactNode;
}

/**
 * Tarjeta de resumen del costo de la canasta: cifra del último mes, variación
 * vs el anterior y gráfica de columnas. Sigue el patrón de "stat card": la
 * variación se marca con un chip de marca (indigo), no con rojo/verde.
 */
export function ResumenCanasta({ productos, meses, acciones }: ResumenCanastaProps) {
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

  return (
    <Card className="grid gap-4 p-4 md:p-6">
      <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShoppingBasket className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <h5 className="font-display text-2xl font-extrabold tabular-nums text-fg">
              ${ultimo.t.toFixed(2)}
            </h5>
            <p className="text-sm text-fg-muted">Costo de la canasta · {mesLabel(ultimo.m)}</p>
          </div>
        </div>
        {pct != null ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary-strong">
            {sube ? (
              <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {sube ? '+' : ''}
            {pct.toFixed(1)}%
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-2 text-sm">
        <dl className="flex items-center gap-1">
          <dt className="text-fg-muted">Mes anterior:</dt>
          <dd className="font-semibold tabular-nums text-fg">
            {previo ? `$${previo.t.toFixed(2)}` : '—'}
          </dd>
        </dl>
        <dl className="flex items-center justify-end gap-1">
          <dt className="text-fg-muted">Productos:</dt>
          <dd className="font-semibold tabular-nums text-fg">{productos.length}</dd>
        </dl>
      </div>

      <CostoChart labels={conDatos.map((x) => mesLabel(x.m))} valores={conDatos.map((x) => x.t)} />

      {acciones ? (
        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
          {acciones}
        </div>
      ) : null}
    </Card>
  );
}
