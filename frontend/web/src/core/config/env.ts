import { z } from 'zod';

/**
 * Config de entorno validada al arrancar (fail-fast, no en runtime profundo).
 * La config de Firebase es PÚBLICA por diseño (viaja al navegador); no es un
 * secreto. Los defaults son el proyecto canaco-info; se sobreescriben por
 * entorno con variables VITE_* (.env.local / CI).
 */
const envSchema = z.object({
  VITE_API_BASE_URL: z.string().default('/api'),

  VITE_FIREBASE_API_KEY: z.string().default('AIzaSyBGWOAInmciLek9_GQx7wxgjFk5NVXSGU4'),
  VITE_FIREBASE_AUTH_DOMAIN: z.string().default('canaco-info.firebaseapp.com'),
  VITE_FIREBASE_PROJECT_ID: z.string().default('canaco-info'),
  VITE_FIREBASE_STORAGE_BUCKET: z.string().default('canaco-info.firebasestorage.app'),
  VITE_FIREBASE_MESSAGING_SENDER_ID: z.string().default('1065227431213'),
  VITE_FIREBASE_APP_ID: z.string().default('1:1065227431213:web:1ecbb5c2f197461ed9f7a4'),
});

const parsed = envSchema.safeParse(import.meta.env);
if (!parsed.success) {
  throw new Error(`Variables de entorno inválidas:\n${parsed.error.message}`);
}

export const env = {
  API_BASE_URL: parsed.data.VITE_API_BASE_URL,
  FIREBASE: {
    apiKey: parsed.data.VITE_FIREBASE_API_KEY,
    authDomain: parsed.data.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: parsed.data.VITE_FIREBASE_PROJECT_ID,
    storageBucket: parsed.data.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: parsed.data.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: parsed.data.VITE_FIREBASE_APP_ID,
  },
} as const;
