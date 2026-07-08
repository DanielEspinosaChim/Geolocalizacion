import { useMemo, useState } from 'react';
import { buscarColoniaMatch, useColonias, type CapaId } from '@features/colonias-zonas';
import { useCandidatos } from '../api/useCandidatos';
import { useCargaProgresiva } from '../api/useCargaProgresiva';
import { MapaCandidatos } from '../components/MapaCandidatos';
import { PanelLateral } from '../components/PanelLateral';
import type { Candidato } from '../model/candidato';
import { filtrarCandidatos, SIN_FILTROS, type Filtros } from '../model/filtros';

export function CandidatosPage() {
  const { data: candidatos = [], isPending } = useCandidatos();
  const { data: colonias = [] } = useColonias();
  const estado = useCargaProgresiva();
  const [filtros, setFiltros] = useState<Filtros>(SIN_FILTROS);
  const [vista, setVista] = useState<'lista' | 'mapa'>('mapa');
  const [capas, setCapas] = useState<ReadonlySet<CapaId>>(new Set());
  const [seleccionado, setSeleccionado] = useState<Candidato | null>(null);

  const filtrados = useMemo(() => filtrarCandidatos(candidatos, filtros), [candidatos, filtros]);

  function toggleCapa(capa: CapaId) {
    setCapas((prev) => {
      const s = new Set(prev);
      if (s.has(capa)) s.delete(capa);
      else s.add(capa);
      return s;
    });
  }

  /** Click en un polígono de colonia → filtra candidatos (match fuzzy del legacy). */
  function onColoniaPoligono(nombreUpper: string) {
    const match = buscarColoniaMatch(nombreUpper, colonias);
    setFiltros((f) => ({ ...f, colonia: match?.id ?? nombreUpper }));
  }

  return (
    <div className="flex h-full flex-col">
      <VistaMovilToggle vista={vista} onChange={setVista} />
      <div className="flex min-h-0 flex-1">
        <PanelLateral
          visible={vista === 'lista'}
          filtros={filtros}
          onFiltros={setFiltros}
          filtrados={filtrados}
          isPending={isPending}
          seleccionadoId={seleccionado?.place_id ?? null}
          onSelect={setSeleccionado}
        />
        <MapaCandidatos
          visible={vista === 'mapa'}
          filtrados={filtrados}
          totalCargados={candidatos.length}
          estado={estado}
          capas={capas}
          onToggleCapa={toggleCapa}
          coloniaSeleccionada={filtros.colonia}
          onColoniaPoligono={onColoniaPoligono}
          seleccionado={seleccionado}
          onSelect={setSeleccionado}
        />
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
