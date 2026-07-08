import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionUser } from '@core/auth';
import { indexLoader, requireAuth, requireRole } from './guards';

vi.mock('@core/auth', () => ({
  getSessionUser: vi.fn(),
}));

const { getSessionUser } = vi.mocked(await import('@core/auth'));

const admin: SessionUser = { uid: '1', email: 'a@canaco.mx', role: 'admin' };
const tecnico: SessionUser = { uid: '2', email: 't@canaco.mx', role: 'tecnico' };

async function expectRedirect(promise: Promise<unknown>, location: string) {
  try {
    await promise;
    expect.unreachable('debía lanzar redirect');
  } catch (thrown) {
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).headers.get('Location')).toBe(location);
  }
}

beforeEach(() => {
  getSessionUser.mockReset();
});

describe('requireAuth', () => {
  it('sin sesión → redirect /login', async () => {
    getSessionUser.mockResolvedValue(null);
    await expectRedirect(requireAuth(), '/login');
  });

  it('con sesión → devuelve el usuario', async () => {
    getSessionUser.mockResolvedValue(admin);
    await expect(requireAuth()).resolves.toEqual(admin);
  });
});

describe('requireRole(admin)', () => {
  it('técnico → redirect /', async () => {
    getSessionUser.mockResolvedValue(tecnico);
    await expectRedirect(requireRole('admin')(), '/');
  });

  it('admin → pasa', async () => {
    getSessionUser.mockResolvedValue(admin);
    await expect(requireRole('admin')()).resolves.toEqual(admin);
  });
});

describe('indexLoader', () => {
  it('técnico aterriza en /campanas', async () => {
    getSessionUser.mockResolvedValue(tecnico);
    await expectRedirect(indexLoader(), '/campanas');
  });
});
