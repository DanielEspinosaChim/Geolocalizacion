import { useState } from 'react';
import { ArrowLeft, FileText, LayoutTemplate, MapPin } from 'lucide-react';
import { Badge, Button, IconButton, Spinner, useConfirm } from '@shared/ui';
import { descargarReporteVisita } from '@features/rutas';
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
  const confirm = useConfirm();
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
          <IconButton variant="ghost" size="sm" icon={ArrowLeft} label="Volver a campañas" onClick={onVolver} />
          <h2 className="flex-1 truncate font-display text-lg font-extrabold">{campana.nombre}</h2>
          <Badge tone={meta.tone}>{meta.label}</Badge>
        </div>

        {esTecnico ? (
          <>
            <ProgresoHero progreso={progreso} colonia={campana.colonia} />
            <div className="flex gap-2">
              <Button onClick={() => setRutaAbierta(true)} className="flex-1">
                <MapPin className="h-4 w-4" aria-hidden="true" /> Definir ruta
              </Button>
              <Button
                variant="secondary"
                onClick={() => void descargarReporteVisita(negocios.map((n) => n.negocio_id), campanaId)}
              >
                <FileText className="h-4 w-4" aria-hidden="true" /> Reporte
              </Button>
            </div>
          </>
        ) : (
          <AdminBar
            progreso={progreso}
            onPlantillas={() => setPlantillasAbierto(true)}
            onCerrar={() =>
              void confirm({
                title: 'Finalizar campaña',
                description: '¿Marcar esta campaña como finalizada?',
                confirmLabel: 'Finalizar',
              }).then((ok) => ok && cambiarStatus.mutate('cerrada', { onSuccess: onVolver }))
            }
            onEliminar={() =>
              void confirm({
                title: 'Eliminar campaña',
                description: 'Se eliminará permanentemente. Esta acción no se puede deshacer.',
                tone: 'danger',
                confirmLabel: 'Eliminar',
              }).then((ok) => ok && eliminar.mutate(undefined, { onSuccess: onVolver }))
            }
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
        <Button variant="secondary" size="sm" onClick={onPlantillas}>
          <LayoutTemplate className="h-4 w-4" aria-hidden="true" /> Plantillas
        </Button>
        <Button variant="secondary" size="sm" onClick={onCerrar}>
          Finalizar
        </Button>
        <Button variant="danger" size="sm" onClick={onEliminar}>
          Eliminar
        </Button>
      </div>
    </div>
  );
}
