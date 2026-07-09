import { MutationCache, QueryClient } from '@tanstack/react-query';
// sonner (externo) en vez de @shared/ui: core no puede importar la capa shared.
import { toast } from 'sonner';
import { ApiError } from '@core/api';

/** Metadatos tipados por mutación para controlar el toast de error global. */
declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      /** Mensaje a mostrar si la mutación falla (si no, se usa el de ApiError). */
      errorMessage?: string;
      /** true = la mutación maneja su propio error; no dispares el toast global. */
      skipGlobalError?: boolean;
    };
  }
}

/** Mensaje legible para el usuario a partir de cualquier error. */
function mensajeDeError(error: unknown, personalizado?: string): string {
  if (error instanceof ApiError) {
    // ApiError sin status = fallo de red (timeout / sin conexión).
    if (error.status === undefined) return 'Sin conexión con el servidor. Revisa tu red.';
    return personalizado ?? error.message;
  }
  return personalizado ?? 'Ocurrió un error inesperado.';
}

export const queryClient = new QueryClient({
  /**
   * Toast de error para TODAS las mutaciones — elimina los ~35 `onError:
   * toast.error(...)` repetidos. Se salta si la mutación define su propio
   * onError (migración incremental) o pide `meta.skipGlobalError`.
   */
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      if (mutation.options.onError || mutation.meta?.skipGlobalError) return;
      toast.error(mensajeDeError(error, mutation.meta?.errorMessage));
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      // Reintenta solo errores transitorios (red o 5xx). Un 4xx (400/401/403/404)
      // es determinista: reintentarlo no cambia el resultado y retrasa el error.
      retry: (count, error) => {
        if (error instanceof ApiError && error.status && error.status < 500) return false;
        return count < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});
