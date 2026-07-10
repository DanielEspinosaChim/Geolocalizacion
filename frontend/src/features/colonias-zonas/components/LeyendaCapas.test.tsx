import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CapaId } from './CapasToggles';
import { LeyendaCapas } from './LeyendaCapas';

const sin = new Set<CapaId>();
const conProbabilidad = new Set<CapaId>(['probabilidad']);
const otraCapa = new Set<CapaId>(['colonias']);

describe('LeyendaCapas', () => {
  it('no pinta nada si no hay símbolos que explicar', () => {
    const { container } = render(<LeyendaCapas activas={sin} />);
    expect(container.firstChild).toBeNull();
  });

  it('tampoco aparece con capas que no tienen escala propia', () => {
    // Colonias y municipios se distinguen solos; una caja vacía sería ruido.
    const { container } = render(<LeyendaCapas activas={otraCapa} />);
    expect(container.firstChild).toBeNull();
  });

  it('muestra la escala al activar la capa de probabilidad', () => {
    render(<LeyendaCapas activas={conProbabilidad} />);
    expect(screen.getByText('Probabilidad')).toBeTruthy();
    expect(screen.getByText('Muy Alto')).toBeTruthy();
    expect(screen.getByText('0–25%')).toBeTruthy();
  });

  it('antepone los símbolos propios de la vista', () => {
    render(
      <LeyendaCapas activas={conProbabilidad}>
        <span>Informal</span>
      </LeyendaCapas>,
    );
    expect(screen.getByText('Informal')).toBeTruthy();
    expect(screen.getByText('Probabilidad')).toBeTruthy();
  });

  it('con símbolos propios se ve aunque la probabilidad esté apagada', () => {
    render(
      <LeyendaCapas activas={sin}>
        <span>Informal</span>
      </LeyendaCapas>,
    );
    expect(screen.getByText('Informal')).toBeTruthy();
    expect(screen.queryByText('Probabilidad')).toBeNull();
  });
});
