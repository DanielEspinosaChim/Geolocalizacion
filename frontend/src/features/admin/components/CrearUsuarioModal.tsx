import { useState } from 'react';
import type { Role } from '@core/auth';
import { Button, Modal, ModalFooter, SelectField, TextField } from '@shared/ui';
import { useUsuarioMutations } from '../api/useUsuarios';

export function CrearUsuarioModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [role, setRole] = useState<Role>('tecnico');
  const { crear } = useUsuarioMutations();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    crear.mutate(
      { email, password, nombre, role },
      {
        onSuccess: () => {
          setEmail('');
          setPassword('');
          setNombre('');
          setRole('tecnico');
          onClose();
        },
      },
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo usuario" width="sm">
      <form onSubmit={submit} className="grid gap-3">
        <TextField label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <TextField label="Correo" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <TextField label="Contraseña" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <SelectField label="Rol" value={role} onChange={(e) => setRole(e.target.value as Role)}>
          <option value="tecnico">Técnico</option>
          <option value="admin">Admin</option>
        </SelectField>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={crear.isPending} disabled={!email || !password}>
            Crear usuario
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
