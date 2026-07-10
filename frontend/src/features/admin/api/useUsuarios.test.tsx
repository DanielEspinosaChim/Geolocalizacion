import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUsuarioMutations } from './useUsuarios';

// vi.hoisted: `vi.mock` se eleva sobre los imports, así que la función espía
// debe existir antes que él. Sin esto, referenciar `patch` daría un error de
// inicialización.
const { patch } = vi.hoisted(() => ({
  patch: vi.fn<(url: string, body: unknown) => Promise<unknown>>(),
}));
vi.mock('@shared/api', () => ({ apiClient: { patch } }));
vi.mock('@shared/ui', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient();
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => patch.mockReset().mockResolvedValue({}));

describe('useUsuarioMutations — rutas de admin', () => {
  it('cambiar rol pega a /admin/usuarios/{uid}/role', async () => {
    const { result } = renderHook(() => useUsuarioMutations(), { wrapper });
    act(() => result.current.cambiarRole.mutate({ uid: 'u1', role: 'admin' }));
    // El bug era pegar a /admin/usuarios/u1 (sin sufijo) → 405.
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/admin/usuarios/u1/role', { role: 'admin' }));
  });

  it('habilitar/deshabilitar pega a /admin/usuarios/{uid}/disable', async () => {
    const { result } = renderHook(() => useUsuarioMutations(), { wrapper });
    act(() => result.current.toggle.mutate({ uid: 'u2', disabled: true }));
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith('/admin/usuarios/u2/disable', { disabled: true }),
    );
  });
});
