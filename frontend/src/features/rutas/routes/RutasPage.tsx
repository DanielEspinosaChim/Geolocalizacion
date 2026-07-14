import { Car, Route } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { formatNumero } from '@shared/lib/format';
import { Button, MapCanvas, PanelSection, SearchInput, TextField, toast } from '@shared/ui';
import { CapaCandidatos, Simbologia, useCandidatos, type Candidato } from '@features/candidatos';
import {
  CapasLayers,
  CapasToggles,
  ColoniaSelect,
  useCapas,
  useColonias,
} from '@features/colonias-zonas';
import { useCalcularRuta, useCalcularRutaColonia } from '../api/useRuta';
import { RutaInfo } from '../components/RutaInfo';
import { RutaLayer } from '../components/RutaLayer';
import { RutaLista } from '../components/RutaLista';
import { MAX_PUNTOS_RUTA, MIN_PARADAS_RUTA as MIN_PARADAS, togglePunto } from '../model/ruta';

export function RutasPage() {
  // "Ver ruta" en una campaña navega aquí con los negocios en el state.
  const location = useLocation();
  const rutaCampana = (location.state as { rutaCampana?: string[] } | null)?.rutaCampana;

  const { data: candidatos = [] } = useCandidatos();
  const [q, setQ] = useState('');
  const [seleccion, setSeleccion] = useState<ReadonlySet<string>>(() => new Set(rutaCampana ?? []));
  const calcular = useCalcularRuta();
  const calcularColonia = useCalcularRutaColonia();
  const capas = useCapas();
  const ruta = calcularColonia.data ?? calcular.data;
  const calculando = calcular.isPending || calcularColonia.isPending;

  // Al llegar desde una campaña, traza su ruta de una vez. La ref evita
  // recalcular en cada render mientras el state de navegación siga presente.
  const yaTrazada = useRef(false);
  useEffect(() => {
    if (rutaCampana && rutaCampana.length >= MIN_PARADAS && !yaTrazada.current) {
      yaTrazada.current = true;
      calcular.mutate(rutaCampana);
    }
  }, [rutaCampana, calcular]);

  function toggle(placeId: string) {
    const nueva = togglePunto(seleccion, placeId);
    if (nueva.size === seleccion.size && !seleccion.has(placeId)) {
      toast.error(`Máximo ${MAX_PUNTOS_RUTA} puntos por ruta`);
      return;
    }
    setSeleccion(nueva);
  }

  function calcularManual() {
    if (seleccion.size < MIN_PARADAS) {
      toast.error(`Selecciona al menos ${MIN_PARADAS} puntos.`);
      return;
    }
    calcular.mutate([...seleccion]);
  }

  return (
    <div className="flex h-full">
      <aside className="scrollbar-slim flex w-full flex-col overflow-y-auto border-r border-border bg-surface md:w-96">
        <RutaPorColonia
          calculando={calculando}
          onCalcular={(colonia, limite) => calcularColonia.mutate({ colonia, limite })}
        />

        <SeleccionManual
          total={seleccion.size}
          calculando={calculando}
          onLimpiar={() => setSeleccion(new Set())}
          onCalcular={calcularManual}
        />

        {ruta ? <RutaInfo ruta={ruta} /> : null}

        <BuscadorNegocios
          total={candidatos.length}
          q={q}
          onQ={setQ}
          candidatos={candidatos}
          seleccion={seleccion}
          onToggle={toggle}
        />
      </aside>

      <div className="relative hidden flex-1 md:block">
        <MapCanvas zoomPosition="bottomright">
          <CapaCandidatos candidatos={candidatos} />
          {ruta ? <RutaLayer ruta={ruta} /> : null}
          <CapasLayers activas={capas.activas} />
        </MapCanvas>

        {/* Overlays consistentes en todas las vistas del mapa: capas
            arriba-derecha, simbología abajo-izquierda. */}
        <div className="absolute right-3 top-3 z-panel">
          <CapasToggles activas={capas.activas} onToggle={capas.alternar} />
        </div>
        <Simbologia capas={capas.activas} />
      </div>
    </div>
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
      <Button
        full
        variant="secondary"
        loading={calculando}
        disabled={insuficiente}
        onClick={generar}
      >
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
      <p className="text-2xs text-fg-subtle">
        Máx. {MAX_PUNTOS_RUTA} puntos · TSP + OSRM · en auto
      </p>
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
