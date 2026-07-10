import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SIN_FILTROS } from '../model/filtros';
import type { Candidato } from '../model/candidato';
import { PanelLateral } from './PanelLateral';

// ColoniaSelect consulta /api/colonias; aquí solo importa el layout del panel.
vi.mock('@features/colonias-zonas', () => ({
  ColoniaSelect: () => <select aria-label="Colonia" />,
}));

const CANDIDATOS: Candidato[] = [
  { place_id: 'a', nombre: 'YULINEY', lat: 20.9, lng: -89.6, tipos: 'restaurant', tipo: 'informal' },
  { place_id: 'b', nombre: 'VALPESA', lat: 20.9, lng: -89.6, tipos: 'store', tipo: 'formal' },
];

function renderPanel() {
  return render(
    <PanelLateral
      visible
      filtros={SIN_FILTROS}
      onFiltros={vi.fn()}
      filtrados={CANDIDATOS}
      isPending={false}
      seleccionadoId={null}
      onSelect={vi.fn()}
    />,
  );
}

/** ¿Está el nodo dentro de un contenedor plegado (`.hidden`)? */
function estaOculto(nodo: HTMLElement): boolean {
  return nodo.closest('.hidden') !== null;
}

describe('PanelLateral', () => {
  it('muestra las cinco secciones en el orden acordado', () => {
    const { container } = renderPanel();
    // Solo los encabezados plegables; los chips y las filas también son <button>.
    const titulos = [...container.querySelectorAll('[aria-expanded]')].map((b) =>
      b.textContent?.trim(),
    );
    expect(titulos).toEqual([
      'Candidatos',
      'Tipos de negocio',
      'Filtrar por colonia',
      'Filtrar por estado',
      'Buscar negocio',
    ]);
  });

  it('plegar "Buscar negocio" oculta el input y también la lista de negocios', () => {
    renderPanel();
    expect(estaOculto(screen.getByRole('searchbox'))).toBe(false);
    expect(estaOculto(screen.getByText('YULINEY'))).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: /buscar negocio/i }));

    // El buscador va en el slot `sticky`, que no se renderiza al plegar; la
    // lista es el resultado de la búsqueda y se pliega con ella, no aparte.
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(estaOculto(screen.getByText('YULINEY'))).toBe(true);
  });

  it('plegar una sección no afecta a las demás', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /^candidatos$/i }));
    expect(estaOculto(screen.getByText('Total'))).toBe(true);
    expect(estaOculto(screen.getByText('YULINEY'))).toBe(false);
  });

  it('el panel es el único contenedor con scroll', () => {
    const { container } = renderPanel();
    const aside = container.querySelector('aside');
    expect(aside?.className).toContain('overflow-y-auto');
    // La lista no debe abrir un scroll propio dentro del que ya tiene el panel.
    const scrollables = container.querySelectorAll('[class*="overflow-y-auto"]');
    expect(scrollables).toHaveLength(1);
  });
});
