import { useState } from 'react';
import { ClipboardList, Plus } from 'lucide-react';
import { Button, Combobox, EmptyState, Spinner } from '@shared/ui';
import { useCampanas } from '../api/useCampanas';
import { STATUS_CAMPANA, STATUS_META, type StatusCampana } from '../model/campana';
import { CampanaCard } from './CampanaCard';
import { CrearCampanaModal } from './CrearCampanaModal';

interface CampanasListProps {
  esTecnico: boolean;
  uid: string | null;
  onAbrir: (id: string) => void;
}

export function CampanasList({ esTecnico, uid, onAbrir }: CampanasListProps) {
  const [status, setStatus] = useState<StatusCampana | null>(null);
  const [crearAbierto, setCrearAbierto] = useState(false);
  const { data: campanas = [], isPending } = useCampanas({
    status,
    asignadoA: esTecnico ? uid : null,
  });

  return (
    <div className="flex h-full flex-col p-4">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-extrabold">
            {esTecnico ? 'Mis campañas' : 'Campañas'}
          </h2>
          <p className="text-xs text-fg-muted">
            {esTecnico ? 'Asignadas a ti para visita de campo' : 'Gestión de campañas de visita'}
          </p>
        </div>
        {!esTecnico ? (
          <div className="flex items-center gap-2">
            <div className="w-40 shrink-0">
              <Combobox
                aria-label="Filtrar campañas por estado"
                placeholder="Todas"
                options={STATUS_CAMPANA.map((s) => ({ value: s, label: STATUS_META[s].label }))}
                value={status}
                onChange={(s) => setStatus(s as StatusCampana | null)}
              />
            </div>
            <Button onClick={() => setCrearAbierto(true)} className="whitespace-nowrap">
              <Plus className="h-4 w-4" aria-hidden="true" /> Nueva campaña
            </Button>
          </div>
        ) : null}
      </header>

      {isPending ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner label="Cargando campañas…" />
        </div>
      ) : campanas.length === 0 ? (
        <EmptyState
          className="flex-1 justify-center"
          icon={<ClipboardList className="h-10 w-10 opacity-40" aria-hidden="true" />}
          title={esTecnico ? 'No tienes campañas asignadas aún.' : 'No hay campañas aún.'}
        />
      ) : (
        <div className="grid gap-3 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
          {campanas.map((c) => (
            <CampanaCard key={c.id} campana={c} onClick={() => onAbrir(c.id)} />
          ))}
        </div>
      )}

      <CrearCampanaModal open={crearAbierto} onClose={() => setCrearAbierto(false)} />
    </div>
  );
}
