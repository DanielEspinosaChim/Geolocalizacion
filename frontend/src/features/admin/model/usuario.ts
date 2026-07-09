import { z } from 'zod';
import type { Role } from '@core/auth';

export const usuarioSchema = z.object({
  uid: z.string(),
  email: z.string().catch('—'),
  nombre: z.string().catch(''),
  role: z.enum(['admin', 'tecnico']).catch('tecnico'),
  disabled: z.boolean().catch(false),
});
export const usuarioListSchema = z.array(usuarioSchema);
export type Usuario = z.infer<typeof usuarioSchema>;

/** Roles seleccionables. Única fuente: el alta de usuario y la tabla la comparten. */
export const ROLES: readonly { value: Role; label: string }[] = [
  { value: 'tecnico', label: 'Técnico' },
  { value: 'admin', label: 'Admin' },
];

export interface NuevoUsuario {
  email: string;
  password: string;
  nombre: string;
  role: Role;
}

export const passwordSchema = z
  .object({
    actual: z.string().min(1, 'Ingresa tu contraseña actual'),
    nueva: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmar: z.string(),
  })
  .refine((d) => d.nueva === d.confirmar, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmar'],
  });
export type PasswordInput = z.infer<typeof passwordSchema>;
