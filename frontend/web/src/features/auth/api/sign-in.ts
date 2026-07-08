import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { getFirebaseAuth } from '@core/auth';

/** Mensajes en español para los códigos de error de Firebase Auth. */
const ERROR_MESSAGES: Record<string, string> = {
  'auth/user-not-found': 'Usuario no encontrado',
  'auth/wrong-password': 'Contraseña incorrecta',
  'auth/invalid-email': 'Correo inválido',
  'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos.',
  'auth/invalid-credential': 'Correo o contraseña incorrectos',
  'auth/popup-closed-by-user': 'Cerraste la ventana de Google',
  'auth/popup-blocked': 'Popup bloqueado — permite popups para este sitio',
  'auth/network-request-failed': 'Sin conexión. Revisa tu internet.',
};

/** Código silencioso: el usuario re-abrió el popup, no es un error real. */
const SILENT_CODES = new Set(['auth/cancelled-popup-request']);

export class SignInError extends Error {}

function translate(error: unknown): SignInError | null {
  const code = (error as { code?: string }).code ?? '';
  if (SILENT_CODES.has(code)) return null;
  const fallback = error instanceof Error ? error.message : 'Error al iniciar sesión';
  return new SignInError(ERROR_MESSAGES[code] ?? fallback);
}

export async function signInWithEmail({ email, password }: { email: string; password: string }) {
  try {
    await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  } catch (error) {
    const translated = translate(error);
    if (translated) throw translated;
  }
}

export async function signInWithGoogle() {
  try {
    await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
  } catch (error) {
    const translated = translate(error);
    if (translated) throw translated;
  }
}
