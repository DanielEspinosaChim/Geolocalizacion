import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useState, type PropsWithChildren } from 'react';
import { MODAL_SIZES, type ModalSize } from './modal-sizes';
import { PortalContainerContext } from './PortalContainer';

interface ModalProps extends PropsWithChildren {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  width?: ModalSize;
}

/**
 * Modal accesible (Radix): focus trap, Escape y click fuera cierran.
 *
 * La entrada y la salida se animan con las clases de `tailwindcss-animate`
 * enganchadas al `data-state` que Radix ya pone en el DOM. Radix mantiene el
 * nodo montado hasta que termina la animación de salida, así que no hace falta
 * ningún estado extra para el desmontaje.
 *
 * Publica su nodo de contenido por `PortalContainerContext`: los desplegables
 * que viven en un portal deben aterrizar dentro del diálogo, no en el `<body>`,
 * donde Radix los dejaría sin clics ni foco mientras el modal está abierto.
 */
export function Modal({ open, onClose, title, description, width = 'md', children }: ModalProps) {
  // Estado, no ref: el contexto debe re-renderizar a los hijos cuando el nodo
  // exista, y una ref no avisa de su cambio.
  const [contenido, setContenido] = useState<HTMLDivElement | null>(null);

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-overlay bg-black/60 backdrop-blur-sm duration-fast data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        {/* El centrado va por flex, no por `-translate-1/2`: los keyframes de
            `zoom-in` reescriben `transform` entero y desplazarían el diálogo.
            `pointer-events-none` deja pasar el clic al overlay, que es quien
            cierra al pulsar fuera. */}
        <div className="pointer-events-none fixed inset-0 z-modal flex items-center justify-center p-4">
          <Dialog.Content
            ref={setContenido}
            aria-describedby={description ? undefined : ''}
            className={`pointer-events-auto max-h-[85vh] w-full overflow-y-auto rounded-card border border-border bg-surface p-6 shadow-overlay duration-fast data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 ${MODAL_SIZES[width]}`}
          >
            <header className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="font-display text-lg font-extrabold tracking-tight">
                  {title}
                </Dialog.Title>
                {description ? (
                  <Dialog.Description className="mt-1 text-sm text-fg-muted">
                    {description}
                  </Dialog.Description>
                ) : null}
              </div>
              <Dialog.Close
                aria-label="Cerrar"
                className="rounded-control p-1 text-fg-muted transition-colors hover:bg-surface-raised hover:text-fg"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Dialog.Close>
            </header>
            <div className="mt-4">
              <PortalContainerContext.Provider value={contenido}>
                {children}
              </PortalContainerContext.Provider>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
