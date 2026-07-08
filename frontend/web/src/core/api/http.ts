import axios, { AxiosError } from 'axios';
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

// TODO(Fase 1): interceptor de request → Authorization: Bearer <ID token fresco de Firebase>.
// TODO(Fase 1): en 401/403 → signOutAndRedirect() (logout-on-401).
http.interceptors.response.use(
  (res) => res,
  (error: AxiosError<{ detail?: string; message?: string }>) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.detail ?? error.response?.data?.message ?? error.message;
    return Promise.reject(new ApiError(status, message));
  },
);
