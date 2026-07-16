import { describe, expect, it } from 'vitest';
import { indiceSchema, recalcularIndice, type Indice } from './indice';

describe('indiceSchema', () => {
  it('parsea la estructura estadística mínima', () => {
    const i = indiceSchema.parse({
      datos_entrada: {},
      cobertura_gmaps_pct: 60,
      multiplicador: 2.4,
      central_indice_pct: 55,
      ic95_indice_inferior: { low: 50, high: 60 },
      escenarios: [{ etiqueta: 'Conservador', alpha: 0.8, indice_pct: 50, N_inf_estimado: 1000 }],
    });
    expect(i.escenarios).toHaveLength(1);
    expect(i.datos_entrada.N1_denue).toBe(0);
    expect(i.chapman.indice_pct).toBe(0);
  });
});

/** Anclas reales que devuelve GET /api/indice. */
function indiceReal(): Indice {
  return indiceSchema.parse({
    datos_entrada: {
      N1_denue: 144_576,
      m_overlap: 8_901,
      n_formales_total: 17_326,
      n_formales_otros: 4_616,
      n_formales_base: 3_809,
      n_inf_observados: 5_966,
      n_gmaps_negocios: 23_292,
      n_gmaps_csv: 29_234,
    },
    cobertura_gmaps_pct: 6.16,
    multiplicador: 16.24,
    central_indice_pct: 50.8,
    ic95_indice_inferior: { low: 39.6, high: 40.6 },
    escenarios: [
      { etiqueta: 'Límite inferior', alpha: 1, indice_pct: 40.1, N_inf_estimado: 96_904 },
      { etiqueta: 'Estimación central', alpha: 0.65, indice_pct: 50.8, N_inf_estimado: 149_083 },
      { etiqueta: 'Límite superior realista', alpha: 0.4, indice_pct: 62.6, N_inf_estimado: 242_259 },
    ],
    chapman: {
      n1_gmaps_limpio: 20_736,
      n2_osm: 2_556,
      overlap: 402,
      n_denue_ancla: 56_014,
      N_estimado_total: 131_573,
      N_inf_estimado: 75_559,
      indice_pct: 57.4,
    },
    metodo: 'Estimador de Razón / Multiplier Method',
    referencias: [],
  });
}

describe('recalcularIndice', () => {
  it('sin negocios marcados reproduce la línea base de ambos escenarios', () => {
    const r = recalcularIndice(indiceReal(), 0, 0);
    expect(r.ninfObs).toBe(5_966);
    expect(r.central.indicePct).toBe(50.8);
    expect(r.central.deltaPp).toBe(0);
    expect(r.limiteSuperior.indicePct).toBe(62.6);
    expect(r.limiteSuperior.deltaPp).toBe(0);
  });

  it('el Chapman no se mueve con las validaciones de campo', () => {
    const sinMarcar = recalcularIndice(indiceReal(), 0, 0);
    const conMarcados = recalcularIndice(indiceReal(), 50, 20);
    expect(sinMarcar.chapmanPct).toBe(57.4);
    expect(conMarcados.chapmanPct).toBe(57.4);
  });

  it('descuenta formales y en proceso de los informales observados', () => {
    const r = recalcularIndice(indiceReal(), 3, 0);
    expect(r.ninfObs).toBe(5_963);
    expect(r.central.nInfEstimado).toBe(148_926);
    expect(r.central.indicePct).toBe(50.7);
    expect(r.central.deltaPp).toBe(-0.1);
    expect(r.limiteSuperior.nInfEstimado).toBe(242_005);
    expect(r.limiteSuperior.indicePct).toBe(62.6);
  });

  it('nunca reporta -0 como delta', () => {
    expect(Object.is(recalcularIndice(indiceReal(), 3, 0).central.deltaPp, -0)).toBe(false);
  });

  it('no deja bajar los informales observados de cero', () => {
    const r = recalcularIndice(indiceReal(), 10_000, 10_000);
    expect(r.ninfObs).toBe(0);
    expect(r.central.nInfEstimado).toBe(0);
    expect(r.central.indicePct).toBe(0);
  });

  it('tolera una cobertura de cero sin dividir entre cero', () => {
    const roto = indiceSchema.parse({ ...indiceReal(), cobertura_gmaps_pct: 0 });
    const r = recalcularIndice(roto, 0, 0);
    expect(Number.isFinite(r.central.nInfEstimado)).toBe(true);
    expect(r.central.nInfEstimado).toBe(0);
  });
});
