import { describe, expect, it } from 'vitest';
import {
  aniosDisponibles,
  mesesVisibles,
  slugProducto,
  totalesPorMes,
  variaciones,
  type Producto,
} from './canasta';

function producto(id: string, prices: Record<string, number | null>): Producto {
  return { id, name: id, category: 'ABARROTES', unit: 'KILO', sort_order: 1, active: true, prices };
}

describe('mesesVisibles', () => {
  it('año pasado: los 12 meses', () => {
    expect(mesesVisibles('2025', new Date('2026-07-15'))).toHaveLength(12);
  });

  it('año en curso: hasta el mes actual (julio = 7)', () => {
    const m = mesesVisibles('2026', new Date('2026-07-15'));
    expect(m).toHaveLength(7);
    expect(m.at(-1)).toBe('jul');
  });

  it('año futuro: ninguno', () => {
    expect(mesesVisibles('2027', new Date('2026-07-15'))).toHaveLength(0);
  });
});

describe('totalesPorMes', () => {
  it('suma los precios presentes e ignora los null', () => {
    const productos = [
      producto('a', { jan: 10, feb: 20 }),
      producto('b', { jan: 5, feb: null }),
    ];
    expect(totalesPorMes(productos, ['jan', 'feb'])).toEqual([15, 20]);
  });

  it('mes sin ningún precio da null', () => {
    expect(totalesPorMes([producto('a', { jan: 10 })], ['jan', 'feb'])).toEqual([10, null]);
  });
});

describe('variaciones', () => {
  it('calcula el % contra el mes anterior y omite meses no comparables', () => {
    const productos = [producto('a', { jan: 100, feb: 110, mar: 99 })];
    const v = variaciones(totalesPorMes(productos, ['jan', 'feb', 'mar']), ['jan', 'feb', 'mar']);
    expect(v).toEqual([
      { label: 'FEB', total: 110, pct: 10 },
      { label: 'MAR', total: 99, pct: -10 },
    ]);
  });

  it('no compara si el mes anterior no tiene total', () => {
    const productos = [producto('a', { jan: null, feb: 50 })];
    expect(variaciones(totalesPorMes(productos, ['jan', 'feb']), ['jan', 'feb'])).toEqual([]);
  });
});

describe('slugProducto', () => {
  it('minúsculas, espacios a guion bajo y sin paréntesis (igual que el backend)', () => {
    expect(slugProducto('HUEVO (REJILLA 30 PZAS)')).toBe('huevo_rejilla_30_pzas');
  });
});

describe('aniosDisponibles', () => {
  it('va del año actual hacia atrás hasta 2025', () => {
    expect(aniosDisponibles(new Date('2026-07-15'))).toEqual(['2026', '2025']);
  });
});
