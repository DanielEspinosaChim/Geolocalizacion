import { useMutation } from '@tanstack/react-query';
import { changePassword } from '@core/auth';

const ERRORES: Record<string, string> = {
  'auth/wrong-password': 'Contraseña actual incorrecta',
  'auth/invalid-credential': 'Contraseña actual incorrecta',
  'auth/too-many-requests': 'Demasiados intentos, espera unos minutos',
};

export function useCambiarPassword() {
  return useMutation({
    mutationFn: async ({ actual, nueva }: { actual: string; nueva: string }) => {
      try {
        await changePassword(actual, nueva);
      } catch (e) {
        const code = (e as { code?: string }).code ?? '';
        throw new Error(ERRORES[code] ?? (e as Error).message);
      }
    },
  });
}
