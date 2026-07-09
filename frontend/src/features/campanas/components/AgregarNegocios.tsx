import { Plus, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button, Card, EmptyState, IconButton, SearchInput } from '@shared/ui';
import { giroLabel, useCandidatos } from '@features/candidatos';
import { useCampanaMutations } from '../api/useCampanaMutations';
import type { NegocioCampana } from '../model/campana';

interface AgregarNegociosProps {
  campanaId: string;
  yaEnCampana: NegocioCampana[];
}

export function AgregarNegocios({ campanaId, yaEnCampana }: AgregarNegociosProps) {
  const [abierto, setAbierto] = useState(false);
  const [q, setQ] = useState('');
  const { data: candidatos = [] } = useCandidatos();
  const { agregarNegocio } = useCampanaMutations(campanaId);
  const idsExistentes = useMemo(
    () => new Set(yaEnCampana.map((n) => n.negocio_id)),
    [yaEnCampana],
  );

  const resultados = useMemo(() => {
    const texto = q.trim().toLowerCase();
    return candidatos
      .filter((c) => c.lat != null && c.lng != null)
      .filter((c) => !texto || c.nombre.toLowerCase().includes(texto))
      .slice(0, 60);
  }, [candidatos, q]);

  if (!abierto) {
    return (
      <Button onClick={() => setAbierto(true)} full>
        <Plus className="h-4 w-4" aria-hidden="true" /> Agregar negocio
      </Button>
    );
  }

  return (
    <Card raised className="grid gap-2 p-3">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <SearchInput
            value={q}
            onChange={setQ}
            debounceMs={200}
            placeholder="Buscar negocio…"
            aria-label="Buscar negocio para agregar"
          />
        </div>
        <IconButton variant="ghost" icon={X} label="Cerrar" onClick={() => setAbierto(false)} />
      </div>
      <div className="max-h-64 overflow-y-auto">
        {resultados.map((c) => {
          const yaEsta = idsExistentes.has(c.place_id);
          return (
            <button
              key={c.place_id}
              type="button"
              disabled={yaEsta || agregarNegocio.isPending}
              onClick={() => agregarNegocio.mutate(c.place_id)}
              className={`flex w-full items-center gap-2 border-b border-border px-2 py-1.5 text-left ${
                yaEsta ? 'opacity-45' : 'hover:bg-surface'
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold">{c.nombre}</span>
                <span className="block truncate text-[10px] text-fg-muted">{giroLabel(c.tipos)}</span>
              </span>
              <span className={`text-[10px] font-semibold ${yaEsta ? 'text-fg-subtle' : 'text-primary'}`}>
                {yaEsta ? 'ya está' : '+ agregar'}
              </span>
            </button>
          );
        })}
        {resultados.length === 0 ? <EmptyState title="Sin resultados." className="p-3" /> : null}
      </div>
    </Card>
  );
}
