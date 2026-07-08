import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { env } from '@core/config';

let app: FirebaseApp | undefined;

/** Init perezoso: los tests y el build no arrancan Firebase sin necesitarlo. */
export function getFirebaseAuth(): Auth {
  app ??= initializeApp(env.FIREBASE);
  return getAuth(app);
}
