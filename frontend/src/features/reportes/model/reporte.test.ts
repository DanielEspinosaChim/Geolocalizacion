import { describe, expect, it } from 'vitest';
import { reporteListSchema, siguienteStatus, toneVerificacion } from './reporte';

describe('reporteSchema', () => {
  it('tolera tipo/status desconocidos con defaults seguros', () => {
    const [r] = reporteListSchema.parse([
      { id: '1', tipo: 'inexistente', status: 'raro', lat: 21, lng: -89.6 },
    ]);
    expect(r.tipo).toBe('otro');
    expect(r.status).toBe('pendiente');
  });
});

describe('siguienteStatus', () => {
  it('avanza pendiente → en_proceso → resuelto → null', () => {
    expect(siguienteStatus('pendiente')).toBe('en_proceso');
    expect(siguienteStatus('en_proceso')).toBe('resuelto');
    expect(siguienteStatus('resuelto')).toBeNull();
  });
});

describe('toneVerificacion', () => {
  it('semáforo por distancia (≤100 / ≤300 / >300)', () => {
    expect(toneVerificacion(50)).toBe('success');
    expect(toneVerificacion(250)).toBe('warning');
    expect(toneVerificacion(500)).toBe('danger');
  });
});
