import {
  EmailAuthProvider,
  getIdTokenResult,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signOut,
  updatePassword,
  type User,
} from 'firebase/auth';
import { getFirebaseAuth } from './firebase';

export type Role = 'admin' | 'tecnico';

export interface SessionUser {
  uid: string;
  email: string | null;
  role: Role;
}

export interface SessionSnapshot {
  status: 'loading' | 'ready';
  user: SessionUser | null;
}

/* Estado de sesión a nivel módulo: una sola suscripción a Firebase,
   consumida por loaders (getSessionUser) y por React (subscribe/snapshot). */
let snapshot: SessionSnapshot = { status: 'loading', user: null };
const listeners = new Set<() => void>();
let readyPromise: Promise<void> | null = null;

async function toSessionUser(fbUser: User): Promise<SessionUser> {
  // Token cacheado primero; refresh solo si aún no trae el claim de rol
  // (caso: un admin acaba de asignarlo). El SDK renueva el token solo.
  let token = await getIdTokenResult(fbUser);
  if (!token.claims.role) token = await getIdTokenResult(fbUser, true);
  const role: Role = token.claims.role === 'admin' ? 'admin' : 'tecnico';
  return { uid: fbUser.uid, email: fbUser.email, role };
}

function ensureWatcher(): Promise<void> {
  if (readyPromise) return readyPromise;
  readyPromise = new Promise((resolve) => {
    onAuthStateChanged(getFirebaseAuth(), (fbUser) => {
      void (async () => {
        const user = fbUser ? await toSessionUser(fbUser) : null;
        snapshot = { status: 'ready', user };
        listeners.forEach((notify) => notify());
        resolve();
      })();
    });
  });
  return readyPromise;
}

/** Para loaders del router: espera a que Firebase resuelva la sesión inicial. */
export async function getSessionUser(): Promise<SessionUser | null> {
  await ensureWatcher();
  return snapshot.user;
}

/** ID token SIEMPRE fresco para cada request (el SDK auto-refresca al expirar). */
export async function getFreshToken(): Promise<string | null> {
  await ensureWatcher();
  const fbUser = getFirebaseAuth().currentUser;
  return fbUser ? fbUser.getIdToken() : null;
}

/* Para useSyncExternalStore (hook useSession en @features/auth). */
export function subscribeSession(notify: () => void): () => void {
  void ensureWatcher();
  listeners.add(notify);
  return () => listeners.delete(notify);
}

export function getSessionSnapshot(): SessionSnapshot {
  return snapshot;
}

export async function signOutUser(): Promise<void> {
  await signOut(getFirebaseAuth());
}

/** Cambia la contraseña del usuario actual, reautenticando con la actual. */
export async function changePassword(actual: string, nueva: string): Promise<void> {
  const user = getFirebaseAuth().currentUser;
  if (!user?.email) throw new Error('No hay sesión activa');
  const credential = EmailAuthProvider.credential(user.email, actual);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, nueva);
}

/** Usado por el interceptor HTTP ante 401/403: sesión inválida → login. */
export async function signOutAndRedirect(): Promise<void> {
  await signOutUser();
  if (window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
}
