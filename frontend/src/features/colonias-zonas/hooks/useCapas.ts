import { useCallback, useState } from 'react';
import type { CapaId } from '../components/CapasToggles';

export interface Capas {
  activas: ReadonlySet<CapaId>;
  alternar: (capa: CapaId) => void;
}

/**
 * Estado de las capas geográficas del mapa. Cada vista lo tiene por su cuenta:
 * qué capas mira alguien en Predicción no debería alterar lo que ve en Rutas.
 */
export function useCapas(iniciales: readonly CapaId[] = []): Capas {
  const [activas, setActivas] = useState<ReadonlySet<CapaId>>(() => new Set(iniciales));

  const alternar = useCallback((capa: CapaId) => {
    setActivas((prev) => {
      const s = new Set(prev);
      if (s.has(capa)) s.delete(capa);
      else s.add(capa);
      return s;
    });
  }, []);

  return { activas, alternar };
}
