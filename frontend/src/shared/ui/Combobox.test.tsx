import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Combobox, type ComboboxOption } from './Combobox';
import { Modal } from './Modal';

const COLONIAS: ComboboxOption[] = [
  { value: 'CENTRO', label: 'Centro', hint: '120' },
  { value: 'CAUCEL', label: 'Caucel', hint: '43' },
  { value: 'ITZIMNA', label: 'Itzimná', hint: '7' },
];

/** Muchas opciones: dispara el filtro automático (> 8). */
const MUCHAS: ComboboxOption[] = Array.from({ length: 30 }, (_, i) => ({
  value: `c${i}`,
  label: `Colonia ${i}`,
}));

function abrir() {
  fireEvent.click(screen.getByRole('combobox'));
}

describe('Combobox', () => {
  it('muestra el placeholder cuando no hay selección', () => {
    render(<Combobox options={COLONIAS} value={null} onChange={vi.fn()} placeholder="Todas" />);
    expect(screen.getByRole('combobox').textContent).toContain('Todas');
  });

  it('muestra la etiqueta de la opción elegida, no su valor', () => {
    render(<Combobox options={COLONIAS} value="ITZIMNA" onChange={vi.fn()} />);
    expect(screen.getByRole('combobox').textContent).toContain('Itzimná');
  });

  it('el desplegable no existe hasta abrirlo', () => {
    render(<Combobox options={COLONIAS} value={null} onChange={vi.fn()} />);
    expect(screen.queryByRole('listbox')).toBeNull();
    abrir();
    expect(screen.getByRole('listbox')).toBeTruthy();
  });

  it('elegir una opción la propaga y cierra el desplegable', () => {
    const onChange = vi.fn();
    render(<Combobox options={COLONIAS} value={null} onChange={onChange} />);
    abrir();
    fireEvent.click(screen.getByRole('option', { name: /caucel/i }));
    expect(onChange).toHaveBeenCalledWith('CAUCEL');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('la fila del placeholder limpia la selección', () => {
    const onChange = vi.fn();
    render(<Combobox options={COLONIAS} value="CENTRO" onChange={onChange} placeholder="Todas" />);
    abrir();
    fireEvent.click(screen.getByRole('option', { name: 'Todas' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('sin filtro con pocas opciones; con filtro pasando de ocho', () => {
    const { unmount } = render(<Combobox options={COLONIAS} value={null} onChange={vi.fn()} />);
    abrir();
    expect(screen.queryByLabelText('Filtrar opciones')).toBeNull();
    unmount();

    render(<Combobox options={MUCHAS} value={null} onChange={vi.fn()} />);
    abrir();
    expect(screen.getByLabelText('Filtrar opciones')).toBeTruthy();
  });

  it('el filtro acota las opciones y avisa cuando no hay ninguna', () => {
    render(<Combobox options={MUCHAS} value={null} onChange={vi.fn()} />);
    abrir();
    const filtro = screen.getByLabelText('Filtrar opciones');

    fireEvent.change(filtro, { target: { value: 'Colonia 1' } });
    // 1, 10..19 → 11 opciones + la fila del placeholder.
    expect(screen.getAllByRole('option')).toHaveLength(12);

    fireEvent.change(filtro, { target: { value: 'zzz' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByText('Sin coincidencias.')).toBeTruthy();
  });

  it('se navega y se elige con el teclado', () => {
    const onChange = vi.fn();
    render(<Combobox options={COLONIAS} value={null} onChange={onChange} />);
    abrir();
    const lista = screen.getByRole('listbox');
    fireEvent.keyDown(lista, { key: 'ArrowDown' }); // Centro
    fireEvent.keyDown(lista, { key: 'ArrowDown' }); // Caucel
    fireEvent.keyDown(lista, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('CAUCEL');
  });

  it('Escape cierra sin elegir y devuelve el foco al campo', () => {
    const onChange = vi.fn();
    render(<Combobox options={COLONIAS} value={null} onChange={onChange} />);
    abrir();
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('combobox'));
  });

  it('clearable={false} no ofrece la fila de limpiar', () => {
    render(
      <Combobox
        options={COLONIAS}
        value="CENTRO"
        onChange={vi.fn()}
        placeholder="Todas"
        clearable={false}
      />,
    );
    abrir();
    expect(screen.queryByRole('option', { name: 'Todas' })).toBeNull();
    expect(screen.getAllByRole('option')).toHaveLength(COLONIAS.length);
  });

  it('clearable={false} nunca deja el campo en null con el teclado', () => {
    const onChange = vi.fn();
    render(<Combobox options={COLONIAS} value="CENTRO" onChange={onChange} clearable={false} />);
    abrir();
    const lista = screen.getByRole('listbox');
    // Sube más allá del tope: sin la fila de limpiar debe quedarse en la primera.
    fireEvent.keyDown(lista, { key: 'ArrowUp' });
    fireEvent.keyDown(lista, { key: 'ArrowUp' });
    fireEvent.keyDown(lista, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('CENTRO');
    expect(onChange).not.toHaveBeenCalledWith(null);
  });

  it('size="sm" compacta el campo para celdas de tabla', () => {
    const { rerender } = render(<Combobox options={COLONIAS} value={null} onChange={vi.fn()} />);
    expect(screen.getByRole('combobox').className).toContain('py-2.5');

    rerender(<Combobox options={COLONIAS} value={null} onChange={vi.fn()} size="sm" />);
    const campo = screen.getByRole('combobox').className;
    expect(campo).toContain('py-1');
    expect(campo).not.toContain('py-2.5');
  });

  it('el icono de la opción se ve en la fila y también en el campo cerrado', () => {
    const conIcono: ComboboxOption[] = [
      { value: 'informal', label: 'Informal', icon: <i data-testid="punto" /> },
    ];
    render(<Combobox options={conIcono} value="informal" onChange={vi.fn()} clearable={false} />);
    // Cerrado: el icono acompaña a la etiqueta de lo ya seleccionado.
    expect(screen.getAllByTestId('punto')).toHaveLength(1);

    abrir();
    // Abierto: uno en el campo y otro en la fila de la lista.
    expect(screen.getAllByTestId('punto')).toHaveLength(2);
  });

  it('dentro de un Modal, el desplegable aterriza en el diálogo y no en el body', () => {
    render(
      <Modal open onClose={vi.fn()} title="Nueva campaña">
        <Combobox options={COLONIAS} value={null} onChange={vi.fn()} />
      </Modal>,
    );
    abrir();

    // Radix pone `pointer-events: none` en el <body> mientras el diálogo está
    // abierto: un portal al body se vería, pero no recibiría clics ni foco.
    const lista = screen.getByRole('listbox');
    expect(lista.closest('[role="dialog"]')).not.toBeNull();
    expect(lista.parentElement).not.toBe(document.body);
  });

  it('fuera de un Modal sigue portaleando al body', () => {
    render(<Combobox options={COLONIAS} value={null} onChange={vi.fn()} />);
    abrir();
    const lista = screen.getByRole('listbox');
    expect(lista.closest('[role="dialog"]')).toBeNull();
    // El panel flotante cuelga directamente del body, fuera del árbol del campo.
    expect(lista.parentElement!.parentElement).toBe(document.body);
  });

  it('un clic fuera cierra el desplegable', () => {
    render(<Combobox options={COLONIAS} value={null} onChange={vi.fn()} />);
    abrir();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
