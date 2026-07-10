import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DataTable, type Column } from './DataTable';
import { paginasVisibles } from './Pagination';

interface Fila {
  id: string;
  nombre: string;
}

const filas: Fila[] = Array.from({ length: 25 }, (_, i) => ({
  id: String(i),
  nombre: i === 3 ? 'Teléfono' : `Fila ${i}`,
}));

const columnas: Column<Fila>[] = [{ key: 'n', header: 'Nombre', cell: (f) => f.nombre }];

function pintar() {
  return render(
    <DataTable
      columns={columnas}
      rows={filas}
      rowKey={(f) => f.id}
      searchable={(f) => f.nombre}
      pageSize={10}
    />,
  );
}

describe('DataTable', () => {
  it('solo pinta las filas de la página actual', () => {
    pintar();
    expect(screen.getByText('Fila 0')).toBeDefined();
    expect(screen.queryByText('Fila 10')).toBeNull();
    expect(screen.getByText('Mostrando 1 a 10 de 25 resultados')).toBeDefined();
  });

  it('navega a la página elegida', () => {
    pintar();
    fireEvent.click(screen.getByLabelText('Página 3'));
    expect(screen.getByText('Fila 24')).toBeDefined();
    expect(screen.queryByText('Fila 0')).toBeNull();
  });

  it('busca ignorando acentos y mayúsculas', async () => {
    pintar();
    fireEvent.change(screen.getByLabelText('Buscar…'), { target: { value: 'TELEFONO' } });
    // El buscador tiene debounce: espera a que las demás filas desaparezcan.
    await waitFor(() => expect(screen.queryByText('Fila 0')).toBeNull());
    expect(screen.getByText('Teléfono')).toBeDefined();
  });
});

describe('paginasVisibles', () => {
  it('sin huecos cuando hay pocas páginas', () => {
    expect(paginasVisibles(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('colapsa con elipsis a ambos lados', () => {
    expect(paginasVisibles(10, 20)).toEqual([1, null, 9, 10, 11, null, 20]);
  });

  it('no repite la primera ni la última página', () => {
    expect(paginasVisibles(2, 20)).toEqual([1, 2, 3, null, 20]);
    expect(paginasVisibles(20, 20)).toEqual([1, null, 19, 20]);
  });
});
