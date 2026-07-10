import type { ReactNode } from 'react';

interface PageHeaderProps {
  /** Antetítulo en versalitas. Sitúa la página dentro de su dominio. */
  eyebrow?: ReactNode;
  title: string;
  /** Una línea que explica qué se ve aquí. */
  description?: ReactNode;
  /** Controles alineados a la derecha: filtros, "Nueva campaña"… */
  actions?: ReactNode;
}

/**
 * Encabezado de una página: antetítulo, título y bajada.
 *
 * Cada vista lo escribía a mano con tamaños distintos (`text-3xl` en Índice,
 * `text-lg` en Campañas), así que las páginas no parecían del mismo producto.
 *
 * El título es un `<h1>`: es el nombre de la página, y solo debe haber uno.
 * En móvil las acciones caen debajo en vez de estrujar el título.
 *
 * No lleva margen inferior: la separación con el contenido la pone el `gap` de
 * la `<Page>` que lo contiene, y así no se suman dos espaciados.
 */
export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="grid min-w-0 gap-2">
        {eyebrow ? (
          <p className="text-2xs font-bold uppercase tracking-widest text-primary">{eyebrow}</p>
        ) : null}
        <h1 className="font-display text-3xl font-extrabold text-fg">{title}</h1>
        {description ? <p className="text-sm text-fg-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
