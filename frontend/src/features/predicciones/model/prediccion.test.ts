import { describe, expect, it } from 'vitest';
import { prediccionSchema } from './prediccion';
import { validacionSchema } from './validacion';

describe('prediccionSchema', () => {
  it('status desconocido cae a sin_datos', () => {
    expect(prediccionSchema.parse({ status: 'otra_cosa' }).status).toBe('sin_datos');
    expect(prediccionSchema.parse({ status: 'zona', zona_score: 70 }).zona_score).toBe(70);
  });
});

describe('validacionSchema', () => {
  it('tolera arrays faltantes', () => {
    const v = validacionSchema.parse({});
    expect(v.matches).toEqual([]);
    expect(v.no_matches).toEqual([]);
  });
});
