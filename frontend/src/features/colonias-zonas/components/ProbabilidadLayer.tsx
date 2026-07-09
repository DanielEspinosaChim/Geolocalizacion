import L from 'leaflet';
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { toast } from '@shared/ui';
import { useZonas } from '../api/useZonas';
import { colorZona } from '../model/zona';

// Media celda en grados (~500m en Mérida, latitud ≈ 21°).
const DLAT = 0.00225;
const DLNG = 0.00241;

/** Capa de calor: score ML de informalidad por celda de 500m (GET /api/zonas). */
export function ProbabilidadLayer() {
  const map = useMap();
  const { data: zonas, error } = useZonas();

  useEffect(() => {
    if (error) toast.error('No se pudieron cargar las zonas de probabilidad.');
  }, [error]);

  useEffect(() => {
    if (!zonas?.length) return;
    // Un único renderer canvas para las ~4000 celdas (rendimiento).
    const renderer = L.canvas({ padding: 0.5 });
    const grupo = L.layerGroup();
    for (const z of zonas) {
      L.rectangle(
        [
          [z.lat_centro - DLAT, z.lon_centro - DLNG],
          [z.lat_centro + DLAT, z.lon_centro + DLNG],
        ],
        { renderer, stroke: false, fillColor: colorZona(z.score_100), fillOpacity: 0.35 },
      )
        .bindTooltip(`${z.score_100.toFixed(0)}% · ${z.nivel}`, { direction: 'top' })
        .addTo(grupo);
    }
    grupo.addTo(map);
    return () => {
      map.removeLayer(grupo);
    };
  }, [map, zonas]);

  return null;
}
