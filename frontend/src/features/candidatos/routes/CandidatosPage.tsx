import { useMemo, useState } from 'react';
import { MapCanvas, Spinner } from '@shared/ui';
import { useCandidatos } from '../api/useCandidatos';
import { useCargaProgresiva } from '../api/useCargaProgresiva';
import { CandidatoCard } from '../components/CandidatoCard';
import { CandidatosList } from '../components/CandidatosList';
import { ClusterLayer } from '../components/ClusterLayer';
import { FiltrosBar } from '../components/FiltrosBar';
import { FlyTo } from '../components/FlyTo';
import { MetricasPanel } from '../components/MetricasPanel';
import type { Candidato } from '../model/candidato';
import { filtrarCandidatos, SIN_FILTROS, type Filtros } from '../model/filtros';
import { EstadoCargaChip } from '../components/EstadoCargaChip';

export function CandidatosPage() {
  const { data: candidatos = [], isPending } = useCandidatos();
  const estado = useCargaProgresiva();
  const [filtros, setFiltros] = useState<Filtros>(SIN_FILTROS);
  const [vista, setVista] = useState<'lista' | 'mapa'>('mapa');
  const [seleccionado, setSeleccionado] = useState<Candidato | null>(null);

  const filtrados = useMemo(() => filtrarCandidatos(candidatos, filtros), [candidatos, filtros]);

  return (
    <div className="flex h-full flex-col">
      <VistaMovilToggle vista={vista} onChange={setVista} />
      <div className="flex min-h-0 flex-1">
        <aside
          className={`w-full flex-col border-r border-border bg-surface md:flex md:w-96 ${
            vista === 'lista' ? 'flex' : 'hidden'
          }`}
        >
          <FiltrosBar filtros={filtros} onChange={setFiltros} />
          <MetricasPanel data={filtrados} />
          {isPending ? (
            <div className="flex flex-1 items-center justify-center">
              <Spinner label="Cargando candidatos…" />
            </div>
          ) : (
            <CandidatosList
              data={filtrados}
              selectedId={seleccionado?.place_id ?? null}
              onSelect={setSeleccionado}
            />
          )}
        </aside>
        <div className={`relative flex-1 md:block ${vista === 'mapa' ? 'block' : 'hidden'}`}>
          <MapCanvas>
            <ClusterLayer candidatos={filtrados} onSelect={setSeleccionado} />
            {seleccionado?.lat != null && seleccionado.lng != null ? (
              <FlyTo lat={seleccionado.lat} lng={seleccionado.lng} />
            ) : null}
          </MapCanvas>
          <EstadoCargaChip cargados={candidatos.length} estado={estado} />
          {seleccionado ? (
            <div className="absolute bottom-4 left-4 z-[1000]">
              <CandidatoCard
                key={seleccionado.place_id}
                candidato={seleccionado}
                onClose={() => setSeleccionado(null)}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function VistaMovilToggle({
  vista,
  onChange,
}: {
  vista: 'lista' | 'mapa';
  onChange: (v: 'lista' | 'mapa') => void;
}) {
  return (
    <div className="flex gap-1 border-b border-border bg-surface p-2 md:hidden">
      {(['mapa', 'lista'] as const).map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={vista === v}
          onClick={() => onChange(v)}
          className={`flex-1 rounded-control py-1.5 text-xs font-bold capitalize transition-colors ${
            vista === v ? 'bg-primary-strong text-primary-fg' : 'text-fg-muted'
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}
