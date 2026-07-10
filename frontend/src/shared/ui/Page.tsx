import type { PropsWithChildren } from 'react';

/**
 * Ancho máximo del contenido. Que una vista ocupe toda la pantalla no significa
 * que su texto deba hacerlo: una línea de 200 caracteres es ilegible.
 */
const ANCHOS = {
  /** Tablas, rejillas de tarjetas, cualquier cosa que gane con el espacio. */
  full: 'max-w-none',
  /** Formularios y paneles densos. */
  wide: 'max-w-6xl',
  /** Documentos con párrafos largos (metodologías, informes). */
  prose: 'max-w-4xl',
} as const;

interface PageProps extends PropsWithChildren {
  width?: keyof typeof ANCHOS;
  className?: string;
}

/**
 * Marco de una página con scroll propio.
 *
 * El `h-full` es lo importante: sin él la vista no llena el alto disponible y
 * el scroll se lo queda el shell, que además no lo tiene. Cada página se lo
 * inventaba por su cuenta —y Validación y Admin se lo habían dejado— así que
 * unas ocupaban la pantalla y otras no.
 *
 * No lo usan las vistas partidas en panel + mapa: esas gestionan su propio alto.
 */
export function Page({ width = 'full', className = '', children }: PageProps) {
  return (
    <div className="scrollbar-slim h-full overflow-y-auto">
      <div className={`mx-auto w-full ${ANCHOS[width]} p-4 sm:p-6 ${className}`}>{children}</div>
    </div>
  );
}
