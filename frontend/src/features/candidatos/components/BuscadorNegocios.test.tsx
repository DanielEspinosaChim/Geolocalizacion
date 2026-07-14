import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Candidato } from '../model/candidato';
import { BuscadorNegocios } from './BuscadorNegocios';

const CANDIDATOS: Candidato[] = [
  {
    place_id: 'a',
    nombre: 'YULINEY',
    lat: 20.9,
    lng: -89.6,
    tipos: 'restaurant',
    tipo: 'informal',
    colonia_nombre: 'Centro',
  },
  { place_id: 'b', nombre: 'VALPESA', lat: 20.9, lng: -89.6, tipos: 'store', tipo: 'formal' },
];

function renderBuscador(props: Partial<Parameters<typeof BuscadorNegocios>[0]> = {}) {
  return render(
    <BuscadorNegocios
      q="yu"
      onQ={vi.fn()}
      resultados={CANDIDATOS}
      onSelect={vi.fn()}
      {...props}
    />,
  );
}

describe('BuscadorNegocios', () => {
  it('sin foco no muestra sugerencias aunque haya texto', () => {
    renderBuscador();
    expect(screen.queryByText('YULINEY')).toBeNull();
  });

  it('con foco y texto despliega sugerencias con giro y colonia', () => {
    renderBuscador();
    fireEvent.focus(screen.getByRole('searchbox'));
    expect(screen.getByText('YULINEY')).toBeTruthy();
    // El diferenciador del buscador: metadatos que Google no tiene.
    expect(screen.getByText(/Centro/)).toBeTruthy();
  });

  it('elegir una sugerencia llama a onSelect con el candidato y cierra el panel', () => {
    const onSelect = vi.fn();
    renderBuscador({ onSelect });
    fireEvent.focus(screen.getByRole('searchbox'));

    // mousedown, no click: el componente selecciona antes del blur del input.
    fireEvent.mouseDown(screen.getByRole('button', { name: /YULINEY/ }));

    expect(onSelect).toHaveBeenCalledWith(CANDIDATOS[0]);
    expect(screen.queryByText('VALPESA')).toBeNull();
  });

  it('con foco pero sin texto no abre el panel', () => {
    renderBuscador({ q: '' });
    fireEvent.focus(screen.getByRole('searchbox'));
    expect(screen.queryByText('YULINEY')).toBeNull();
  });
});
