/**
 * ÚNICA fuente de verdad de los tamaños de modal/diálogo.
 * Cualquier superficie modal (Modal, ConfirmDialog, CameraModal…) toma su
 * ancho de aquí: agregar o ajustar un tamaño se hace SOLO en este archivo.
 */
export const MODAL_SIZES = {
  sm: 'max-w-sm', // confirmaciones, avisos cortos
  md: 'max-w-lg', // formularios de una columna (default)
  lg: 'max-w-2xl', // formularios anchos, tablas pequeñas
  xl: 'max-w-4xl', // editores, vistas maestro-detalle
  full: 'max-w-[min(96vw,80rem)]', // casi pantalla completa (visores, cámara)
} as const;

export type ModalSize = keyof typeof MODAL_SIZES;
