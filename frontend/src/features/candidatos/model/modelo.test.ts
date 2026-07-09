import { describe, expect, it } from 'vitest';
import { candidatoListSchema, tipoDe, type Candidato } from './candidato';
import { calcularMetricas, filtrarCandidatos } from './filtros';
import { giroEs, giroLabel } from './giros';

const base = { lat: 21, lng: -89.6, colonia_nombre: null, colonia_denue: null };
const datos: Candidato[] = [
  { ...base, place_id: 'a', nombre: 'Panadería La Flor', tipos: 'bakery,food', tipo: null },
  { ...base, place_id: 'b', nombre: 'Taller García', tipos: 'car_repair', tipo: 'en_proceso' },
  { ...base, place_id: 'c', nombre: 'Farmacia Central', tipos: 'pharmacy', tipo: 'formal' },
];

describe('candidatoListSchema', () => {
  it('tolera tipo desconocido y nombre faltante (datos sucios de Firestore)', () => {
    const parsed = candidatoListSchema.parse([
      { place_id: 'x', nombre: 123, lat: null, lng: null, tipos: null, tipo: 'raro' },
    ]);
    expect(parsed[0].nombre).toBe('(sin nombre)');
    expect(parsed[0].tipo).toBeNull();
    expect(tipoDe(parsed[0])).toBe('informal');
  });
});

describe('giroLabel', () => {
  it('traduce la primera categoría reconocible', () => {
    expect(giroLabel('bakery,food')).toBe('Panadería');
    expect(giroLabel('point_of_interest,establishment')).toBe('Negocio');
    expect(giroLabel(null)).toBe('Negocio');
  });

  it('traduce las categorías que antes se colaban crudas', () => {
    expect(giroLabel('food_store')).toBe('Abarrotes');
    expect(giroLabel('health')).toBe('Salud');
    expect(giroLabel('hair_care')).toBe('Peluquería');
  });

  it('ignora `service` cuando hay una categoría útil detrás', () => {
    expect(giroLabel('service,car_repair')).toBe('Taller mecánico');
  });

  it('nunca deja escapar un identificador con guiones bajos', () => {
    expect(giroLabel('sports_activity_location')).toBe('Centro deportivo');
    expect(giroLabel('categoria_inventada_de_google')).toBe('Categoria inventada de google');
    expect(giroEs('otra_cosa_rara')).toBe('Otra cosa rara');
  });
});

describe('filtrarCandidatos', () => {
  it('filtra por texto y tipo combinados', () => {
    expect(filtrarCandidatos(datos, { q: 'taller', tipo: null, colonia: null })).toHaveLength(1);
    expect(filtrarCandidatos(datos, { q: '', tipo: 'informal', colonia: null })[0].place_id).toBe('a');
    expect(filtrarCandidatos(datos, { q: 'farmacia', tipo: 'formal', colonia: null })).toHaveLength(1);
    expect(filtrarCandidatos(datos, { q: '', tipo: null, colonia: null })).toBe(datos); // sin copia inútil
  });
});

describe('calcularMetricas', () => {
  it('cuenta estados y excluye formales del top de giros', () => {
    const m = calcularMetricas(datos);
    expect(m).toMatchObject({ total: 3, formales: 1, enProceso: 1, informales: 1 });
    expect(m.pctInformales).toBeCloseTo(33.3);
    const giros = m.topGiros.map(([g]) => g);
    expect(giros).toContain('Panadería');
    expect(giros).not.toContain('Farmacia'); // formal excluido
    expect(giros.every((g) => !g.includes('_'))).toBe(true); // nada crudo del backend
  });

  it('suma en una sola fila los giros que comparten etiqueta', () => {
    const gimnasios: Candidato[] = [
      { ...base, place_id: 'g1', nombre: 'Uno', tipos: 'gym', tipo: null },
      { ...base, place_id: 'g2', nombre: 'Dos', tipos: 'fitness_center', tipo: null },
    ];
    // `gym` y `fitness_center` son ambos "Gimnasio": una fila con 2, no dos con 1.
    expect(calcularMetricas(gimnasios).topGiros).toEqual([['Gimnasio', 2]]);
  });
});
