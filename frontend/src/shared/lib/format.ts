/** Número con separadores de miles en formato es-MX (ej. 12345 → "12,345"). */
export function formatNumero(n: number): string {
  return n.toLocaleString('es-MX');
}

/** Minutos → "Xh Y min" (o "Y min" si es menos de una hora). */
export function formatearTiempo(tiempoMin: number): string {
  const horas = Math.floor(tiempoMin / 60);
  const mins = Math.round(tiempoMin % 60);
  return horas > 0 ? `${horas}h ${mins} min` : `${tiempoMin} min`;
}
