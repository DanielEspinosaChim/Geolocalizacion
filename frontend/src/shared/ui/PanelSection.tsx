import type { PropsWithChildren, ReactNode } from 'react';

interface PanelSectionProps extends PropsWithChildren {
  /** Se muestra en versalitas; describe el bloque ("Clic en el mapa"). */
  title: string;
  /** Slot a la derecha del título (contador, botón de acción…). */
  action?: ReactNode;
  /** Deja que el bloque crezca y haga scroll propio dentro del panel. */
  grow?: boolean;
  className?: string;
}

/**
 * Bloque de un panel lateral: título en versalitas con marca de acento y su
 * contenido, separado del siguiente por una regla. Es el ritmo visual de los
 * paneles de mapa, predicción y reportes, que antes cada vista replicaba.
 */
export function PanelSection({ title, action, grow, className = '', children }: PanelSectionProps) {
  return (
    <section
      className={`grid content-start gap-2.5 border-b border-border p-3 ${
        grow ? 'min-h-0 flex-1 overflow-y-auto' : ''
      } ${className}`}
    >
      <header className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider text-fg-subtle">
          <span aria-hidden="true" className="h-3 w-0.5 rounded-full bg-primary" />
          {title}
        </h2>
        {action}
      </header>
      {children}
    </section>
  );
}
