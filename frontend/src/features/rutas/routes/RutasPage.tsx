import { Car, Route } from 'lucide-react';
import { useState } from 'react';
import { Button, MapCanvas, SearchInput, toast } from '@shared/ui';
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

  return (
    <div className="flex h-full">
      <aside className="flex w-full flex-col border-r border-border bg-surface md:w-96">
        <RutaControles
          q={q}
          onQ={setQ}
          seleccionCount={seleccion.size}
          onLimpiar={() => setSeleccion(new Set())}
          calculando={calculando}
          onCalcular={() => {
            if (seleccion.size < 2) {
              toast.error('Selecciona al menos 2 puntos.');
              return;
            }
            calcular.mutate([...seleccion]);
          }}
          onCalcularColonia={(colonia) => calcularColonia.mutate({ colonia, limite: 20 })}
        />
        <RutaLista candidatos={candidatos} q={q} seleccion={seleccion} onToggle={toggle} />
        {ruta ? <RutaInfo ruta={ruta} /> : null}
      </aside>
      <div className="relative hidden flex-1 md:block">
        <MapCanvas>{ruta ? <RutaLayer ruta={ruta} /> : null}</MapCanvas>
      </div>
    </div>
  );
}

function RutaControles({
  q,
  onQ,
  seleccionCount,
  onLimpiar,
  calculando,
  onCalcular,
  onCalcularColonia,
}: {
  q: string;
  onQ: (q: string) => void;
  seleccionCount: number;
  onLimpiar: () => void;
  calculando: boolean;
  onCalcular: () => void;
  onCalcularColonia: (colonia: string) => void;
}) {
  const [colonia, setColonia] = useState<string | null>(null);
  return (
    <div className="grid gap-2 border-b border-border p-3">
      <SearchInput
        value={q}
        onChange={onQ}
        debounceMs={200}
        placeholder="Buscar negocio…"
        aria-label="Buscar negocio para la ruta"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-fg-muted">{seleccionCount} seleccionados</span>
        <Button variant="ghost" size="sm" onClick={onLimpiar}>
          Limpiar
        </Button>
      </div>
      <Button disabled={calculando} onClick={onCalcular}>
        <Route className="h-4 w-4" aria-hidden="true" /> {calculando ? 'Calculando…' : 'Calcular mejor ruta'}
      </Button>
      <div className="grid gap-2 rounded-control border border-border bg-surface-raised p-2">
        <ColoniaSelect value={colonia} onChange={setColonia} label="Ruta por colonia" />
        <Button
          variant="secondary"
          disabled={calculando}
          onClick={() => {
            if (!colonia) {
              toast.error('Selecciona una colonia.');
              return;
            }
            onCalcularColonia(colonia);
          }}
        >
          <Car className="h-4 w-4" aria-hidden="true" /> Generar ruta de colonia
        </Button>
      </div>
    </div>
  );
}
