import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Badge } from './Badge';
import { Modal } from './Modal';
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
