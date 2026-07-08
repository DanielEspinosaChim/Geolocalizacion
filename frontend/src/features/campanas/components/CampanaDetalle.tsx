import { useState } from 'react';
import { descargarReporteVisita } from '@features/rutas';
import { Badge, Button, Spinner } from '@shared/ui';
import { useCampana } from '../api/useCampana';
import { useCampanaMutations } from '../api/useCampanaMutations';
import { progresoDe, STATUS_META, type NegocioCampana } from '../model/campana';
import { AgregarNegocios } from './AgregarNegocios';
import { ChecklistTecnico } from './ChecklistTecnico';
import { NegociosTabla } from './NegociosTabla';
import { PlantillasModal } from './PlantillasModal';
import { ProgresoHero } from './ProgresoHero';
import { RutaCampanaModal } from './RutaCampanaModal';
import { VisitaModal } from './VisitaModal';

interface CampanaDetalleProps {
  campanaId: string;
  esTecnico: boolean;
  onVolver: () => void;
}

export function CampanaDetalle({ campanaId, esTecnico, onVolver }: CampanaDetalleProps) {
  const { data, isPending } = useCampana(campanaId);
  const { cambiarStatus, eliminar } = useCampanaMutations(campanaId);
  const [visita, setVisita] = useState<NegocioCampana | null>(null);
  const [rutaAbierta, setRutaAbierta] = useState(false);
  const [plantillasAbierto, setPlantillasAbierto] = useState(false);

  if (isPending || !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner label="Cargando campaña…" />
      </div>
    );
  }

  const { campana, negocios } = data;
  const progreso = progresoDe(campana);
  const meta = STATUS_META[campana.status];

  return (
    <div className="flex h-full flex-col">
      <header className="grid gap-3 border-b border-border p-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onVolver} className="px-2 py-1" aria-label="Volver a campañas">
            ←
          </Button>
          <h2 className="flex-1 truncate font-display text-lg font-extrabold">{campana.nombre}</h2>
          <Badge tone={meta.tone}>{meta.label}</Badge>
        </div>

        {esTecnico ? (
          <>
            <ProgresoHero progreso={progreso} colonia={campana.colonia} />
            <div className="flex gap-2">
              <Button onClick={() => setRutaAbierta(true)} className="flex-1">
                📍 Definir ruta
              </Button>
              <Button
                variant="secondary"
                onClick={() => void descargarReporteVisita(negocios.map((n) => n.negocio_id), campanaId)}
              >
                📄 Reporte
              </Button>
            </div>
          </>
        ) : (
          <AdminBar
            progreso={progreso}
            onPlantillas={() => setPlantillasAbierto(true)}
            onCerrar={() => {
              if (window.confirm('¿Marcar esta campaña como finalizada?')) {
                cambiarStatus.mutate('cerrada', { onSuccess: onVolver });
              }
            }}
            onEliminar={() => {
              if (window.confirm('¿Eliminar esta campaña permanentemente?')) {
                eliminar.mutate(undefined, { onSuccess: onVolver });
              }
            }}
          />
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {!esTecnico ? (
          <div className="mb-3">
            <AgregarNegocios campanaId={campanaId} yaEnCampana={negocios} />
          </div>
        ) : null}
        {esTecnico ? (
          <ChecklistTecnico campanaId={campanaId} negocios={negocios} onRegistrar={setVisita} />
        ) : (
          <NegociosTabla campanaId={campanaId} negocios={negocios} onRegistrar={setVisita} />
        )}
      </div>

      {visita ? (
        <VisitaModal campanaId={campanaId} negocio={visita} onClose={() => setVisita(null)} />
      ) : null}
      {rutaAbierta ? <RutaCampanaModal negocios={negocios} onClose={() => setRutaAbierta(false)} /> : null}
      <PlantillasModal open={plantillasAbierto} onClose={() => setPlantillasAbierto(false)} />
    </div>
  );
}

function AdminBar({
  progreso,
  onPlantillas,
  onCerrar,
  onEliminar,
}: {
  progreso: ReturnType<typeof progresoDe>;
  onPlantillas: () => void;
  onCerrar: () => void;
  onEliminar: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm">
        <b className="text-primary">{progreso.pct}%</b> completado ({progreso.hecho} / {progreso.total})
      </span>
      <div className="ml-auto flex gap-2">
        <Button variant="secondary" onClick={onPlantillas} className="text-xs">
          🧩 Plantillas
        </Button>
        <Button variant="secondary" onClick={onCerrar} className="text-xs">
          Finalizar
        </Button>
        <Button variant="ghost" onClick={onEliminar} className="text-xs text-danger">
          Eliminar
        </Button>
      </div>
    </div>
  );
}
