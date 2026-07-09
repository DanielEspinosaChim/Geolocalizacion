import { Car, Route } from 'lucide-react';
import { useState } from 'react';
import { Button, MapCanvas, PanelSection, SearchInput, TextField, toast } from '@shared/ui';
import { useCandidatos } from '@features/candidatos';
import { ColoniaSelect } from '@features/colonias-zonas';
import { useCalcularRuta, useCalcularRutaColonia } from '../api/useRuta';
import { RutaInfo } from '../components/RutaInfo';
import { RutaLayer } from '../components/RutaLayer';
import { RutaLista } from '../components/RutaLista';
import { MAX_PUNTOS_RUTA, togglePunto } from '../model/ruta';

export function RutasPage() {
  const { data: candidatos = [] } = useCandidatos();
  const [q, setQ] = useState('');
  const [seleccion, setSeleccion] = useState<ReadonlySet<string>>(new Set());
  const calcular = useCalcularRuta();
  const calcularColonia = useCalcularRutaColonia();
  const ruta = calcularColonia.data ?? calcular.data;
  const calculando = calcular.isPending || calcularColonia.isPending;

  function toggle(placeId: string) {
    const nueva = togglePunto(seleccion, placeId);
    if (nueva.size === seleccion.size && !seleccion.has(placeId)) {
      toast.error(`Máximo ${MAX_PUNTOS_RUTA} puntos por ruta`);
      return;
    }
    setSeleccion(nueva);
  }

  function calcularManual() {
    if (seleccion.size < 2) {
      toast.error('Selecciona al menos 2 puntos.');
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

        <PanelSection
          title="Selección manual"
          action={
            <span className="flex items-center gap-2">
              <span className="text-2xs tabular-nums text-fg-muted">
                {seleccion.size} seleccionados
              </span>
              <Button variant="ghost" size="sm" onClick={() => setSeleccion(new Set())}>
                Limpiar
              </Button>
            </span>
          }
        >
          <Button full loading={calculando} onClick={calcularManual}>
            {calculando ? null : <Route className="h-4 w-4" aria-hidden="true" />} Calcular mejor
            ruta
          </Button>
          <p className="text-2xs text-fg-subtle">
            Máx. {MAX_PUNTOS_RUTA} puntos · TSP + OSRM · en auto
          </p>
        </PanelSection>

        {ruta ? <RutaInfo ruta={ruta} /> : null}

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="sticky top-0 z-panel border-b border-border bg-surface p-3">
            <SearchInput
              value={q}
              onChange={setQ}
              debounceMs={200}
              placeholder="Buscar candidato por nombre…"
              aria-label="Buscar negocio para la ruta"
            />
          </div>
          <RutaLista candidatos={candidatos} q={q} seleccion={seleccion} onToggle={toggle} />
        </div>
      </aside>

      <div className="relative hidden flex-1 md:block">
        <MapCanvas>{ruta ? <RutaLayer ruta={ruta} /> : null}</MapCanvas>
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

  function generar() {
    if (!colonia) {
      toast.error('Selecciona una colonia.');
      return;
    }
    const n = Number(limite);
    if (!Number.isInteger(n) || n < 2 || n > 50) {
      toast.error('El límite debe ser un número entre 2 y 50.');
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
            min={2}
            max={50}
            value={limite}
            onChange={(e) => setLimite(e.target.value)}
            className="px-2 text-center"
          />
        </div>
      </div>
      <Button full variant="secondary" loading={calculando} onClick={generar}>
        {calculando ? null : <Car className="h-4 w-4" aria-hidden="true" />} Generar ruta de colonia
      </Button>
    </PanelSection>
  );
}
