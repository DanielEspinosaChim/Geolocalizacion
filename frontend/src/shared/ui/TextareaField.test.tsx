import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TextareaField } from './TextareaField';

const LINEA = 20;

/**
 * jsdom no maqueta, así que `scrollHeight` siempre es 0. Se simula: una línea
 * por cada salto de línea del valor, que es lo que el componente mide.
 */
beforeEach(() => {
  vi.spyOn(window, 'getComputedStyle').mockReturnValue({
    lineHeight: `${LINEA}px`,
  } as CSSStyleDeclaration);

  Object.defineProperty(HTMLTextAreaElement.prototype, 'scrollHeight', {
    configurable: true,
    get(this: HTMLTextAreaElement) {
      return (this.value.split('\n').length || 1) * LINEA;
    },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(HTMLTextAreaElement.prototype, 'scrollHeight');
});

function Controlado({ maxRows }: { maxRows?: number }) {
  const [v, setV] = useState('');
  return (
    <TextareaField label="Descripción" maxRows={maxRows} value={v} onChange={(e) => setV(e.target.value)} />
  );
}

const areaDe = (): HTMLTextAreaElement => screen.getByLabelText('Descripción');

describe('TextareaField', () => {
  it('no deja arrastrar la agarradera de tamaño', () => {
    render(<TextareaField label="Descripción" />);
    expect(areaDe().className).toContain('resize-none');
  });

  it('crece al escribir más líneas', () => {
    render(<Controlado />);
    const area = areaDe();
    const inicial = parseFloat(area.style.height);

    fireEvent.change(area, { target: { value: 'a\nb\nc\nd\ne' } });
    expect(parseFloat(area.style.height)).toBeGreaterThan(inicial);
  });

  it('se encoge al borrar texto', () => {
    render(<Controlado />);
    const area = areaDe();

    fireEvent.change(area, { target: { value: 'a\nb\nc\nd\ne\nf' } });
    const crecido = parseFloat(area.style.height);
    fireEvent.change(area, { target: { value: 'a' } });

    // Sin reiniciar la altura a `auto` antes de medir, `scrollHeight` no baja
    // y el campo se quedaría grande para siempre.
    expect(parseFloat(area.style.height)).toBeLessThan(crecido);
  });

  it('deja de crecer en `maxRows` y entonces scrollea', () => {
    render(<Controlado maxRows={4} />);
    const area = areaDe();

    fireEvent.change(area, { target: { value: 'a\nb\nc\nd\ne\nf\ng\nh' } });
    expect(parseFloat(area.style.height)).toBe(LINEA * 4);
    expect(area.style.overflowY).toBe('auto');
  });

  it('mientras cabe, no muestra scroll propio', () => {
    render(<Controlado maxRows={10} />);
    fireEvent.change(areaDe(), { target: { value: 'a\nb' } });
    expect(areaDe().style.overflowY).toBe('hidden');
  });

  it('propaga el cambio al consumidor', () => {
    const onChange = vi.fn();
    render(<TextareaField label="Descripción" value="" onChange={onChange} />);
    fireEvent.change(areaDe(), { target: { value: 'hola' } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
