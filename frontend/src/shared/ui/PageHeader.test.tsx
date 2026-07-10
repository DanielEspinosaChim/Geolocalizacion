import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('el título es el h1 de la página', () => {
    render(<PageHeader title="Campañas" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Campañas' })).toBeTruthy();
  });

  it('omite antetítulo, bajada y acciones cuando no se pasan', () => {
    const { container } = render(<PageHeader title="Campañas" />);
    expect(container.querySelectorAll('p')).toHaveLength(0);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('muestra antetítulo y bajada cuando se pasan', () => {
    render(
      <PageHeader eyebrow="Panel de control" title="Administración" description="Usuarios y roles" />,
    );
    expect(screen.getByText('Panel de control')).toBeTruthy();
    expect(screen.getByText('Usuarios y roles')).toBeTruthy();
  });

  it('las acciones no quedan dentro del bloque del título', () => {
    render(<PageHeader title="Campañas" actions={<button type="button">Nueva</button>} />);
    const titulo = screen.getByRole('heading', { level: 1 });
    const accion = screen.getByRole('button', { name: 'Nueva' });
    expect(titulo.parentElement!.contains(accion)).toBe(false);
  });

  it('no reserva hueco de acciones si `actions` es null', () => {
    // Campañas pasa `null` cuando el usuario es técnico: no debe dejar un div vacío.
    const { container } = render(<PageHeader title="Mis campañas" actions={null} />);
    expect(container.querySelector('header')!.children).toHaveLength(1);
  });
});
