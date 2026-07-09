import { http } from '@core/api';

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

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

async function request<T>(
  method: Method,
  path: string,
  data?: unknown,
  options?: RequestOptions,
): Promise<T> {
  // axios detecta FormData y pone multipart/form-data con boundary por sí solo.
  const res = await http.request<T>({
    method,
    url: path,
    data,
    params: options?.params,
    signal: options?.signal,
    headers: options?.headers,
  });
  return res.data;
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
