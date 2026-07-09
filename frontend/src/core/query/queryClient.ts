import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@core/api';

export const queryClient = new QueryClient({
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
