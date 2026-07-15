import { useConfirm } from '@shared/ui';
import { useCampanaMutations } from './useCampanaMutations';

/**
 * Acciones de estado de una campaña que requieren confirmación (finalizar,
 * reactivar, eliminar). Se extraen del componente para mantenerlo por debajo
 * del límite de líneas y reunir en un sitio el patrón confirm → mutación.
 */
export function useAccionesCampana(campanaId: string, onHecho: () => void) {
  const confirm = useConfirm();
  const { cambiarStatus, eliminar } = useCampanaMutations(campanaId);

  async function finalizar() {
    const ok = await confirm({
      title: 'Finalizar campaña',
      description: '¿Marcar esta campaña como finalizada?',
      confirmLabel: 'Finalizar',
    });
    if (ok) cambiarStatus.mutate('cerrada', { onSuccess: onHecho });
  }

  /** Una campaña finalizada puede volver a activa (paridad con el legacy). */
  async function reactivar() {
    const ok = await confirm({
      title: 'Reactivar campaña',
      description: '¿Volver a poner esta campaña como activa?',
      confirmLabel: 'Reactivar',
    });
    if (ok) cambiarStatus.mutate('activa');
  }

  async function borrar() {
    const ok = await confirm({
      title: 'Eliminar campaña',
      description: 'Se eliminará permanentemente. Esta acción no se puede deshacer.',
      tone: 'danger',
      confirmLabel: 'Eliminar',
    });
    if (ok) eliminar.mutate(undefined, { onSuccess: onHecho });
  }

  return { finalizar, reactivar, borrar };
}
