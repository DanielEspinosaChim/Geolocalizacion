import { calcularMetricas } from '../model/filtros';
import type { Candidato } from '../model/candidato';

const numero = (n: number) => n.toLocaleString('es-MX');

function Stat({ label, value, tone = '' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-control border border-border bg-surface-raised px-2.5 py-2">
      <div className="text-[10px] font-bold uppercase tracking-wider text-fg-subtle">{label}</div>
      <div className={`text-base font-extrabold tabular-nums ${tone}`}>{value}</div>
    </div>
  );
}

/** Métricas del conjunto visible (paridad con _renderMetricasLocales). */
export function MetricasPanel({ data }: { data: Candidato[] }) {
  if (data.length === 0) return null;
  const m = calcularMetricas(data);
  return (
    <div className="grid gap-2 border-b border-border p-3">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Total" value={numero(m.total)} />
        <Stat label="Sin reg." value={`${m.pctInformales}%`} tone="text-warning" />
        <Stat label="Formales" value={numero(m.formales)} tone="text-success" />
        <Stat label="En proceso" value={numero(m.enProceso)} tone="text-warning" />
        <Stat label="Informales" value={numero(m.informales)} tone="text-danger" />
      </div>
      {m.topGiros.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {m.topGiros.map(([giro, n]) => (
            <span key={giro} className="rounded-full border border-border bg-surface-raised px-2 py-0.5 text-[11px] text-fg-muted">
              {giro} <b className="text-fg">{numero(n)}</b>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
