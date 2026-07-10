import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PasswordField } from './PasswordField';

const campo = (): HTMLInputElement => screen.getByLabelText('Contraseña');

describe('PasswordField', () => {
  it('empieza oculto', () => {
    render(<PasswordField label="Contraseña" />);
    expect(campo().getAttribute('type')).toBe('password');
  });

  it('el ojo alterna entre ver y ocultar', () => {
    render(<PasswordField label="Contraseña" />);
    const ojo = screen.getByRole('button', { name: 'Mostrar contraseña' });

    fireEvent.click(ojo);
    expect(campo().getAttribute('type')).toBe('text');
    expect(screen.getByRole('button', { name: 'Ocultar contraseña' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar contraseña' }));
    expect(campo().getAttribute('type')).toBe('password');
  });

  it('el ojo no roba el tab al campo', () => {
    render(<PasswordField label="Contraseña" />);
    expect(screen.getByRole('button').getAttribute('tabindex')).toBe('-1');
  });

  it('marca el error de forma accesible', () => {
    render(<PasswordField label="Contraseña" error="Mínimo 8 caracteres" />);
    expect(campo().getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText('Mínimo 8 caracteres')).toBeTruthy();
  });
});
