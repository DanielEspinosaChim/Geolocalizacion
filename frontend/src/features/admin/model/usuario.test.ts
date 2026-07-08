import { describe, expect, it } from 'vitest';
import { passwordSchema, usuarioListSchema } from './usuario';

describe('usuarioListSchema', () => {
  it('rol desconocido cae a tecnico', () => {
    const [u] = usuarioListSchema.parse([{ uid: '1', email: 'a@b.mx', role: 'root' }]);
    expect(u.role).toBe('tecnico');
    expect(u.disabled).toBe(false);
  });
});

describe('passwordSchema', () => {
  it('exige mínimo 8 y coincidencia', () => {
    expect(passwordSchema.safeParse({ actual: 'x', nueva: 'corta', confirmar: 'corta' }).success).toBe(false);
    expect(passwordSchema.safeParse({ actual: 'x', nueva: 'largaocho', confirmar: 'otra' }).success).toBe(false);
    expect(
      passwordSchema.safeParse({ actual: 'x', nueva: 'largaocho', confirmar: 'largaocho' }).success,
    ).toBe(true);
  });
});
