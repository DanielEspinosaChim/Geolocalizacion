import { initializeApp, type FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { getAuth, type Auth } from 'firebase/auth';
import { env } from '@core/config';

let app: FirebaseApp | undefined;

/** Init perezoso: los tests y el build no arrancan Firebase sin necesitarlo. */
export function getFirebaseAuth(): Auth {
  if (!app) {
    app = initializeApp(env.FIREBASE);
    activarAppCheck(app);
  }
  return getAuth(app);
}

/**
 * App Check (reCAPTCHA v3): protege los endpoints del proyecto contra abuso.
 * Solo se activa si hay clave configurada; requiere registrar el sitio en la
 * consola de Firebase y aplicar App Check en el backend (docs/PENDIENTES.md).
 */
function activarAppCheck(firebaseApp: FirebaseApp): void {
  if (!env.RECAPTCHA_SITE_KEY) return;
  initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaV3Provider(env.RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
}
