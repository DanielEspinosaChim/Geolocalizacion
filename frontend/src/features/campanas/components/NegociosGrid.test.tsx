import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { NegocioCampana } from '../model/campana';
import { NegociosGrid } from './NegociosGrid';

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
    lat: null,
    lng: null,
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

function renderGrid(negocios: NegocioCampana[], onRegistrar = vi.fn()) {
  const qc = new QueryClient();
  render(
    <QueryClientProvider client={qc}>
      <NegociosGrid campanaId="1" negocios={negocios} onRegistrar={onRegistrar} />
    </QueryClientProvider>,
  );
  return onRegistrar;
}

describe('NegociosGrid', () => {
  it('sin negocios muestra el estado vacío', () => {
    renderGrid([]);
    expect(screen.getByText(/Sin negocios aún/)).toBeTruthy();
  });

  it('cada negocio es una tarjeta con casilla, fecha y acción', () => {
    renderGrid([negocio(), negocio({ negocio_id: 'b', nombre: 'HI-TEC' })]);
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
    expect(screen.getByText('VALPESA')).toBeTruthy();
    expect(screen.getByText('HI-TEC')).toBeTruthy();
  });

  it('el botón dice «Registrar» si no se ha visitado y «Editar» si ya sí', () => {
    renderGrid([negocio({ completado: false })]);
    expect(screen.getByRole('button', { name: /Registrar/ })).toBeTruthy();
  });

  it('un negocio visitado muestra el botón «Editar» y el badge', () => {
    renderGrid([negocio({ completado: true })]);
    expect(screen.getByRole('button', { name: /Editar/ })).toBeTruthy();
    expect(screen.getByText('Visitado')).toBeTruthy();
  });

  it('pulsar la acción pide registrar ese negocio', () => {
    const onRegistrar = renderGrid([negocio()]);
    fireEvent.click(screen.getByRole('button', { name: /Registrar/ }));
    expect(onRegistrar).toHaveBeenCalledTimes(1);
  });

  it('la foto rota no rompe el layout: alt describe la visita', () => {
    renderGrid([negocio({ foto_visita_url: '/uploads/x.jpg' })]);
    expect(screen.getByAltText('Foto de la visita a VALPESA')).toBeTruthy();
  });
});
