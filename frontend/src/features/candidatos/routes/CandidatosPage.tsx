import { useMemo, useState } from 'react';
import { formatNumero } from '@shared/lib/format';
import { BottomSheet } from '@shared/ui';
import { buscarColoniaMatch, useCapas, useColonias } from '@features/colonias-zonas';
import { useCandidatos } from '../api/useCandidatos';
import { useCargaProgresiva } from '../api/useCargaProgresiva';
import { MapaCandidatos } from '../components/MapaCandidatos';
import { PanelLateral, PanelLateralContenido } from '../components/PanelLateral';
import type { Candidato } from '../model/candidato';
import { filtrarCandidatos, SIN_FILTROS, type Filtros } from '../model/filtros';

export function CandidatosPage() {
  const { data: candidatos = [], isPending } = useCandidatos();
  const { data: colonias = [] } = useColonias();
  const estado = useCargaProgresiva();
  const [filtros, setFiltros] = useState<Filtros>(SIN_FILTROS);
  const capas = useCapas();
  const [seleccionado, setSeleccionado] = useState<Candidato | null>(null);

  const filtrados = useMemo(() => filtrarCandidatos(candidatos, filtros), [candidatos, filtros]);

  /** Click en un polígono de colonia → filtra candidatos (match fuzzy del legacy). */
  function onColoniaPoligono(nombreUpper: string) {
    const match = buscarColoniaMatch(nombreUpper, colonias);
    setFiltros((f) => ({ ...f, colonia: match?.id ?? nombreUpper }));
  }

  const panelProps = {
    filtros,
    onFiltros: setFiltros,
    filtrados,
    isPending,
    seleccionadoId: seleccionado?.place_id ?? null,
    onSelect: setSeleccionado,
  };

  return (
    /* `relative`: en desktop el panel sale del flujo y flota sobre el mapa; en
       móvil el mapa ocupa todo y las herramientas van en el cajón inferior
       (patrón Google Maps), en vez del viejo toggle mapa/lista. */
    <div className="relative flex h-full min-h-0">
      <PanelLateral {...panelProps} />
      <MapaCandidatos
        visible
        filtrados={filtrados}
        totalCargados={candidatos.length}
        estado={estado}
        capas={capas}
        coloniaSeleccionada={filtros.colonia}
        onColoniaPoligono={onColoniaPoligono}
        seleccionado={seleccionado}
        onSelect={setSeleccionado}
        busqueda={filtros.q}
        onBusqueda={(q) => setFiltros((f) => ({ ...f, q }))}
      />
      <BottomSheet
        className="md:hidden"
        title={
          <>
            Negocios
            <span className="text-xs font-semibold tabular-nums text-fg-muted">
              {isPending ? '…' : formatNumero(filtrados.length)}
            </span>
          </>
        }
      >
        <PanelLateralContenido {...panelProps} />
      </BottomSheet>
    </div>
  );
}
