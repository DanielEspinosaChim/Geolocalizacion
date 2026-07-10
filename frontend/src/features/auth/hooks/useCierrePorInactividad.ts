import { useEffect } from 'react';
import { MINUTOS_INACTIVIDAD, signOutAndRedirect, vigilarInactividad } from '@core/auth';
import { toast } from '@shared/ui';

/**
 * Cierra la sesión tras 30 minutos sin actividad y avisa del motivo.
 *
 * Firebase mantiene la sesión indefinidamente y renueva el token solo, así que
 * sin esto nadie sale nunca: un equipo desatendido queda abierto para siempre.
 * Se monta una vez en `AppShell`, la única zona autenticada.
 */
export function useCierrePorInactividad(activo: boolean): void {
  useEffect(() => {
    if (!activo) return;
    return vigilarInactividad(() => {
      toast.error(`Sesión cerrada tras ${MINUTOS_INACTIVIDAD} minutos de inactividad.`);
      void signOutAndRedirect();
    });
  }, [activo]);
}
