import { BarChart3 } from 'lucide-react';
import { useMemo } from 'react';
import { formatNumero } from '@shared/lib/format';
import { Card } from '@shared/ui';
import { tipoDe, useCandidatos } from '@features/candidatos';
import { recalcularIndice, type Indice } from '../model/indice';

/**
 * Recalcula el índice con los negocios que el equipo ya marcó en el mapa como
 * formales o en proceso. Los conteos salen del dataset de candidatos ya cargado,
 * así que la cifra se mueve en cuanto alguien reclasifica un negocio.
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

  const signo = r.deltaPp > 0 ? '+' : '';

  return (
    <Card raised className="grid gap-4 p-6">
      <header className="grid gap-1">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
          <BarChart3 className="h-4 w-4" aria-hidden="true" /> Estimación actualizada
        </h3>
        <p className="text-2xs text-fg-subtle">
          Se recalcula automáticamente con los negocios que hayas marcado como formal o en proceso
          en el mapa.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Barra
          label="Informales obs."
          valor={formatNumero(r.ninfObs)}
          base={`base: ${formatNumero(r.ninfObsBase)}`}
          pct={pctDe(r.ninfObs, r.ninfObsBase)}
          color="bg-danger"
        />
        <Barra
          label="N inf. estimado"
          valor={formatNumero(r.ninfEstimado)}
          base={`base: ${formatNumero(r.ninfEstimadoBase)}`}
          pct={pctDe(r.ninfEstimado, r.ninfEstimadoBase)}
          color="bg-warning"
        />
        <Barra
          label="Índice"
          valor={`${r.indicePct}%`}
          base={`${signo}${r.deltaPp}pp vs base`}
          pct={pctDe(r.indicePct, r.indiceBasePct)}
          color="bg-success"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Conteo label="Formales" valor={formales} />
        <Conteo label="En proceso" valor={enProceso} />
      </div>

      <p className="text-2xs leading-relaxed text-fg-muted">
        Con <b className="text-fg">{formatNumero(formales)}</b> formales y{' '}
        <b className="text-fg">{formatNumero(enProceso)}</b> en proceso, el índice estimado es{' '}
        <b className="text-fg">{r.indicePct}%</b> ({signo}
        {r.deltaPp}pp respecto al cálculo base de {r.indiceBasePct}%).
      </p>
    </Card>
  );
}

/** Proporción del valor actual contra la línea base, acotada a [0, 100]. */
function pctDe(valor: number, base: number): number {
  if (base <= 0) return 0;
  return Math.min(100, Math.max(0, (valor / base) * 100));
}

function Barra({
  label,
  valor,
  base,
  pct,
  color,
}: {
  label: string;
  valor: string;
  base: string;
  pct: number;
  color: string;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="text-2xs uppercase tracking-wide text-fg-subtle">{label}</div>
      <div className="font-display text-2xl font-extrabold tabular-nums text-fg">{valor}</div>
      <div className="text-2xs text-fg-subtle">{base}</div>
      <div className="h-1 overflow-hidden rounded-full bg-bg">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Conteo({ label, valor }: { label: string; valor: number }) {
  return (
    <Card className="grid gap-0.5 p-3 text-center">
      <div className="text-2xs uppercase tracking-wide text-fg-subtle">{label}</div>
      <div className="font-display text-xl font-extrabold tabular-nums text-fg">
        {formatNumero(valor)}
      </div>
    </Card>
  );
}
