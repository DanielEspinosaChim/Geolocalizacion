import { describe, expect, it } from 'vitest';
import { formatearTiempo } from '@shared/lib/format';
import { MAX_PUNTOS_RUTA, togglePunto } from './ruta';

describe('togglePunto', () => {
  it('agrega, quita y respeta el tope de 20', () => {
    let sel: ReadonlySet<string> = new Set<string>();
    sel = togglePunto(sel, 'a');
    expect(sel.has('a')).toBe(true);
    sel = togglePunto(sel, 'a');
    expect(sel.has('a')).toBe(false);

    const lleno = new Set(Array.from({ length: MAX_PUNTOS_RUTA }, (_, i) => `p${i}`));
    const resultado = togglePunto(lleno, 'extra');
    expect(resultado.size).toBe(MAX_PUNTOS_RUTA);
    expect(resultado.has('extra')).toBe(false);
  });
});

describe('formatearTiempo', () => {
  it('formatea minutos y horas', () => {
    expect(formatearTiempo(45)).toBe('45 min');
    expect(formatearTiempo(135)).toBe('2h 15 min');
  });
});
