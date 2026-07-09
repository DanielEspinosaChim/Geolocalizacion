import type { ReactNode } from 'react';

interface EmptyStateProps {
  /** Mensaje principal (ej. "No hay reportes registrados."). */
  title: string;
  /** Icono/emoji opcional sobre el título. */
  icon?: ReactNode;
  /** Pista secundaria opcional (ej. "Créalos en la pestaña Campañas."). */
  hint?: string;
  /** Acción opcional: normalmente un <Button> para salir del estado vacío. */
  action?: ReactNode;
  /** Override de espaciado/layout para contextos densos (default p-6). */
  className?: string;
}

/** Estado vacío estandarizado — reemplaza los <p> centrados artesanales. */
export function EmptyState({ title, icon, hint, action, className = 'p-6' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center gap-2 text-center ${className}`}>
      {icon}
      <p className="text-sm text-fg-muted">{title}</p>
      {hint ? <p className="text-xs text-fg-subtle">{hint}</p> : null}
      {action}
    </div>
  );
}
