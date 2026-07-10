import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Badge } from './Badge';
import { Modal } from './Modal';
import { PanelSection } from './PanelSection';
import { Table, TBody, Td, Th, THead, Tr } from './Table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './Tabs';

describe('Badge', () => {
  it('aplica el tono semántico', () => {
    render(<Badge tone="danger">Informal</Badge>);
    expect(screen.getByText('Informal').className).toContain('text-danger');
  });
});

describe('Modal', () => {
  it('muestra título y contenido cuando está abierto', () => {
    render(
      <Modal open onClose={vi.fn()} title="Nueva campaña">
        <p>Contenido</p>
      </Modal>,
    );
    expect(screen.getByRole('dialog', { name: 'Nueva campaña' })).toBeDefined();
    expect(screen.getByText('Contenido')).toBeDefined();
  });

  it('no renderiza nada cerrado y llama onClose con Escape', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Modal open={false} onClose={onClose} title="Oculto">
        <p>Nada</p>
      </Modal>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();

    rerender(
      <Modal open onClose={onClose} title="Oculto">
        <p>Nada</p>
      </Modal>,
    );
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});

describe('Tabs', () => {
  it('cambia el contenido al seleccionar un tab', () => {
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">Lista</TabsTrigger>
          <TabsTrigger value="b">Detalle</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Contenido A</TabsContent>
        <TabsContent value="b">Contenido B</TabsContent>
      </Tabs>,
    );
    expect(screen.getByText('Contenido A')).toBeDefined();
    // Radix activa el tab en mousedown (click sintético de jsdom no basta)
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Detalle' }), { button: 0 });
    expect(screen.getByText('Contenido B')).toBeDefined();
  });
});

describe('Table', () => {
  it('renderiza estructura semántica', () => {
    render(
      <Table>
        <THead>
          <Tr>
            <Th>Negocio</Th>
          </Tr>
        </THead>
        <TBody>
          <Tr>
            <Td>Panadería La Flor</Td>
          </Tr>
        </TBody>
      </Table>,
    );
    expect(screen.getByRole('table')).toBeDefined();
    expect(screen.getByRole('columnheader', { name: 'Negocio' })).toBeDefined();
    expect(screen.getByRole('cell', { name: 'Panadería La Flor' })).toBeDefined();
  });
});

/** El div de contenido, localizado por el `aria-controls` del botón de plegado. */
function contenidoDe(boton: HTMLElement): HTMLElement {
  const id = boton.getAttribute('aria-controls');
  const el = id ? document.getElementById(id) : null;
  if (!el) throw new Error('El botón de plegado no apunta a ningún contenido');
  return el;
}

describe('PanelSection', () => {
  it('conserva la marca de acento aunque sea plegable', () => {
    const { container } = render(
      <PanelSection title="Candidatos" collapsible>
        <p>Contenido</p>
      </PanelSection>,
    );
    // El chevron se suma al título; no sustituye a la barrita de acento.
    expect(container.querySelector('header .bg-primary')).not.toBeNull();
  });

  it('sin `collapsible` no ofrece control de plegado', () => {
    render(
      <PanelSection title="Candidatos">
        <p>Contenido</p>
      </PanelSection>,
    );
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Contenido')).toBeTruthy();
  });

  it('pliega y despliega el contenido al pulsar el título', () => {
    render(
      <PanelSection title="Tipos de negocio" collapsible>
        <p>Contenido</p>
      </PanelSection>,
    );
    const boton = screen.getByRole('button', { name: /tipos de negocio/i });
    const contenido = contenidoDe(boton);

    expect(boton.getAttribute('aria-expanded')).toBe('true');
    expect(contenido.className).not.toContain('hidden');

    fireEvent.click(boton);
    expect(boton.getAttribute('aria-expanded')).toBe('false');
    // La utilidad `grid` de Tailwind ganaría al atributo `hidden`, por eso el
    // componente alterna la clase. Si esto falla, el panel nunca se cierra.
    expect(contenido.className).toBe('hidden');

    fireEvent.click(boton);
    expect(boton.getAttribute('aria-expanded')).toBe('true');
    expect(contenido.className).not.toContain('hidden');
  });

  it('respeta defaultOpen={false}', () => {
    render(
      <PanelSection title="Tipos de negocio" collapsible defaultOpen={false}>
        <p>Contenido</p>
      </PanelSection>,
    );
    const boton = screen.getByRole('button');
    expect(boton.getAttribute('aria-expanded')).toBe('false');
    expect(contenidoDe(boton).className).toBe('hidden');
  });

  it('pliega todo su contenido, no solo el primer hijo', () => {
    render(
      <PanelSection title="Buscar negocio" collapsible>
        <input aria-label="Buscar" />
        <ul>
          <li>Un negocio</li>
        </ul>
      </PanelSection>,
    );
    const boton = screen.getByRole('button', { name: /buscar negocio/i });
    const contenido = contenidoDe(boton);
    expect(contenido.contains(screen.getByRole('textbox'))).toBe(true);
    expect(contenido.contains(screen.getByText('Un negocio'))).toBe(true);

    fireEvent.click(boton);
    expect(contenido.className).toBe('hidden');
  });

  it('el slot `sticky` viaja con el encabezado, no con el contenido', () => {
    render(
      <PanelSection title="Buscar negocio" collapsible sticky={<input aria-label="Buscar" />}>
        <p>Contenido</p>
      </PanelSection>,
    );
    const boton = screen.getByRole('button', { name: /buscar negocio/i });
    const buscador = screen.getByRole('textbox');
    // Si estuviera en el contenido, el encabezado pegajoso lo taparía al scrollar.
    expect(contenidoDe(boton).contains(buscador)).toBe(false);
    expect(buscador.closest('.sticky')).not.toBeNull();
  });

  it('el slot `sticky` se esconde al plegar la sección', () => {
    render(
      <PanelSection title="Buscar negocio" collapsible sticky={<input aria-label="Buscar" />}>
        <p>Contenido</p>
      </PanelSection>,
    );
    fireEvent.click(screen.getByRole('button', { name: /buscar negocio/i }));
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('el slot `action` no queda anidado dentro del botón que pliega', () => {
    render(
      <PanelSection title="Candidatos" collapsible action={<button type="button">Limpiar</button>}>
        <p>Contenido</p>
      </PanelSection>,
    );
    const plegar = screen.getByRole('button', { name: /candidatos/i });
    const limpiar = screen.getByRole('button', { name: 'Limpiar' });
    expect(plegar.contains(limpiar)).toBe(false);
  });

  it('una sección plegable con `grow` no reclama el espacio flexible al cerrarse', () => {
    render(
      <PanelSection title="Resultado" collapsible grow>
        <p>Contenido</p>
      </PanelSection>,
    );
    const boton = screen.getByRole('button');
    const seccion = boton.closest('section');
    expect(seccion?.className).toContain('flex-1');

    fireEvent.click(boton);
    expect(seccion?.className).not.toContain('flex-1');
  });
});
