import type { PropsWithChildren } from 'react';

/** Fila de acciones alineada a la derecha para el pie de los modales/forms. */
export function ModalFooter({ children }: PropsWithChildren) {
  return <div className="mt-5 flex items-center justify-end gap-2">{children}</div>;
}
