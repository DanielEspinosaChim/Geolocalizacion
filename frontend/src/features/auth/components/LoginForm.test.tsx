import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { LoginForm } from './LoginForm';

vi.mock('../api/sign-in', () => ({
  signInWithEmail: vi.fn().mockResolvedValue(undefined),
  signInWithGoogle: vi.fn().mockResolvedValue(undefined),
}));

const { signInWithEmail } = vi.mocked(await import('../api/sign-in'));

function renderForm() {
  return render(
    <MemoryRouter>
      <LoginForm />
    </MemoryRouter>,
  );
}

describe('LoginForm', () => {
  it('valida campos vacíos sin llamar a la API', async () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));
    expect(await screen.findByText('Ingresa tu correo')).toBeDefined();
    expect(await screen.findByText('Ingresa tu contraseña')).toBeDefined();
    expect(signInWithEmail).not.toHaveBeenCalled();
  });

  it('con datos válidos llama a signInWithEmail', async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText('Correo'), {
      target: { value: 'usuario@canaco.mx' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'secreta123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));
    await vi.waitFor(() => {
      expect(signInWithEmail).toHaveBeenCalledWith({
        email: 'usuario@canaco.mx',
        password: 'secreta123',
      });
    });
  });
});
