import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Candidato } from '@features/candidatos';
import { RutaLista } from './RutaLista';

const CANDIDATOS: Candidato[] = [
  { place_id: 'a', nombre: 'Taquería El Güero', lat: 21, lng: -89, tipos: 'restaurant', tipo: null },
  { place_id: 'b', nombre: 'Farmacia Central', lat: 21, lng: -89, tipos: 'pharmacy', tipo: null },
];

function renderLista(seleccion = new Set<string>(), onToggle = vi.fn()) {
  render(<RutaLista candidatos={CANDIDATOS} q="" seleccion={seleccion} onToggle={onToggle} />);
  return onToggle;
}

describe('RutaLista', () => {
  it('cada fila expone una casilla real, no un botón disfrazado', () => {
    renderLista();
    // El bug anterior: la casilla se dibujaba con `h-4.5`, clase que Tailwind no
    // genera, así que medía cero y no se veía que la fila fuera seleccionable.
    const casillas = screen.getAllByRole('checkbox');
    expect(casillas).toHaveLength(CANDIDATOS.length);
    expect(casillas.every((c) => c instanceof HTMLInputElement)).toBe(true);
  });

  it('la casilla refleja si el punto está en la ruta', () => {
    renderLista(new Set(['a']));
    const [taqueria, farmacia] = screen.getAllByRole('checkbox');
    expect((taqueria as HTMLInputElement).checked).toBe(true);
    expect((farmacia as HTMLInputElement).checked).toBe(false);
  });

  it('pulsar en cualquier parte de la fila alterna la selección', () => {
    const onToggle = renderLista();
    // El <label> envuelve la fila, así que el clic en el nombre marca la casilla.
    fireEvent.click(screen.getByText('Farmacia Central'));
    expect(onToggle).toHaveBeenCalledWith('b');
  });

  it('pulsar la casilla la alterna UNA sola vez', () => {
    const onToggle = renderLista();
    // Si el <label> apunta con `htmlFor` al input que envuelve, el navegador
    // reenvía el clic al control: se alterna dos veces y no cambia nada.
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('filtra por el texto de búsqueda', () => {
    render(
      <RutaLista candidatos={CANDIDATOS} q="farmacia" seleccion={new Set()} onToggle={vi.fn()} />,
    );
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    expect(screen.getByText('Farmacia Central')).toBeTruthy();
  });
});
