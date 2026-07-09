import { createContext, useCallback, useContext, useRef, useState, type PropsWithChildren } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'danger' pinta el botón de confirmar en rojo (acciones destructivas). */
  tone?: 'primary' | 'danger';
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Confirmación imperativa basada en promesa: `if (await confirm({...})) {...}`. */
export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>');
  return confirm;
}

/**
 * Monta un único diálogo (Radix, vía Modal) y resuelve la promesa de useConfirm
 * al confirmar/cancelar. Reemplaza los window.confirm nativos (sin tema, no
 * accesibles, bloquean el hilo). Se coloca una vez en AppProviders.
 */
export function ConfirmProvider({ children }: PropsWithChildren) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = useCallback((result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setOptions(null);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={options !== null}
        onClose={() => settle(false)}
        title={options?.title ?? ''}
        description={options?.description}
        width="sm"
      >
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => settle(false)}>
            {options?.cancelLabel ?? 'Cancelar'}
          </Button>
          <Button
            variant={options?.tone === 'danger' ? 'danger' : 'primary'}
            size="sm"
            onClick={() => settle(true)}
          >
            {options?.confirmLabel ?? 'Confirmar'}
          </Button>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}
