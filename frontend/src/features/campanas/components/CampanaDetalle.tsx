import { ArrowLeft, FileText, LayoutTemplate, Route } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Badge, Button, Page, Spinner, toast, useConfirm } from '@shared/ui';
import { descargarReporteVisita } from '@features/rutas';
import { useCampana } from '../api/useCampana';
import { useCampanaMutations } from '../api/useCampanaMutations';
import {
  MIN_PARADAS_CAMPANA,
  progresoDe,
  STATUS_META,
  type Campana,
  type NegocioCampana,
} from '../model/campana';
import { AgregarNegocios } from './AgregarNegocios';
import { ChecklistTecnico } from './ChecklistTecnico';
import { NegociosGrid } from './NegociosGrid';
import { PlantillasModal } from './PlantillasModal';
import { VisitaModal } from './VisitaModal';

interface CampanaDetalleProps {
  campanaId: string;
  esTecnico: boolean;
  onVolver: () => void;
  /** Abre el modal de visita de este negocio al cargar (flujo popup de ruta). */
  registrarNegocioId?: string | null;
}

export function CampanaDetalle({
  campanaId,
  esTecnico,
  onVolver,
  registrarNegocioId = null,
}: CampanaDetalleProps) {
  const navigate = useNavigate();
  const { data, isPending } = useCampana(campanaId);
  const { cambiarStatus, eliminar } = useCampanaMutations(campanaId);
  const confirm = useConfirm();
  const [visita, setVisita] = useState<NegocioCampana | null>(null);
  const [plantillasAbierto, setPlantillasAbierto] = useState(false);

  // Al llegar desde el popup de una ruta de campaña, abre la visita una sola
  // vez cuando los negocios ya están cargados; la ref evita reabrirla si el
  // usuario la cierra y la query se revalida.
  const visitaAbierta = useRef(false);
  useEffect(() => {
    if (!registrarNegocioId || visitaAbierta.current || !data) return;
    const negocio = data.negocios.find((n) => n.negocio_id === registrarNegocioId);
    if (negocio) {
      visitaAbierta.current = true;
      setVisita(negocio);
    }
  }, [registrarNegocioId, data]);

  if (isPending || !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner label="Cargando campaña…" />
      </div>
    );
  }

  const { campana, negocios } = data;

  /** Lleva a la vista de Rutas con los negocios de la campaña ya seleccionados. */
  function verRuta() {
    const ids = negocios.filter((n) => n.lat != null && n.lng != null).map((n) => n.negocio_id);
    if (ids.length < MIN_PARADAS_CAMPANA) {
      toast.error(`Se necesitan al menos ${MIN_PARADAS_CAMPANA} negocios con ubicación para la ruta.`);
      return;
    }
    void navigate('/rutas', { state: { rutaCampana: ids, campanaId } });
  }

  async function finalizar() {
    const ok = await confirm({
      title: 'Finalizar campaña',
      description: '¿Marcar esta campaña como finalizada?',
      confirmLabel: 'Finalizar',
    });
    if (ok) cambiarStatus.mutate('cerrada', { onSuccess: onVolver });
  }

  /** Una campaña finalizada puede volver a activa (paridad con el legacy). */
  async function reactivar() {
    const ok = await confirm({
      title: 'Reactivar campaña',
      description: '¿Volver a poner esta campaña como activa?',
      confirmLabel: 'Reactivar',
    });
    if (ok) cambiarStatus.mutate('activa');
  }

  async function borrar() {
    const ok = await confirm({
      title: 'Eliminar campaña',
      description: 'Se eliminará permanentemente. Esta acción no se puede deshacer.',
      tone: 'danger',
      confirmLabel: 'Eliminar',
    });
    if (ok) eliminar.mutate(undefined, { onSuccess: onVolver });
  }

  return (
    <Page width="wide" className="grid gap-4">
      <Cabecera
        campana={campana}
        esTecnico={esTecnico}
        onVolver={onVolver}
        onVerRuta={verRuta}
        onReporte={() => void descargarReporteVisita(negocios.map((n) => n.negocio_id), campanaId)}
        onPlantillas={() => setPlantillasAbierto(true)}
        onFinalizar={() => void finalizar()}
        onReactivar={() => void reactivar()}
        onEliminar={() => void borrar()}
      />

      {/* En su propia fila: cerrado es un botón, abierto un panel a todo el ancho. */}
      {!esTecnico ? <AgregarNegocios campanaId={campanaId} yaEnCampana={negocios} /> : null}

      {esTecnico ? (
        <ChecklistTecnico campanaId={campanaId} negocios={negocios} onRegistrar={setVisita} />
      ) : (
        <NegociosGrid campanaId={campanaId} negocios={negocios} onRegistrar={setVisita} />
      )}

      {visita ? (
        <VisitaModal campanaId={campanaId} negocio={visita} onClose={() => setVisita(null)} />
      ) : null}
      <PlantillasModal open={plantillasAbierto} onClose={() => setPlantillasAbierto(false)} />
    </Page>
  );
}

interface CabeceraProps {
  campana: Campana;
  esTecnico: boolean;
  onVolver: () => void;
  onVerRuta: () => void;
  onReporte: () => void;
  onPlantillas: () => void;
  onFinalizar: () => void;
  onReactivar: () => void;
  onEliminar: () => void;
}

function Cabecera({
  campana,
  esTecnico,
  onVolver,
  onVerRuta,
  onReporte,
  onPlantillas,
  onFinalizar,
  onReactivar,
  onEliminar,
}: CabeceraProps) {
  const progreso = progresoDe(campana);
  const meta = STATUS_META[campana.status];
  const cerrada = campana.status === 'cerrada';

  return (
    <header className="grid gap-3">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onVolver}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Campañas
        </Button>
        <div className="ml-auto flex gap-2">
          {/* El botón alterna según el estado, como en el legacy. */}
          <Button variant="ghost" size="sm" onClick={cerrada ? onReactivar : onFinalizar}>
            {cerrada ? 'Reactivar' : 'Finalizar'}
          </Button>
          {!esTecnico ? (
            <Button variant="danger" size="sm" onClick={onEliminar}>
              Eliminar
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="font-display text-2xl font-extrabold text-fg">{campana.nombre}</h1>
        <Badge tone={meta.tone}>{meta.label}</Badge>
        <span className="text-xs2 text-fg-muted">
          {campana.colonia ? `${campana.colonia} · ` : ''}
          <b className="text-primary">{progreso.pct}%</b> completado ({progreso.hecho}/
          {progreso.total})
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onVerRuta}>
          <Route className="h-4 w-4" aria-hidden="true" /> Ver ruta
        </Button>
        <Button variant="secondary" size="sm" onClick={onReporte}>
          <FileText className="h-4 w-4" aria-hidden="true" /> Exportar reporte
        </Button>
        {!esTecnico ? (
          <Button variant="secondary" size="sm" onClick={onPlantillas}>
            <LayoutTemplate className="h-4 w-4" aria-hidden="true" /> Plantillas
          </Button>
        ) : null}
      </div>
    </header>
  );
}
