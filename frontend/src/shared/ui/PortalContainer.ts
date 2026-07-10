import { createContext, useContext } from 'react';

/**
 * Dónde deben aterrizar los paneles flotantes (el desplegable del Combobox).
 *
 * Por defecto, `document.body`. Pero dentro de un `Modal` eso no sirve: Radix
 * pone `pointer-events: none` en el `<body>` mientras el diálogo está abierto y
 * solo lo reactiva dentro del contenido, además de atrapar ahí el foco. Un
 * portal al body quedaría visible pero inerte: no recibiría clics ni foco.
 *
 * `Modal` publica su nodo de contenido por este contexto, y quien portalea lo
 * usa si está presente.
 */
export const PortalContainerContext = createContext<HTMLElement | null>(null);

/** Contenedor donde portalear: el contenido del Modal, o el body si no hay. */
export function usePortalContainer(): HTMLElement | null {
  const contenedor = useContext(PortalContainerContext);
  // `document` no existe al renderizar en servidor; el llamador omite el portal.
  return contenedor ?? (typeof document === 'undefined' ? null : document.body);
}
