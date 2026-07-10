import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Page } from './Page';

/** El contenedor externo: el que reclama el alto y se queda el scroll. */
function marcoDe(container: HTMLElement): HTMLElement {
  return container.firstElementChild as HTMLElement;
}

describe('Page', () => {
  it('llena el alto disponible y se queda el scroll', () => {
    // Sin `h-full` la vista no ocupa la pantalla: era el bug de Validación y Admin.
    const { container } = render(<Page>contenido</Page>);
    expect(marcoDe(container).className).toContain('h-full');
    expect(marcoDe(container).className).toContain('overflow-y-auto');
  });

  it('centra el contenido y por defecto no lo estrecha', () => {
    const { container } = render(<Page>contenido</Page>);
    const contenido = marcoDe(container).firstElementChild!;
    expect(contenido.className).toContain('mx-auto');
    expect(contenido.className).toContain('max-w-none');
  });

  it('acota el ancho de los documentos largos', () => {
    const { container } = render(<Page width="prose">contenido</Page>);
    expect(marcoDe(container).firstElementChild!.className).toContain('max-w-4xl');
  });

  it('el className extra va al contenido, no al contenedor con scroll', () => {
    const { container } = render(<Page className="grid gap-6">contenido</Page>);
    expect(marcoDe(container).className).not.toContain('grid');
    expect(marcoDe(container).firstElementChild!.className).toContain('grid');
  });

  it('renderiza a sus hijos', () => {
    render(
      <Page>
        <h1>Índice</h1>
      </Page>,
    );
    expect(screen.getByRole('heading', { name: 'Índice' })).toBeTruthy();
  });
});
