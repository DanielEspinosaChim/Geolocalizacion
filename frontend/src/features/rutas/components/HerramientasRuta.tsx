import { Car, Route } from 'lucide-react';
import { useState } from 'react';
import { formatNumero } from '@shared/lib/format';
import { Button, PanelSection, SearchInput, TextField, toast } from '@shared/ui';
import { ColoniaSelect, useColonias } from '@features/colonias-zonas';
import type { Candidato } from '@features/candidatos';
import { MAX_PUNTOS_RUTA, MIN_PARADAS_RUTA as MIN_PARADAS } from '../model/ruta';
import type { RutaCalculada } from '../model/ruta';
import { RutaInfo } from './RutaInfo';
import { RutaLista } from './RutaLista';

interface HerramientasRutaProps {
  candidatos: Candidato[];
  calculando: boolean;
  ruta: RutaCalculada | undefined;
  seleccion: ReadonlySet<string>;
  q: string;
  onQ: (q: string) => void;
  onCalcularColonia: (colonia: string, limite: number) => void;
  onLimpiar: () => void;
  onCalcularManual: () => void;
  onToggle: (placeId: string) => void;
}

/**
 * Panel de herramientas de la vista de rutas. Se reutiliza tal cual en el
 * sidebar de escritorio y dentro del BottomSheet móvil (misma composición).
 */
export function HerramientasRuta({
  candidatos,
  calculando,
  ruta,
  seleccion,
  q,
  onQ,
  onCalcularColonia,
  onLimpiar,
  onCalcularManual,
  onToggle,
}: HerramientasRutaProps) {
  return (
    <>
      <RutaPorColonia calculando={calculando} onCalcular={onCalcularColonia} />
      <SeleccionManual
        total={seleccion.size}
        calculando={calculando}
        onLimpiar={onLimpiar}
        onCalcular={onCalcularManual}
      />
      {ruta ? <RutaInfo ruta={ruta} /> : null}
      <BuscadorNegocios
        total={candidatos.length}
        q={q}
        onQ={onQ}
        candidatos={candidatos}
        seleccion={seleccion}
        onToggle={onToggle}
      />
    </>
  );
}

/** Ruta automática con todos los informales de una colonia, hasta `limite` paradas. */
function RutaPorColonia({
  calculando,
  onCalcular,
}: {
  calculando: boolean;
  onCalcular: (colonia: string, limite: number) => void;
}) {
  const [colonia, setColonia] = useState<string | null>(null);
  const [limite, setLimite] = useState('20');
  const { data: colonias = [] } = useColonias();

  // Una ruta necesita al menos dos paradas. 271 de las 722 colonias tienen un
  // solo informal: avisar antes es mejor que dejar que el backend responda 400.
  const informales = colonias.find((c) => c.id === colonia)?.count ?? 0;
  const insuficiente = colonia !== null && informales < MIN_PARADAS;

  function generar() {
    if (!colonia) {
      toast.error('Selecciona una colonia.');
      return;
    }
    const n = Number(limite);
    if (!Number.isInteger(n) || n < MIN_PARADAS || n > 50) {
      toast.error(`El límite debe ser un número entre ${MIN_PARADAS} y 50.`);
      return;
    }
    onCalcular(colonia, n);
  }

  return (
    <PanelSection title="Ruta por colonia">
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <ColoniaSelect value={colonia} onChange={setColonia} label="Colonia" />
        </div>
        <div className="w-20 shrink-0">
          <TextField
            label="Límite"
            type="number"
            min={MIN_PARADAS}
            max={50}
            value={limite}
            onChange={(e) => setLimite(e.target.value)}
            className="px-2 text-center"
          />
        </div>
      </div>
      {insuficiente ? (
        <p className="text-2xs text-warning">
          {informales === 0
            ? 'Esta colonia no tiene negocios informales.'
            : 'Solo hay 1 negocio informal aquí; una ruta necesita al menos 2.'}
        </p>
      ) : null}
      <Button full variant="secondary" loading={calculando} disabled={insuficiente} onClick={generar}>
        {calculando ? null : <Car className="h-4 w-4" aria-hidden="true" />} Generar ruta de colonia
      </Button>
    </PanelSection>
  );
}

/** Cabecera de la selección a mano: contador, limpiar y cálculo de la ruta. */
function SeleccionManual({
  total,
  calculando,
  onLimpiar,
  onCalcular,
}: {
  total: number;
  calculando: boolean;
  onLimpiar: () => void;
  onCalcular: () => void;
}) {
  return (
    <PanelSection
      title="Selección manual"
      action={
        <span className="flex items-center gap-2">
          <span className="text-2xs tabular-nums text-fg-muted">{total} seleccionados</span>
          <Button variant="ghost" size="sm" onClick={onLimpiar}>
            Limpiar
          </Button>
        </span>
      }
    >
      <Button full loading={calculando} onClick={onCalcular}>
        {calculando ? null : <Route className="h-4 w-4" aria-hidden="true" />} Calcular mejor ruta
      </Button>
      <p className="text-2xs text-fg-subtle">Máx. {MAX_PUNTOS_RUTA} puntos · TSP + OSRM · en auto</p>
    </PanelSection>
  );
}

/** Buscador + lista seleccionable. La lista no scrollea aparte: lo hace el panel. */
function BuscadorNegocios({
  total,
  q,
  onQ,
  candidatos,
  seleccion,
  onToggle,
}: {
  total: number;
  q: string;
  onQ: (q: string) => void;
  candidatos: Candidato[];
  seleccion: ReadonlySet<string>;
  onToggle: (placeId: string) => void;
}) {
  return (
    <PanelSection
      title="Buscar negocio"
      collapsible
      action={<span className="text-2xs tabular-nums text-fg-subtle">{formatNumero(total)}</span>}
      sticky={
        <SearchInput
          value={q}
          onChange={onQ}
          debounceMs={200}
          placeholder="Buscar candidato por nombre…"
          aria-label="Buscar negocio para la ruta"
        />
      }
    >
      <RutaLista
        className="-mx-3 -mb-3"
        candidatos={candidatos}
        q={q}
        seleccion={seleccion}
        onToggle={onToggle}
      />
    </PanelSection>
  );
}
