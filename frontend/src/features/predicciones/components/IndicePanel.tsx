import { Spinner } from '@shared/ui';
import { useIndice } from '../api/usePredicciones';
import { ESCENARIO_COLORS, type Indice } from '../model/indice';

const fmt = (n: number) => n.toLocaleString('es-MX');

/** Panel del índice de informalidad (estimador de razón / multiplier method). */
export function IndicePanel() {
  const { data, isPending } = useIndice();
  if (isPending || !data) {
    return (
      <div className="flex justify-center p-6">
        <Spinner label="Cargando índice…" />
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <ResumenIndice indice={data} />
      <div className="grid gap-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-fg-subtle">Escenarios</h3>
        {data.escenarios.map((e, i) => (
          <Escenario key={e.etiqueta} escenario={e} color={ESCENARIO_COLORS[i] ?? '#94a3b8'} />
        ))}
      </div>
      <Metodo indice={data} />
    </div>
  );
}

function ResumenIndice({ indice }: { indice: Indice }) {
  const stats = [
    ['Índice central', `${indice.central_indice_pct}%`],
    ['IC 95%', `${indice.ic95_indice_inferior.low}–${indice.ic95_indice_inferior.high}%`],
    ['Cobertura Google', `${indice.cobertura_gmaps_pct}%`],
    ['Multiplicador', `×${indice.multiplicador}`],
  ] as const;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {stats.map(([label, valor]) => (
        <div key={label} className="rounded-card border border-border bg-surface-raised p-3 text-center">
          <div className="text-[10px] uppercase tracking-wide text-fg-subtle">{label}</div>
          <div className="text-lg font-extrabold tabular-nums text-primary">{valor}</div>
        </div>
      ))}
    </div>
  );
}

function Escenario({
  escenario,
  color,
}: {
  escenario: Indice['escenarios'][number];
  color: string;
}) {
  return (
    <div className="rounded-card border border-border bg-surface-raised p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold" style={{ color }}>
          {escenario.etiqueta} <span className="font-normal text-fg-subtle">α = {escenario.alpha.toFixed(2)}</span>
        </span>
        <span className="text-sm font-extrabold" style={{ color }}>
          {escenario.indice_pct}%{' '}
          <span className="text-[10px] font-normal text-fg-subtle">
            {fmt(escenario.N_inf_estimado)} inf. est.
          </span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-bg">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, escenario.indice_pct * 1.2)}%`, background: color }} />
      </div>
    </div>
  );
}

function Metodo({ indice }: { indice: Indice }) {
  return (
    <div className="grid gap-1 rounded-card border border-border bg-surface-raised p-3 text-[11px] text-fg-muted">
      <div>
        <b className="text-fg">Método:</b> {indice.metodo}
      </div>
      {indice.referencia_inegi ? <div>📊 {indice.referencia_inegi}</div> : null}
      {indice.referencias.map((ref) => (
        <div key={ref}>· {ref}</div>
      ))}
    </div>
  );
}
