import { formatNumero } from '@shared/lib/format';
import type { Metricas } from '../model/filtros';

type Tono = 'neutral' | 'success' | 'warning' | 'danger';

/** El tono tiñe el número y, sutilmente, el borde: el color es el dato. */
const TONO: Record<Tono, { valor: string; borde: string }> = {
  neutral: { valor: 'text-fg', borde: 'border-border' },
  success: { valor: 'text-success', borde: 'border-success/30' },
  warning: { valor: 'text-warning', borde: 'border-warning/30' },
  danger: { valor: 'text-danger', borde: 'border-danger/30' },
};

function Stat({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: Tono }) {
  const t = TONO[tone];
  return (
    <div className={`grid gap-0.5 rounded-control border bg-bg px-3 py-2.5 text-center ${t.borde}`}>
      <div className="text-2xs font-bold uppercase tracking-wider text-fg-subtle">{label}</div>
      <div className={`font-display text-xl font-extrabold tabular-nums ${t.valor}`}>{value}</div>
    </div>
  );
}

/**
 * Resumen del conjunto visible (paridad con _renderMetricasLocales).
 * Recibe las métricas ya calculadas: el panel las comparte con TiposNegocio
 * para no recorrer los ~6.000 candidatos dos veces por render.
 */
export function MetricasPanel({ metricas: m }: { metricas: Metricas }) {
  if (m.total === 0) {
    return <p className="text-2xs text-fg-subtle">Sin candidatos con estos filtros.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      <Stat label="Total" value={formatNumero(m.total)} />
      <Stat label="Sin reg." value={`${m.pctInformales}%`} tone="warning" />
      <Stat label="Formales" value={formatNumero(m.formales)} tone="success" />
      <Stat label="En proceso" value={formatNumero(m.enProceso)} tone="warning" />
      <Stat label="Informales" value={formatNumero(m.informales)} tone="danger" />
    </div>
  );
}

/** Top de giros entre los candidatos no formales del conjunto visible. */
export function TiposNegocio({ metricas: m }: { metricas: Metricas }) {
  if (m.topGiros.length === 0) {
    return <p className="text-2xs text-fg-subtle">Sin giros que mostrar.</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {m.topGiros.map(([giro, n]) => (
        <span
          key={giro}
          className="rounded-full border border-border bg-surface-raised px-2 py-0.5 text-xs2 text-fg-muted"
        >
          {giro} <b className="text-fg">{formatNumero(n)}</b>
        </span>
      ))}
    </div>
  );
}
