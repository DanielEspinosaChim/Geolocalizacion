import { BottomSheet } from '@shared/ui';
import { useControladorRuta } from '../api/useControladorRuta';
import { HerramientasRuta } from '../components/HerramientasRuta';
import { MapaRuta } from '../components/MapaRuta';

export function RutasPage() {
  const c = useControladorRuta();

  const herramientas = (
    <HerramientasRuta
      candidatos={c.candidatos}
      calculando={c.calculando}
      ruta={c.ruta}
      seleccion={c.seleccion}
      q={c.q}
      onQ={c.setQ}
      onCalcularColonia={c.calcularColonia}
      onLimpiar={c.limpiar}
      onCalcularManual={c.calcularManual}
      onToggle={c.toggle}
    />
  );

  return (
    /* En móvil el mapa ya no se oculta: las herramientas van en el cajón
       inferior (BottomSheet), como en la vista de candidatos. */
    <div className="relative flex h-full">
      <aside className="scrollbar-slim flex w-96 shrink-0 flex-col overflow-y-auto border-r border-border bg-surface max-md:hidden">
        {herramientas}
      </aside>

      <MapaRuta
        candidatos={c.candidatos}
        ruta={c.ruta}
        capas={c.capas}
        parada={c.parada}
        onParadaClick={c.onParadaClick}
        onCerrarParada={c.cerrarParada}
        campanaOrigen={c.campanaOrigen}
        onRegistrar={c.registrarVisita}
      />

      <BottomSheet
        className="md:hidden"
        initialSnap={c.rutaCampana ? 'peek' : 'half'}
        title={
          <>
            Herramientas de ruta
            <span className="text-xs font-semibold tabular-nums text-fg-muted">
              {c.seleccion.size > 0 ? `${c.seleccion.size} seleccionados` : null}
            </span>
          </>
        }
      >
        {herramientas}
      </BottomSheet>
    </div>
  );
}
