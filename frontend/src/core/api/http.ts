import axios, { AxiosError } from 'axios';
import { getFreshToken, signOutAndRedirect } from '@core/auth';
import { env } from '@core/config';

/** Error normalizado: toda la app maneja ApiError, nunca AxiosError crudo. */
export class ApiError extends Error {
  constructor(
    public readonly status: number | undefined,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Cliente HTTP único de la aplicación. Prohibido usar fetch directo (ESLint). */
export const http = axios.create({
  baseURL: env.API_BASE_URL,
  timeout: 20_000,
});

// Request: ID token SIEMPRE fresco (Firebase auto-refresca al expirar).
// Sustituye al monkey-patch de fetch del legacy, que congelaba el token 60 min.
http.interceptors.request.use(async (config) => {
  const token = await getFreshToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response: normaliza el error y cierra sesión ante 401/403 (logout-on-401).
http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<{ detail?: string; message?: string }>) => {
    const status = error.response?.status;
    if (status === 401 || status === 403) await signOutAndRedirect();
    const message =
      error.response?.data?.detail ?? error.response?.data?.message ?? error.message;
    return Promise.reject(new ApiError(status, message));
  },
);
