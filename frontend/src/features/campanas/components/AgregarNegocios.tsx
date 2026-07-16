import { Check, Plus, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button, Card, EmptyState, IconButton, SearchInput } from '@shared/ui';
import { giroLabel, useCandidatos, type Candidato } from '@features/candidatos';
import { useCampanaMutations } from '../api/useCampanaMutations';
import type { NegocioCampana } from '../model/campana';

/** Tope de resultados: la lista es un desplegable, no un catálogo. */
const MAX_RESULTADOS = 60;

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
      .slice(0, MAX_RESULTADOS);
  }, [candidatos, q]);

  if (!abierto) {
    return (
      <div className="flex justify-end">
        <Button onClick={() => setAbierto(true)}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Agregar negocio
        </Button>
      </div>
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

      <div className="scrollbar-slim max-h-64 overflow-y-auto">
        {resultados.map((c) => (
          <Fila
            key={c.place_id}
            candidato={c}
            yaEsta={idsExistentes.has(c.place_id)}
            guardando={agregarNegocio.isPending}
            onAgregar={() => agregarNegocio.mutate(c.place_id)}
          />
        ))}
        {resultados.length === 0 ? <EmptyState title="Sin resultados." className="py-6" /> : null}
      </div>
    </Card>
  );
}

function Fila({
  candidato: c,
  yaEsta,
  guardando,
  onAgregar,
}: {
  candidato: Candidato;
  yaEsta: boolean;
  guardando: boolean;
  onAgregar: () => void;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-border px-2 py-1.5 last:border-b-0">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold">{c.nombre}</span>
        <span className="block truncate text-2xs text-fg-muted">{giroLabel(c.tipos)}</span>
      </span>
      {/* Si ya está en la campaña se informa, en vez de dejar un botón apagado
          que el usuario intente pulsar sin entender por qué no responde. */}
      {yaEsta ? (
        <span className="flex shrink-0 items-center gap-1 text-2xs font-semibold text-fg-subtle">
          <Check className="h-3 w-3" aria-hidden="true" /> Ya está
        </span>
      ) : (
        <Button variant="ghost" size="sm" loading={guardando} onClick={onAgregar}>
          {guardando ? null : <Plus className="h-3.5 w-3.5" aria-hidden="true" />} Agregar
        </Button>
      )}
    </div>
  );
}
