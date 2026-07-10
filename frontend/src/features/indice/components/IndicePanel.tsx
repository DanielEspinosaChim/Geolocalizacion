import { BarChart3 } from 'lucide-react';
import { formatNumero } from '@shared/lib/format';
import { Card, PageHeader, QueryBoundary, Spinner } from '@shared/ui';
import { useIndice } from '../api/useIndice';
import { ESCENARIO_COLORS, type Indice } from '../model/indice';
import { IndiceCalculadora } from './IndiceCalculadora';
import { ComoSeEstima, ConjuntosDeDatos } from './IndiceMetodologia';

/** Vista del índice de informalidad (estimador de razón / multiplier method). */
export function IndicePanel() {
  const query = useIndice();
  return (
    <QueryBoundary
      query={query}
      loading={
        <div className="flex justify-center p-6">
          <Spinner label="Cargando índice…" />
        </div>
      }
    >
      {(data) => (
        <div className="grid gap-6">
          <Encabezado indice={data} />
          <ConjuntosDeDatos indice={data} />
          <ComoSeEstima indice={data} />
          <Resultado indice={data} />
          <ValidacionInegi indice={data} />
          <Sensibilidad indice={data} />
          <Referencias indice={data} />
          <IndiceCalculadora indice={data} />
        </div>
      )}
    </QueryBoundary>
  );
}

function Encabezado({ indice }: { indice: Indice }) {
  return (
    <PageHeader
      eyebrow={`Metodología · ${indice.metodo}`}
      title="Índice de Informalidad"
      description="Mérida, Yucatán · Estimación estadística basada en dos registros con solapamiento conocido"
    />
  );
}

function Resultado({ indice }: { indice: Indice }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card raised className="grid gap-1.5 p-6 text-center">
        <div className="text-2xs font-bold uppercase tracking-widest text-primary">
          Estimación central (α=0.65)
        </div>
        <div className="font-display text-5xl font-extrabold text-danger">
          {indice.central_indice_pct}%
        </div>
        <div className="text-2xs text-fg-subtle">negocios son informales</div>
      </Card>
      <Card raised className="grid gap-1.5 p-6 text-center">
        <div className="text-2xs font-bold uppercase tracking-widest text-primary">
          IC 95% · Límite inferior
        </div>
        <div className="font-display text-4xl font-extrabold text-fg-muted">
          {indice.ic95_indice_inferior.low}–{indice.ic95_indice_inferior.high}%
        </div>
        <div className="text-2xs text-fg-subtle">intervalo de confianza (método delta)</div>
      </Card>
    </div>
  );
}

function ValidacionInegi({ indice }: { indice: Indice }) {
  if (!indice.referencia_inegi) return null;
  const bajo = indice.escenarios[0]?.indice_pct;
  const alto = indice.escenarios.at(-1)?.indice_pct;
  return (
    <Card raised className="flex items-center gap-5 p-6">
      <BarChart3 className="h-8 w-8 shrink-0 text-primary" aria-hidden="true" />
      <div className="grid gap-1">
        <div className="text-2xs font-bold uppercase tracking-widest text-warning">
          Validación externa · INEGI 2023
        </div>
        <p className="text-sm text-fg">
          {indice.referencia_inegi}
          {bajo != null && alto != null
            ? ` — nuestro rango ${bajo}%–${alto}% es consistente con la literatura nacional.`
            : null}
        </p>
        <p className="text-2xs text-fg-subtle">
          Nota: el INEGI mide informalidad laboral (personas); nosotros medimos establecimientos. La
          coherencia entre ambos valida el método.
        </p>
      </div>
    </Card>
  );
}

function Sensibilidad({ indice }: { indice: Indice }) {
  return (
    <Card raised className="grid gap-3 p-6">
      <div>
        <h2 className="text-2xs font-bold uppercase tracking-widest text-primary">
          Análisis de sensibilidad · Sesgo α
        </h2>
        <p className="mt-1 text-2xs leading-relaxed text-fg-subtle">
          Un negocio informal es menos visible en Google Maps: no pide reseñas, no sube fotos. α
          captura esa brecha. α=1.0 asume igual visibilidad (optimista); α=0.65 es el valor central
          de la literatura.
        </p>
      </div>
      <div className="grid gap-2">
        {indice.escenarios.map((e, i) => (
          <Escenario key={e.etiqueta} escenario={e} color={ESCENARIO_COLORS[i] ?? '#94a3b8'} />
        ))}
      </div>
    </Card>
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
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-bold" style={{ color }}>
          {escenario.etiqueta}{' '}
          <span className="font-normal text-fg-subtle">α = {escenario.alpha.toFixed(2)}</span>
        </span>
        <span className="text-sm font-extrabold tabular-nums" style={{ color }}>
          {escenario.indice_pct}%{' '}
          <span className="text-2xs font-normal text-fg-subtle">
            {formatNumero(escenario.N_inf_estimado)} inf. est.
          </span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-bg">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(100, escenario.indice_pct * 1.2)}%`, background: color }}
        />
      </div>
    </div>
  );
}

function Referencias({ indice }: { indice: Indice }) {
  if (!indice.referencias.length) return null;
  return (
    <Card raised className="grid gap-2 p-6">
      <h2 className="text-2xs font-bold uppercase tracking-widest text-fg-subtle">
        Referencias metodológicas
      </h2>
      <ul className="grid gap-1 text-2xs leading-relaxed text-fg-muted">
        {indice.referencias.map((ref) => (
          <li key={ref}>· {ref}</li>
        ))}
      </ul>
    </Card>
  );
}
