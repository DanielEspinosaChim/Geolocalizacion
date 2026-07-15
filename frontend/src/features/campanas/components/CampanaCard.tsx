import { Calendar, ChevronRight, MapPin, Store } from 'lucide-react';
import { Badge } from '@shared/ui';
import { progresoDe, STATUS_META, type Campana } from '../model/campana';

interface CampanaCardProps {
  campana: Campana;
  onClick: () => void;
}

/**
 * Tarjeta de campaña. Superficie blanca elevada (no raised) con acento de
 * marca en el borde superior, anillo de progreso y hover-lift: la lista es
 * la portada del módulo y las tarjetas son el elemento protagonista.
 */
export function CampanaCard({ campana, onClick }: CampanaCardProps) {
  const { pct, hecho, total, completa } = progresoDe(campana);
  const meta = STATUS_META[campana.status];

  return (
    <button
      type="button"
      onClick={onClick}
      className="hover-lift group relative grid gap-3 overflow-hidden rounded-card border border-border bg-surface p-4 pt-5 text-left shadow-card hover:border-primary/40"
    >
      {/* Acento superior: verde al completar, gradiente de marca mientras no. */}
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-1 ${
          completa ? 'bg-success' : 'bg-gradient-to-r from-primary-strong via-primary to-primary/40'
        }`}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Badge tone={meta.tone}>{meta.label}</Badge>
          <h3 className="mt-2 truncate font-display text-base font-bold tracking-tight">
            {campana.nombre}
          </h3>
        </div>
        <AnilloProgreso pct={pct} completa={completa} />
      </div>

      <div className="grid gap-1 text-xs text-fg-muted">
        {campana.colonia ? (
          <span className="flex items-center gap-1.5 truncate">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden="true" />
            {campana.colonia}
          </span>
        ) : null}
        {campana.fecha_inicio ? (
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden="true" />
            {campana.fecha_inicio}
            {campana.fecha_fin ? ` → ${campana.fecha_fin}` : ''}
          </span>
        ) : null}
      </div>

      <div className="flex items-center justify-between border-t border-border/70 pt-3">
        <span className="flex items-center gap-1.5 text-xs2 font-semibold text-fg-muted">
          <Store className="h-3.5 w-3.5 text-fg-subtle" aria-hidden="true" />
          {hecho} / {total} negocios
        </span>
        <span className="flex items-center gap-0.5 text-xs2 font-bold text-primary opacity-0 transition-opacity group-hover:opacity-100">
          Abrir <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </div>
    </button>
  );
}

/**
 * Progreso como anillo cónico (paridad con el detalle técnico del legacy).
 * Es solo decorativo: el dato accesible va en el texto "hecho / total".
 */
function AnilloProgreso({ pct, completa }: { pct: number; completa: boolean }) {
  const color = completa ? 'hsl(var(--success))' : 'hsl(var(--primary))';
  return (
    <span
      aria-hidden="true"
      className="grid h-12 w-12 shrink-0 place-items-center rounded-full"
      style={{
        background: `conic-gradient(${color} ${pct * 3.6}deg, hsl(var(--border) / 0.5) 0deg)`,
      }}
    >
      <span className="grid h-9 w-9 place-items-center rounded-full bg-surface text-2xs font-extrabold tabular-nums">
        {pct}%
      </span>
    </span>
  );
}
