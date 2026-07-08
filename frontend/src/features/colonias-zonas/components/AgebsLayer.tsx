import type { FeatureCollection } from 'geojson';
import L from 'leaflet';
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { useGeoJsonLayer } from '../api/useColonias';

interface AgebProps {
  cve_ageb?: string;
  cvegeo?: string;
  pob_total?: string | number;
  total_viviendas_habitadas?: string | number;
}

const num = (v: string | number | undefined) => {
  const n = typeof v === 'string' ? parseInt(v) : (v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/** 545 AGEBs de Mérida coloreados por población (Censo 2020). */
export function AgebsLayer() {
  const map = useMap();
  const { data: geojson } = useGeoJsonLayer('agebs', '/agebs-geojson');

  useEffect(() => {
    if (!geojson || !('features' in geojson)) return;
    const features = (geojson as FeatureCollection).features;
    const maxPob = Math.max(1, ...features.map((f) => num((f.properties as AgebProps).pob_total)));

    const layer = L.geoJSON(geojson, {
      style: (feat) => {
        const pob = num((feat?.properties as AgebProps).pob_total);
        const intensidad = Math.min(pob / (maxPob * 0.5), 1);
        return {
          color: '#10b981',
          weight: 1,
          fillColor: '#10b981',
          fillOpacity: 0.1 + intensidad * 0.4,
        };
      },
      onEachFeature: (feat, lyr) => {
        const p = (feat.properties ?? {}) as AgebProps;
        lyr.bindTooltip(
          `<b>AGEB ${p.cve_ageb ?? p.cvegeo ?? '?'}</b><br>` +
            `Población: ${num(p.pob_total).toLocaleString('es-MX')}<br>` +
            `Viviendas: ${num(p.total_viviendas_habitadas).toLocaleString('es-MX')}`,
          { direction: 'center' },
        );
        lyr.on('mouseover', () => (lyr as L.Path).setStyle({ weight: 3, color: '#ffffff' }));
        lyr.on('mouseout', () => (lyr as L.Path).setStyle({ weight: 1, color: '#10b981' }));
      },
    });
    map.addLayer(layer);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, geojson]);

  return null;
}
