import { renderHook } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { useAnclaFlotante } from './useAnclaFlotante';

const ALTO_VENTANA = 800;

/** Simula un disparador con su borde superior en `top` y 40px de alto. */
function anclaEn(top: number) {
  const el = {
    getBoundingClientRect: () => ({ top, bottom: top + 40, left: 100, width: 240 }),
  } as HTMLElement;
  return renderHook(() => useAnclaFlotante({ current: el }, true)).result.current;
}

describe('useAnclaFlotante', () => {
  beforeAll(() => {
    vi.stubGlobal('innerHeight', ALTO_VENTANA);
  });

  it('se abre hacia abajo cuando hay sitio de sobra', () => {
    const a = anclaEn(100);
    expect(a?.arriba).toBe(false);
    expect(a?.top).toBe(148); // bottom (140) + margen (8)
  });

  it('se abre hacia arriba si abajo no cabe y arriba hay más hueco', () => {
    // Disparador casi pegado al fondo: quedan 60px debajo y 700 encima.
    const a = anclaEn(700);
    expect(a?.arriba).toBe(true);
  });

  it('sigue abriéndose hacia abajo si arriba tampoco cabe (pantalla corta)', () => {
    // 20px encima, 60px debajo: ninguno llega al mínimo, gana el que tiene más.
    const a = anclaEn(20);
    expect(a?.arriba).toBe(false);
  });

  it('acota la altura al espacio libre, con un mínimo utilizable', () => {
    const holgado = anclaEn(100);
    expect(holgado?.maxHeight).toBe(320); // tope máximo

    const apretado = anclaEn(600);
    expect(apretado?.maxHeight).toBeLessThanOrEqual(320);
    expect(apretado?.maxHeight).toBeGreaterThanOrEqual(160); // mínimo utilizable
  });

  it('copia el ancho del disparador para que el desplegable no baile', () => {
    expect(anclaEn(100)?.width).toBe(240);
    expect(anclaEn(100)?.left).toBe(100);
  });

  it('no calcula nada mientras está cerrado', () => {
    const el = { getBoundingClientRect: () => ({ top: 0, bottom: 40, left: 0, width: 100 }) };
    const { result } = renderHook(() => useAnclaFlotante({ current: el as HTMLElement }, false));
    expect(result.current).toBeNull();
  });
});
