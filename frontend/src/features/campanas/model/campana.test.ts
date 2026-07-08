import { describe, expect, it } from 'vitest';
import { campanaListSchema, progresoDe } from './campana';
import { elegirPlantilla, slugify, type Plantilla } from './plantilla';

describe('progresoDe', () => {
  it('calcula porcentaje y estado de completitud', () => {
    expect(progresoDe({ total_negocios: 4, total_completados: 1 })).toMatchObject({
      pct: 25,
      pendientes: 3,
      completa: false,
    });
    expect(progresoDe({ total_negocios: 2, total_completados: 2 }).completa).toBe(true);
    expect(progresoDe({ total_negocios: 0, total_completados: 0 })).toMatchObject({
      pct: 0,
      completa: false,
    });
  });
});

describe('campanaListSchema', () => {
  it('tolera status desconocido y campos faltantes', () => {
    const [c] = campanaListSchema.parse([{ id: '1', status: 'raro' }]);
    expect(c.status).toBe('activa');
    expect(c.total_negocios).toBe(0);
  });
});

describe('slugify', () => {
  it('normaliza labels a keys seguras', () => {
    expect(slugify('¿Tiene RFC?')).toBe('tiene_rfc');
    expect(slugify('No. de empleados')).toBe('no_de_empleados');
  });
});

describe('elegirPlantilla', () => {
  const plantillas: Plantilla[] = [
    { id: 'a', nombre: 'A', campos: [], es_default: false },
    { id: 'b', nombre: 'B', campos: [], es_default: true },
  ];
  it('prioriza última usada, luego default, luego primera', () => {
    expect(elegirPlantilla(plantillas, 'a')?.id).toBe('a');
    expect(elegirPlantilla(plantillas, null)?.id).toBe('b');
    expect(elegirPlantilla([plantillas[0]])?.id).toBe('a');
  });
});
