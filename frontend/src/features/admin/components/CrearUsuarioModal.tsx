import { useState } from 'react';
import type { Role } from '@core/auth';
import { Button, Combobox, Modal, ModalFooter, TextField } from '@shared/ui';
import { useUsuarioMutations } from '../api/useUsuarios';
import { ROLES } from '../model/usuario';

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
        <Combobox
          label="Rol"
          clearable={false}
          options={ROLES}
          value={role}
          onChange={(r) => r && setRole(r as Role)}
        />
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
