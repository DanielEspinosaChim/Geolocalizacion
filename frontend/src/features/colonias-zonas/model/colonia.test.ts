import { describe, expect, it } from 'vitest';
import { buscarColoniaMatch, type Colonia } from './colonia';

const catalogo: Colonia[] = [
  { id: 'CENTRO', nombre: 'Centro', count: 120 },
  { id: 'FRACC. LAS AMERICAS', nombre: 'Las Américas', count: 45 },
];

describe('buscarColoniaMatch', () => {
  it('match exacto, sin prefijos y por inclusión', () => {
    expect(buscarColoniaMatch('CENTRO', catalogo)?.id).toBe('CENTRO');
    expect(buscarColoniaMatch('FRACCIONAMIENTO LAS AMERICAS', catalogo)?.id).toBe(
      'FRACC. LAS AMERICAS',
    );
    expect(buscarColoniaMatch('COLONIA INEXISTENTE XYZ', catalogo)).toBeNull();
  });
});
