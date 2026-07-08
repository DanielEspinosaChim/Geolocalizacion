import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Role } from '@core/auth';
import { http } from '@core/api';
import { toast } from '@shared/ui';
import { usuarioListSchema, type NuevoUsuario } from '../model/usuario';

const usuariosKey = ['admin', 'usuarios'] as const;

export function useUsuarios() {
  return useQuery({
    queryKey: usuariosKey,
    queryFn: async ({ signal }) => {
      const { data } = await http.get<unknown>('/admin/usuarios', { signal });
      return usuarioListSchema.parse(data);
    },
    staleTime: 30_000,
  });
}

/** Mutaciones de usuarios (crear, rol, habilitar/deshabilitar, eliminar). */
export function useUsuarioMutations() {
  const queryClient = useQueryClient();
  const invalidar = () => queryClient.invalidateQueries({ queryKey: usuariosKey });

  const crear = useMutation({
    mutationFn: async (body: NuevoUsuario) => {
      await http.post('/admin/usuarios', body);
    },
    onSuccess: () => {
      toast.success('Usuario creado');
      void invalidar();
    },
    onError: (e) => toast.error(e.message || 'No se pudo crear el usuario'),
  });

  const cambiarRole = useMutation({
    mutationFn: async ({ uid, role }: { uid: string; role: Role }) => {
      await http.patch(`/admin/usuarios/${uid}`, { role });
    },
    onSuccess: () => {
      toast.success('Rol actualizado — aplica en el próximo inicio de sesión');
      void invalidar();
    },
    onError: (e) => toast.error(e.message || 'No se pudo cambiar el rol'),
  });

  const toggle = useMutation({
    mutationFn: async ({ uid, disabled }: { uid: string; disabled: boolean }) => {
      await http.patch(`/admin/usuarios/${uid}`, { disabled });
    },
    onSuccess: invalidar,
    onError: (e) => toast.error(e.message || 'No se pudo actualizar'),
  });

  const eliminar = useMutation({
    mutationFn: async (uid: string) => {
      await http.delete(`/admin/usuarios/${uid}`);
    },
    onSuccess: () => {
      toast.success('Usuario eliminado');
      void invalidar();
    },
    onError: (e) => toast.error(e.message || 'No se pudo eliminar'),
  });

  return { crear, cambiarRole, toggle, eliminar };
}
