import { useMemo, useState } from 'react';
import { giroLabel, useCandidatos } from '@features/candidatos';
import { Button } from '@shared/ui';
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
      <Button onClick={() => setAbierto(true)} className="w-full">
        + Agregar negocio
      </Button>
    );
  }

  return (
    <div className="grid gap-2 rounded-card border border-border bg-surface-raised p-3">
      <div className="flex gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar negocio…"
          aria-label="Buscar negocio para agregar"
          className="flex-1 rounded-control border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <Button variant="secondary" onClick={() => setAbierto(false)}>
          ✕
        </Button>
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
        {resultados.length === 0 ? (
          <p className="p-3 text-center text-xs text-fg-muted">Sin resultados.</p>
        ) : null}
      </div>
    </div>
  );
}
