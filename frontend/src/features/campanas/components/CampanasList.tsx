import { useState } from 'react';
import { Button, SelectField, Spinner } from '@shared/ui';
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
            <SelectField
              label=""
              value={status ?? ''}
              onChange={(e) => setStatus((e.target.value || null) as StatusCampana | null)}
              className="py-1.5"
            >
              <option value="">Todas</option>
              {STATUS_CAMPANA.map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].label}
                </option>
              ))}
            </SelectField>
            <Button onClick={() => setCrearAbierto(true)} className="whitespace-nowrap">
              + Nueva campaña
            </Button>
          </div>
        ) : null}
      </header>

      {isPending ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner label="Cargando campañas…" />
        </div>
      ) : campanas.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-fg-muted">
          <span className="text-4xl opacity-40">📋</span>
          <p>{esTecnico ? 'No tienes campañas asignadas aún.' : 'No hay campañas aún.'}</p>
        </div>
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
