import { redirect } from 'react-router';
import { getSessionUser, type Role } from '@core/auth';

/**
 * Guardias de ruta (UX). La autorización REAL la re-valida el backend en cada
 * endpoint /api/ — estos loaders solo evitan renderizar vistas sin permiso.
 */
export async function requireAuth() {
  const user = await getSessionUser();
  if (!user) throw redirect('/login');
  return user;
}

export function requireRole(role: Role) {
  return async () => {
    const user = await requireAuth();
    if (user.role !== role) throw redirect('/');
    return user;
  };
}

/** /login con sesión activa → directo a la app. */
export async function redirectIfAuthed() {
  const user = await getSessionUser();
  if (user) throw redirect('/');
  return null;
}

/** El técnico aterriza en Campañas (paridad con el legacy). */
export async function indexLoader() {
  const user = await requireAuth();
  if (user.role === 'tecnico') throw redirect('/campanas');
  return user;
}
