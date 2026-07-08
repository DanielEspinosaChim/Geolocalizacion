import { z } from 'zod';

/**
 * Config de entorno validada al arrancar (fail-fast, no en runtime profundo).
 * Fase 1 añade: VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, etc.
 */
const envSchema = z.object({
  VITE_API_BASE_URL: z.string().default('/api'),
});

const parsed = envSchema.safeParse(import.meta.env);
if (!parsed.success) {
  throw new Error(`Variables de entorno inválidas:\n${parsed.error.message}`);
}

export const env = {
  API_BASE_URL: parsed.data.VITE_API_BASE_URL,
} as const;
