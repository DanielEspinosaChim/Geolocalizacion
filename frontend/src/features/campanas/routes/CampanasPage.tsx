import { useState } from 'react';
import { useLocation } from 'react-router';
import { useSession } from '@features/auth';
import { CampanaDetalle } from '../components/CampanaDetalle';
import { CampanasList } from '../components/CampanasList';

export function CampanasPage() {
  const { user } = useSession();
  const esTecnico = user?.role === 'tecnico';
  // El popup de una ruta de campaña navega aquí pidiendo abrir un detalle
  // concreto y registrar la visita de un negocio (paridad con el legacy).
  const location = useLocation();
  const state = location.state as { abrirCampana?: string; registrarNegocio?: string } | null;
  const [campanaId, setCampanaId] = useState<string | null>(state?.abrirCampana ?? null);

  return (
    <div className="h-full">
      {campanaId ? (
        <CampanaDetalle
          campanaId={campanaId}
          esTecnico={esTecnico}
          onVolver={() => setCampanaId(null)}
          registrarNegocioId={campanaId === state?.abrirCampana ? state?.registrarNegocio : null}
        />
      ) : (
        <CampanasList esTecnico={esTecnico} uid={user?.uid ?? null} onAbrir={setCampanaId} />
      )}
    </div>
  );
}
