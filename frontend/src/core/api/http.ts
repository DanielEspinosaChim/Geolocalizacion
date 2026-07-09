import axios, { AxiosError } from 'axios';
// sonner (externo) en vez de @shared/ui: core no puede importar la capa shared
// (fronteras ESLint). El <Toaster> montado en AppProviders recibe estos toasts.
import { toast } from 'sonner';
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

// Response: normaliza el error y distingue 401 de 403.
//   401 = sesión inválida/expirada → logout + /login.
//   403 = sesión válida pero sin permiso para ESE recurso → conserva sesión,
//         avisa y devuelve al inicio (un técnico no debe perder su sesión por
//         tocar un endpoint de admin). El guard de ruta lo mantiene en su zona.
http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<{ detail?: string; message?: string }>) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.detail ?? error.response?.data?.message ?? error.message;
    if (status === 401) {
      await signOutAndRedirect();
    } else if (status === 403) {
      toast.error('No tienes permiso para esta acción.');
      if (window.location.pathname !== '/') window.location.assign('/');
    }
    return Promise.reject(new ApiError(status, message));
  },
);
