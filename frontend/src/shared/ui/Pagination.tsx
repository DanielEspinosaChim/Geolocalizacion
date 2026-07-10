import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  /** Página actual, empezando en 1. */
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  /** Texto a la izquierda, ej. "21–40 de 137". */
  summary?: string;
}

/**
 * Paginación numerada. Muestra siempre la primera y la última página, y una
 * ventana alrededor de la actual; el resto se colapsa en «…».
 */
export function Pagination({ page, totalPages, onChange, summary }: PaginationProps) {
  // Con una sola página los números se pintan igual: así el pie no «salta» al
  // filtrar y siempre se ve en qué página estás.
  return (
    <nav aria-label="Paginación" className="flex items-center justify-between gap-3">
      {summary ? <p className="text-xs2 text-fg-muted">{summary}</p> : <span />}

      <div className="flex items-center gap-1">
        <Flecha
          icon={ChevronLeft}
          label="Página anterior"
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
        />

        {paginasVisibles(page, totalPages).map((p, i) =>
          p === null ? (
            <span
              // Solo puede haber dos elipsis (una por lado), así que el índice basta.
              key={`hueco-${i}`}
              aria-hidden="true"
              className="px-1 text-xs2 text-fg-subtle"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              aria-label={`Página ${p}`}
              aria-current={p === page ? 'page' : undefined}
              onClick={() => onChange(p)}
              className={`h-8 min-w-8 rounded-control border px-2 text-sm font-bold transition-colors ${
                p === page
                  ? 'border-primary-strong bg-primary-strong text-primary-fg'
                  : 'border-border bg-surface text-fg hover:border-primary hover:text-primary'
              }`}
            >
              {p}
            </button>
          ),
        )}

        <Flecha
          icon={ChevronRight}
          label="Página siguiente"
          disabled={page === totalPages}
          onClick={() => onChange(page + 1)}
        />
      </div>
    </nav>
  );
}

function Flecha({
  icon: Icon,
  label,
  disabled,
  onClick,
}: {
  icon: typeof ChevronLeft;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-control border border-border bg-surface text-fg-muted transition-colors hover:border-primary hover:text-fg disabled:pointer-events-none disabled:opacity-40"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

/** Números a pintar; `null` es una elipsis. Ej. 1 … 6 7 8 … 20 */
export function paginasVisibles(page: number, totalPages: number): (number | null)[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const ventana = [page - 1, page, page + 1].filter((p) => p > 1 && p < totalPages);
  const nums = [1, ...ventana, totalPages];

  const salida: (number | null)[] = [];
  for (const [i, n] of nums.entries()) {
    const anterior = nums[i - 1];
    if (anterior !== undefined && n - anterior > 1) salida.push(null);
    salida.push(n);
  }
  return salida;
}
