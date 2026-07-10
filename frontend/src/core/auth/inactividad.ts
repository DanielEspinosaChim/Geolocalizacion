/** Minutos sin interacción tras los que se cierra la sesión. */
export const MINUTOS_INACTIVIDAD = 30;
export const INACTIVIDAD_MS = MINUTOS_INACTIVIDAD * 60_000;

/** Cada cuánto se comprueba si venció el plazo. */
const SONDEO_MS = 30_000;

const EVENTOS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

/**
 * Cierra la sesión tras `ms` sin interacción del usuario.
 *
 * Compara marcas de tiempo en un sondeo periódico en lugar de fiarse de un solo
 * `setTimeout` largo: los temporizadores se estrangulan en pestañas en segundo
 * plano y se congelan si el equipo se suspende, así que uno de 30 minutos no
 * dispararía cuando toca. `Date.now()` sí refleja el tiempo real transcurrido.
 *
 * Devuelve la función para dejar de vigilar.
 */
export function vigilarInactividad(alExpirar: () => void, ms: number = INACTIVIDAD_MS): () => void {
  let ultimaActividad = Date.now();
  let expirado = false;

  const registrarActividad = () => {
    ultimaActividad = Date.now();
  };

  const comprobar = () => {
    if (expirado || Date.now() - ultimaActividad < ms) return;
    expirado = true; // el plazo vence una sola vez
    detener();
    alExpirar();
  };

  const intervalo = setInterval(comprobar, SONDEO_MS);
  // Al volver a la pestaña se comprueba de inmediato: si el equipo estuvo
  // suspendido, el sondeo no corrió y el plazo puede llevar rato vencido.
  document.addEventListener('visibilitychange', comprobar);
  EVENTOS.forEach((e) => window.addEventListener(e, registrarActividad, { passive: true }));

  function detener() {
    clearInterval(intervalo);
    document.removeEventListener('visibilitychange', comprobar);
    EVENTOS.forEach((e) => window.removeEventListener(e, registrarActividad));
  }

  return detener;
}
