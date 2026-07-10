import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Alert, Button, Modal, ModalFooter, PasswordField } from '@shared/ui';
import { useCambiarPassword } from '../api/useCambiarPassword';
import { passwordSchema, type PasswordInput } from '../model/usuario';

export function CambiarPasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const cambiar = useCambiarPassword();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordInput>({ resolver: zodResolver(passwordSchema) });

  function submit(data: PasswordInput) {
    setError(null);
    cambiar.mutate(
      { actual: data.actual, nueva: data.nueva },
      {
        onSuccess: () => {
          reset();
          onClose();
        },
        onError: (e) => setError(e.message),
      },
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Cambiar contraseña" width="sm">
      <form onSubmit={(e) => void handleSubmit(submit)(e)} className="grid gap-3">
        {error ? <Alert>{error}</Alert> : null}
        <PasswordField label="Contraseña actual" autoComplete="current-password" error={errors.actual?.message} {...register('actual')} />
        <PasswordField label="Nueva contraseña" autoComplete="new-password" error={errors.nueva?.message} {...register('nueva')} />
        <PasswordField label="Confirmar nueva" autoComplete="new-password" error={errors.confirmar?.message} {...register('confirmar')} />
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={cambiar.isPending}>
            Actualizar contraseña
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
