import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DateField } from './DateField';

describe('DateField', () => {
  it('es un campo de fecha nativo', () => {
    render(<DateField label="Fecha de visita" />);
    expect(screen.getByLabelText('Fecha de visita').getAttribute('type')).toBe('date');
  });

  it('sin rótulo visible toma el nombre de `aria-label`', () => {
    const { container } = render(<DateField aria-label="Fecha de visita de VALPESA" />);
    // Un <label> vacío haría que el lector de pantalla anuncie un rótulo en blanco.
    expect(container.querySelector('label')).toBeNull();
    expect(screen.getByLabelText('Fecha de visita de VALPESA')).toBeTruthy();
  });

  it('size="sm" compacta el campo para celdas de tabla', () => {
    const { rerender } = render(<DateField aria-label="Fecha" />);
    expect(screen.getByLabelText('Fecha').className).toContain('py-2.5');

    rerender(<DateField aria-label="Fecha" size="sm" />);
    const campo = screen.getByLabelText('Fecha').className;
    expect(campo).toContain('py-1');
    expect(campo).not.toContain('py-2.5');
  });

  it('propaga el cambio de fecha', () => {
    const onChange = vi.fn();
    render(<DateField aria-label="Fecha" value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2026-07-08' } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('marca el error de forma accesible', () => {
    render(<DateField label="Fecha" error="Fecha inválida" />);
    const campo = screen.getByLabelText('Fecha');
    expect(campo.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText('Fecha inválida')).toBeTruthy();
  });
});
