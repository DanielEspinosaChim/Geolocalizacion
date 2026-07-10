import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INACTIVIDAD_MS, vigilarInactividad } from './inactividad';

const UN_MINUTO = 60_000;

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('vigilarInactividad', () => {
  it('no cierra la sesión antes de cumplirse el plazo', () => {
    const alExpirar = vi.fn();
    vigilarInactividad(alExpirar);
    vi.advanceTimersByTime(INACTIVIDAD_MS - UN_MINUTO);
    expect(alExpirar).not.toHaveBeenCalled();
  });

  it('cierra la sesión al agotarse el plazo', () => {
    const alExpirar = vi.fn();
    vigilarInactividad(alExpirar);
    vi.advanceTimersByTime(INACTIVIDAD_MS);
    expect(alExpirar).toHaveBeenCalledTimes(1);
  });

  it('cualquier interacción reinicia la cuenta', () => {
    const alExpirar = vi.fn();
    vigilarInactividad(alExpirar);

    vi.advanceTimersByTime(INACTIVIDAD_MS - UN_MINUTO);
    window.dispatchEvent(new Event('keydown'));
    vi.advanceTimersByTime(INACTIVIDAD_MS - UN_MINUTO);
    expect(alExpirar).not.toHaveBeenCalled();

    vi.advanceTimersByTime(UN_MINUTO);
    expect(alExpirar).toHaveBeenCalledTimes(1);
  });

  it('expira una sola vez, aunque siga corriendo el reloj', () => {
    const alExpirar = vi.fn();
    vigilarInactividad(alExpirar);
    vi.advanceTimersByTime(INACTIVIDAD_MS * 5);
    expect(alExpirar).toHaveBeenCalledTimes(1);
  });

  it('detecta el vencimiento al volver a la pestaña tras suspender el equipo', () => {
    const alExpirar = vi.fn();
    vigilarInactividad(alExpirar);

    // Equipo suspendido: el reloj real avanza pero los temporizadores no corren.
    const ahora = Date.now();
    vi.setSystemTime(ahora + INACTIVIDAD_MS + UN_MINUTO);
    expect(alExpirar).not.toHaveBeenCalled();

    document.dispatchEvent(new Event('visibilitychange'));
    expect(alExpirar).toHaveBeenCalledTimes(1);
  });

  it('la función devuelta deja de vigilar', () => {
    const alExpirar = vi.fn();
    const detener = vigilarInactividad(alExpirar);
    detener();
    vi.advanceTimersByTime(INACTIVIDAD_MS * 2);
    expect(alExpirar).not.toHaveBeenCalled();
  });

  it('acepta un plazo propio', () => {
    const alExpirar = vi.fn();
    vigilarInactividad(alExpirar, UN_MINUTO);
    vi.advanceTimersByTime(UN_MINUTO);
    expect(alExpirar).toHaveBeenCalledTimes(1);
  });
});
