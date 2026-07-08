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
            className={`flex-1 rounded-control py-1.5 text-[11px] font-bold capitalize transition-colors ${
              filtro === f ? 'bg-primary/20 text-primary' : 'bg-surface-raised text-fg-muted'
            }`}
          >
            {f === 'pendientes' ? `⏳ Pendientes (${pendientes.length})` : `Todos (${negocios.length})`}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {mostrar.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-success">
            <span className="text-4xl">🎉</span>
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
