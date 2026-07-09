import { Clock, PartyPopper } from 'lucide-react';
import { useState } from 'react';
import type { NegocioCampana } from '../model/campana';
import { ChecklistItem } from './ChecklistItem';

type Filtro = 'pendientes' | 'todos';

interface ChecklistTecnicoProps {
  campanaId: string;
  negocios: NegocioCampana[];
  onRegistrar: (n: NegocioCampana) => void;
}

export function ChecklistTecnico({ campanaId, negocios, onRegistrar }: ChecklistTecnicoProps) {
  const [filtro, setFiltro] = useState<Filtro>('pendientes');
  const pendientes = negocios.filter((n) => !n.completado);
  const visitados = negocios.filter((n) => n.completado);
  const mostrar = filtro === 'pendientes' ? pendientes : [...pendientes, ...visitados];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex gap-1.5 p-3">
        {(['pendientes', 'todos'] as const).map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filtro === f}
            onClick={() => setFiltro(f)}
            className={`flex flex-1 items-center justify-center gap-1 rounded-control py-1.5 text-xs2 font-bold capitalize transition-colors ${
              filtro === f ? 'bg-primary/20 text-primary' : 'bg-surface-raised text-fg-muted'
            }`}
          >
            {f === 'pendientes' ? (
              <>
                <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Pendientes ({pendientes.length})
              </>
            ) : (
              `Todos (${negocios.length})`
            )}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {mostrar.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-success">
            <PartyPopper className="h-10 w-10" aria-hidden="true" />
            <p>¡Todos los negocios visitados!</p>
          </div>
        ) : (
          mostrar.map((n) => (
            <ChecklistItem key={n.negocio_id} campanaId={campanaId} negocio={n} onRegistrar={onRegistrar} />
          ))
        )}
      </div>
    </div>
  );
}
