import { describe, expect, it } from 'vitest';
import {
  aniosDisponibles,
  diaDeFecha,
  fechaCompra,
  mesesVisibles,
  promediosTrimestrales,
  promediosTrimestralesCanasta,
  slugProducto,
  totalesPorMes,
  trimestresActivos,
  variaciones,
  type Mes,
  type Producto,
} from './canasta';

function producto(
  id: string,
  prices: Record<string, number | null>,
  extra: Partial<Pick<Producto, 'tiendas' | 'fechas_compra'>> = {},
): Producto {
  return {
    id,
    name: id,
    category: 'ABARROTES',
    unit: 'KILO',
    sort_order: 1,
    active: true,
    prices,
    tiendas: extra.tiendas ?? {},
    fechas_compra: extra.fechas_compra ?? {},
  };
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

describe('trimestresActivos', () => {
  it('un solo trimestre activo no agrega PROMEDIO ANUAL', () => {
    const t = trimestresActivos(['jan', 'feb']);
    expect(t.map((q) => q.key)).toEqual(['Q1']);
  });

  it('con más de un trimestre agrega la columna PROMEDIO ANUAL de los meses activos', () => {
    const meses: Mes[] = ['jan', 'jul'];
    const t = trimestresActivos(meses);
    expect(t.map((q) => q.key)).toEqual(['Q1', 'Q3', 'ANUAL']);
    expect(t.at(-1)?.months).toEqual(['jan', 'jul']);
  });
});

describe('promediosTrimestrales', () => {
  it('promedia por trimestre solo los meses seleccionados', () => {
    const meses: Mes[] = ['jan', 'feb', 'mar'];
    const q = trimestresActivos(meses);
    // Q1 = (10 + 20) / 2 = 15 (mar es null y se ignora).
    expect(promediosTrimestrales({ jan: 10, feb: 20, mar: null }, q, meses)).toEqual([15]);
  });

  it('trimestre sin precios da null', () => {
    const meses: Mes[] = ['jan'];
    const q = trimestresActivos(meses);
    expect(promediosTrimestrales({ feb: 5 }, q, meses)).toEqual([null]);
  });
});

describe('promediosTrimestralesCanasta', () => {
  it('promedia los TOTALES mensuales de la canasta, no los promedios por producto', () => {
    const meses: Mes[] = ['jan', 'feb'];
    const q = trimestresActivos(meses);
    const productos = [producto('a', { jan: 10, feb: 20 }), producto('b', { jan: 5, feb: 5 })];
    // Totales: jan=15, feb=25 → Q1 = (15 + 25) / 2 = 20.
    expect(promediosTrimestralesCanasta(productos, q, meses)).toEqual([20]);
  });
});

describe('diaDeFecha', () => {
  it('extrae el día de un YYYY-MM-DD', () => {
    expect(diaDeFecha('2026-07-09')).toBe(9);
  });

  it('null/ausente o día fuera de rango da null', () => {
    expect(diaDeFecha(null)).toBeNull();
    expect(diaDeFecha('2026-07-40')).toBeNull();
  });
});

describe('fechaCompra', () => {
  it('arma YYYY-MM-DD con el mes de la columna y el día capturado', () => {
    expect(fechaCompra('2026', 'jul', 9)).toBe('2026-07-09');
    expect(fechaCompra('2026', 'jan', 1)).toBe('2026-01-01');
  });
});
