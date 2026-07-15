import { formatNumero } from '@shared/lib/format';
import type { Metricas } from '../model/filtros';

/**
 * Tarjeta de métrica. El número usa el color de texto del tema (fg), no colores
 * semánticos: sobre el panel deben leerse igual en claro y oscuro; el estado
 * (formal/informal…) ya lo comunica la simbología del mapa, no la cifra.
 */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5 rounded-control border border-border bg-bg px-3 py-2.5 text-center">
      <div className="text-2xs font-bold uppercase tracking-wider text-fg-subtle">{label}</div>
      <div className="font-display text-xl font-extrabold tabular-nums text-fg">{value}</div>
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
      <Stat label="Sin reg." value={`${m.pctInformales}%`} />
      <Stat label="Formales" value={formatNumero(m.formales)} />
      <Stat label="En proceso" value={formatNumero(m.enProceso)} />
      <Stat label="Informales" value={formatNumero(m.informales)} />
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
