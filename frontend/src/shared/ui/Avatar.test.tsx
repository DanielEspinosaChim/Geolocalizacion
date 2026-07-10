import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Avatar } from './Avatar';

describe('Avatar', () => {
  it('muestra la inicial en mayúscula', () => {
    render(<Avatar nombre="admin@canaco.mx" />);
    expect(screen.getByText('A')).toBeTruthy();
  });

  it('ignora espacios al inicio', () => {
    render(<Avatar nombre="  luis" />);
    expect(screen.getByText('L')).toBeTruthy();
  });

  it('cae a «?» con nombre vacío', () => {
    render(<Avatar nombre="" />);
    expect(screen.getByText('?')).toBeTruthy();
  });
});
