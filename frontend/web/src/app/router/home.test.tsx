import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HomePage } from './home';

describe('HomePage (smoke test del andamiaje)', () => {
  it('renderiza el estado de la migración', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { name: /nueva base react lista/i })).toBeDefined();
  });
});
