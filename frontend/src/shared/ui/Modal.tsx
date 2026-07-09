import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { PropsWithChildren } from 'react';

const WIDTH_CLASSES = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' } as const;

interface ModalProps extends PropsWithChildren {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  width?: keyof typeof WIDTH_CLASSES;
}

/** Modal accesible (Radix): focus trap, Escape y click fuera cierran. */
export function Modal({ open, onClose, title, description, width = 'md', children }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={description ? undefined : ''}
          className={`fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-card border border-border bg-surface p-6 shadow-2xl ${WIDTH_CLASSES[width]}`}
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
          <div className="mt-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
