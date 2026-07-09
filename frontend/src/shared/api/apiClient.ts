import { ApiError, http } from '@core/api';

/**
 * Fachada tipada sobre el cliente HTTP autenticado de `@core/api` (axios).
 * NO usa fetch: hereda los interceptores (token fresco de Firebase, normalización
 * a `ApiError`, logout ante 401, aviso ante 403, App Check). Da a las features
 * llamadas terser y tipadas: `apiClient.get<Campana[]>('/campanas')`.
 */
export interface RequestOptions {
  /** Query string (?a=1&b=2). */
  params?: Record<string, unknown>;
  /** Señal de aborto — enlaza con el `signal` de React Query. */
  signal?: AbortSignal;
  /** Headers extra para esta petición. */
  headers?: Record<string, string>;
}

export class NotModifiedError extends Error {
  constructor() {
    super('Not Modified');
    this.name = 'NotModifiedError';
  }
}

const etagCache = new Map<string, string>();

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

async function request<T>(
  method: Method,
  path: string,
  data?: unknown,
  options?: RequestOptions,
): Promise<T> {
  const isGet = method === 'GET';
  const reqHeaders = { ...options?.headers };

  // 1. Inyectar ETag guardado para esta ruta
  if (isGet && etagCache.has(path)) {
    reqHeaders['If-None-Match'] = etagCache.get(path)!;
  }

  try {
    const res = await http.request<T>({
      method,
      url: path,
      data,
      params: options?.params,
      signal: options?.signal,
      headers: reqHeaders,
    });

    // 2. Guardar ETag si el servidor lo envía
    const etag: unknown = res.headers?.etag;
    if (isGet && typeof etag === 'string') {
      etagCache.set(path, etag);
    }

    return res.data;
  } catch (error) {
    // 3. Atrapar 304 Not Modified normalizado por @core/api/http.ts (ApiError)
    if (error instanceof ApiError && error.status === 304) {
      throw new NotModifiedError();
    }
    throw error;
  }
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions): Promise<T> =>
    request<T>('GET', path, undefined, options),
  post: <T>(path: string, data: unknown, options?: RequestOptions): Promise<T> =>
    request<T>('POST', path, data, options),
  patch: <T>(path: string, data: unknown, options?: RequestOptions): Promise<T> =>
    request<T>('PATCH', path, data, options),
  put: <T>(path: string, data: unknown, options?: RequestOptions): Promise<T> =>
    request<T>('PUT', path, data, options),
  postForm: <T>(path: string, formData: FormData, options?: RequestOptions): Promise<T> =>
    request<T>('POST', path, formData, options),
  patchForm: <T>(path: string, formData: FormData, options?: RequestOptions): Promise<T> =>
    request<T>('PATCH', path, formData, options),
  // DELETE no fuerza `allowEmptyResponse`: axios tolera body vacío (204) y también
  // devuelve el recurso si el backend responde con cuerpo (200 + JSON).
  delete: <T>(path: string, options?: RequestOptions): Promise<T> =>
    request<T>('DELETE', path, undefined, options),
  deleteWithBody: <T>(path: string, data: unknown, options?: RequestOptions): Promise<T> =>
    request<T>('DELETE', path, data, options),
};
