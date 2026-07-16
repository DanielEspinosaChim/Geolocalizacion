import { ArrowDown, ArrowUp, BarChart3 } from 'lucide-react';
import { useMemo } from 'react';
import { formatNumero } from '@shared/lib/format';
import { Card } from '@shared/ui';
import { tipoDe, useCandidatos } from '@features/candidatos';
import { recalcularIndice, type EscenarioVivo, type Indice } from '../model/indice';

/**
 * "Estimación viva": recalcula el multiplier method con los negocios que el
 * equipo ya marcó como formales o en proceso en el mapa (Firestore). El
 * Chapman no se mueve — solo depende de Google Maps y OSM, no de las
 * validaciones manuales — así que se muestra como ancla fija de referencia.
 *
 * Un solo color de marca para todo (sin rainbow): el Chapman se distingue por
 * ser más tenue (fijo, no reacciona a los datos de campo), no por un tono
 * distinto.
 */
export function IndiceCalculadora({ indice }: { indice: Indice }) {
  const { data: candidatos = [] } = useCandidatos();

  const { formales, enProceso } = useMemo(() => {
    let formales = 0;
    let enProceso = 0;
    for (const c of candidatos) {
      const t = tipoDe(c);
      if (t === 'formal') formales++;
      else if (t === 'en_proceso') enProceso++;
    }
    return { formales, enProceso };
  }, [candidatos]);

  const r = useMemo(
    () => recalcularIndice(indice, formales, enProceso),
    [indice, formales, enProceso],
  );

  return (
    <Card raised className="grid gap-5 p-6">
      <header className="grid gap-1">
        <h2 className="flex items-center gap-2 text-2xs font-bold uppercase tracking-widest text-primary">
          <BarChart3 className="h-4 w-4" aria-hidden="true" /> Estimación viva · validaciones de campo
        </h2>
        <p className="text-xs leading-relaxed text-fg-muted">
          Se recalcula con los candidatos marcados en el mapa (Firestore). El{' '}
          <b className="text-fg">Chapman no cambia</b> — solo depende de Google Maps y OSM, no de las
          validaciones manuales.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Conteo label="Informales obs." valor={r.ninfObs} nota="Firestore" />
        <Conteo label="Confirmados formales" valor={formales} nota="validados campo" />
        <Conteo label="En proceso" valor={enProceso} nota="pendientes" />
      </div>

      <div className="grid gap-2.5">
        <FilaEscenario
          etiqueta="Chapman · Captura-Recaptura"
          detalle="Fijo — no usa validaciones de campo (solo GMaps/OSM)"
          pct={r.chapmanPct}
          notaDerecha="ancla · sin supuestos"
          fijo
        />
        <FilaEscenario
          etiqueta={
            <>
              Multiplicador · α = 0.65 <span className="font-normal text-fg-subtle">(central)</span>
            </>
          }
          detalle={`${formatNumero(r.ninfObs)} inf. obs. × factor → ${formatNumero(r.central.nInfEstimado)} est.`}
          escenario={r.central}
        />
        <FilaEscenario
          etiqueta={
            <>
              Multiplicador · α = 0.40{' '}
              <span className="font-normal text-fg-subtle">(límite superior)</span>
            </>
          }
          detalle={`${formatNumero(r.ninfObs)} inf. obs. × factor → ${formatNumero(r.limiteSuperior.nInfEstimado)} est.`}
          escenario={r.limiteSuperior}
        />
      </div>

      {formales === 0 && enProceso === 0 ? (
        <p className="rounded-card border border-dashed border-border p-3 text-center text-xs text-fg-muted">
          Marca candidatos en el mapa para ver cómo cambian los escenarios con tus validaciones reales.
        </p>
      ) : null}
    </Card>
  );
}

function Conteo({ label, valor, nota }: { label: string; valor: number; nota: string }) {
  return (
    <Card className="grid gap-0.5 p-3 text-center">
      <div className="text-xs2 font-bold uppercase tracking-wide text-fg-muted">{label}</div>
      <div className="font-display text-xl font-extrabold tabular-nums text-fg">
        {formatNumero(valor)}
      </div>
      <div className="text-xs text-fg-muted">{nota}</div>
    </Card>
  );
}

function FilaEscenario({
  etiqueta,
  detalle,
  pct,
  notaDerecha,
  fijo = false,
  escenario,
}: {
  etiqueta: React.ReactNode;
  detalle: string;
  /** Escenario fijo (Chapman): pasa el % directo, sin base ni delta. */
  pct?: number;
  notaDerecha?: string;
  fijo?: boolean;
  /** Escenario en vivo: trae % + base + delta. */
  escenario?: EscenarioVivo;
}) {
  const valorPct = fijo ? (pct ?? 0) : (escenario?.indicePct ?? 0);
  const barra = fijo ? 'bg-fg-subtle/40' : 'bg-primary';

  return (
    <div
      className={`grid grid-cols-[1fr_auto] items-center gap-4 rounded-card border p-4 ${
        fijo ? 'border-border bg-bg' : 'border-primary/20 bg-bg'
      }`}
    >
      <div className="grid gap-1.5">
        <span className="text-xs font-bold text-fg">{etiqueta}</span>
        <span className="text-xs text-fg-muted">{detalle}</span>
        {escenario ? <DeltaChip deltaPp={escenario.deltaPp} /> : null}
        <div className="h-2 overflow-hidden rounded-full bg-border">
          <div className={`h-full rounded-full ${barra}`} style={{ width: `${Math.min(100, valorPct * 1.2)}%` }} />
        </div>
      </div>
      <div className="text-right">
        <div className="font-display text-2xl font-extrabold tabular-nums text-fg">{valorPct}%</div>
        <div className="text-xs text-fg-muted">
          {fijo ? notaDerecha : `base: ${escenario?.basePct}%`}
        </div>
      </div>
    </div>
  );
}

function DeltaChip({ deltaPp }: { deltaPp: number }) {
  const sube = deltaPp > 0;
  return (
    <span className="inline-flex w-fit items-center gap-1 text-2xs font-bold text-primary-strong">
      {sube ? (
        <ArrowUp className="h-3 w-3" aria-hidden="true" />
      ) : (
        <ArrowDown className="h-3 w-3" aria-hidden="true" />
      )}
      {sube ? '+' : ''}
      {deltaPp}pp vs base
    </span>
  );
}
