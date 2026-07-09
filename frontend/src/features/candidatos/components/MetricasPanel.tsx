import { formatNumero } from '@shared/lib/format';
import type { Metricas } from '../model/filtros';

function Stat({ label, value, tone = '' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-control border border-border bg-surface-raised px-2.5 py-2">
      <div className="text-2xs font-bold uppercase tracking-wider text-fg-subtle">{label}</div>
      <div className={`text-base font-extrabold tabular-nums ${tone}`}>{value}</div>
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
    <div className="grid grid-cols-3 gap-2">
      <Stat label="Total" value={formatNumero(m.total)} />
      <Stat label="Sin reg." value={`${m.pctInformales}%`} tone="text-warning" />
      <Stat label="Formales" value={formatNumero(m.formales)} tone="text-success" />
      <Stat label="En proceso" value={formatNumero(m.enProceso)} tone="text-warning" />
      <Stat label="Informales" value={formatNumero(m.informales)} tone="text-danger" />
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
