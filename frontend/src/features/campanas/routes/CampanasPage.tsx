import { useState } from 'react';
import { useSession } from '@features/auth';
import { CampanaDetalle } from '../components/CampanaDetalle';
import { CampanasList } from '../components/CampanasList';

export function CampanasPage() {
  const { user } = useSession();
  const esTecnico = user?.role === 'tecnico';
  const [campanaId, setCampanaId] = useState<string | null>(null);

  return (
    <div className="h-full">
      {campanaId ? (
        <CampanaDetalle
          campanaId={campanaId}
          esTecnico={esTecnico}
          onVolver={() => setCampanaId(null)}
        />
      ) : (
        <CampanasList esTecnico={esTecnico} uid={user?.uid ?? null} onAbrir={setCampanaId} />
      )}
    </div>
  );
}
