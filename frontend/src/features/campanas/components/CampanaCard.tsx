import { Badge } from '@shared/ui';
import { progresoDe, STATUS_META, type Campana } from '../model/campana';

interface CampanaCardProps {
  campana: Campana;
  onClick: () => void;
}

export function CampanaCard({ campana, onClick }: CampanaCardProps) {
  const { pct, hecho, total, completa } = progresoDe(campana);
  const meta = STATUS_META[campana.status];

  return (
    <button
      type="button"
      onClick={onClick}
      className="grid gap-2 rounded-card border border-border bg-surface-raised p-4 text-left transition-colors hover:border-primary"
    >
      <div className="flex items-center justify-between">
        <Badge tone={meta.tone}>{meta.label}</Badge>
        <span className={`text-sm font-extrabold tabular-nums ${completa ? 'text-success' : 'text-primary'}`}>
          {pct}%
        </span>
      </div>
      <div className="truncate font-display font-bold">{campana.nombre}</div>
      {campana.colonia ? <div className="text-xs text-fg-subtle">🏘️ {campana.colonia}</div> : null}
      {campana.fecha_inicio ? (
        <div className="text-[10px] text-fg-subtle">
          📅 {campana.fecha_inicio}
          {campana.fecha_fin ? ` → ${campana.fecha_fin}` : ''}
        </div>
      ) : null}
      <div className="text-[11px] text-fg-muted">
        {hecho} / {total} negocios
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-bg">
        <div
          className={`h-full rounded-full transition-all ${completa ? 'bg-success' : 'bg-primary-strong'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </button>
  );
}
