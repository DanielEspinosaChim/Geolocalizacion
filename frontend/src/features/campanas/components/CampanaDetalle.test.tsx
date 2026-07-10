import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmProvider } from '@shared/ui';
import type { DetalleCampana, NegocioCampana } from '../model/campana';
import { campanasKeys } from '../api/keys';
import { CampanaDetalle } from './CampanaDetalle';

vi.mock('../api/useCampanaMutations', () => ({
  useCampanaMutations: () => ({
    cambiarStatus: { mutate: vi.fn() },
    eliminar: { mutate: vi.fn() },
  }),
}));
vi.mock('../api/useNegocioMutations', () => ({
  usePatchNegocio: () => ({ mutate: vi.fn(), isPending: false }),
}));

function negocio(over: Partial<NegocioCampana> = {}): NegocioCampana {
  return {
    negocio_id: 'a',
    nombre: 'VALPESA',
    tipo: 'informal',
    tipos: null,
    completado: false,
    notas: null,
    fecha_visita: null,
    lat: 20.9,
    lng: -89.6,
    colonia: null,
    direccion: null,
    visita_datos: null,
    plantilla_id: null,
    foto_visita_url: null,
    visita_lat: null,
    visita_lng: null,
    visita_distancia: null,
    visita_direccion: null,
    ...over,
  };
}

/** Deja a la vista un rastro visible de a dónde se navega y con qué state. */
function EspiaRuta() {
  const loc = useLocation();
  return <div data-testid="ruta">{`${loc.pathname}|${JSON.stringify(loc.state)}`}</div>;
}

function renderDetalle(negocios: NegocioCampana[]) {
  const qc = new QueryClient();
  const detalle: DetalleCampana = {
    campana: {
      id: '1',
      nombre: 'Test2',
      descripcion: null,
      colonia: 'CAUCEL',
      fecha_inicio: null,
      fecha_fin: null,
      status: 'activa',
      asignado_a: null,
      asignado_nombre: null,
      total_negocios: negocios.length,
      total_completados: 0,
      created_at: null,
    },
    negocios,
  };
  qc.setQueryData(campanasKeys.detail('1'), detalle);
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/campanas']}>
        <ConfirmProvider>
          <CampanaDetalle campanaId="1" esTecnico={false} onVolver={vi.fn()} />
        </ConfirmProvider>
        <EspiaRuta />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CampanaDetalle', () => {
  it('muestra las tres acciones: Ver ruta, Exportar reporte y Plantillas', () => {
    renderDetalle([negocio()]);
    expect(screen.getByRole('button', { name: /Ver ruta/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Exportar reporte/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Plantillas/ })).toBeTruthy();
  });

  it('«Ver ruta» navega a /rutas con los negocios de la campaña', () => {
    renderDetalle([negocio({ negocio_id: 'a' }), negocio({ negocio_id: 'b' })]);
    fireEvent.click(screen.getByRole('button', { name: /Ver ruta/ }));

    const rastro = screen.getByTestId('ruta').textContent ?? '';
    expect(rastro).toContain('/rutas');
    expect(rastro).toContain('"rutaCampana":["a","b"]');
  });

  it('no navega si no hay 2 negocios con ubicación', () => {
    renderDetalle([negocio({ lat: null, lng: null })]);
    fireEvent.click(screen.getByRole('button', { name: /Ver ruta/ }));
    // Se queda en /campanas; no se traza una ruta con menos de dos paradas.
    expect(screen.getByTestId('ruta').textContent).toContain('/campanas');
  });
});
