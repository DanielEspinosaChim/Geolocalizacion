import L from 'leaflet';
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { useGeoJsonLayer } from '../api/useColonias';

interface MunicipioProps {
  nomgeo?: string;
  nom_mun?: string;
  pob_total?: string | number;
}

/** 106 municipios de Yucatán (polígonos INEGI). */
export function MunicipiosLayer() {
  const map = useMap();
  const { data: geojson } = useGeoJsonLayer('municipios-yucatan', '/municipios-yucatan-geojson');

  useEffect(() => {
    if (!geojson) return;
    const layer = L.geoJSON(geojson, {
      style: { color: '#f59e0b', weight: 2, fillColor: '#f59e0b', fillOpacity: 0.08 },
      onEachFeature: (feat, lyr) => {
        const p = (feat.properties ?? {}) as MunicipioProps;
        const pob = parseInt(String(p.pob_total ?? 0));
        lyr.bindTooltip(
          `<b>${p.nomgeo ?? p.nom_mun ?? 'Municipio'}</b><br>Población: ${
            Number.isFinite(pob) && pob > 0 ? pob.toLocaleString('es-MX') : '?'
          }`,
          { direction: 'center' },
        );
        lyr.on('mouseover', () => (lyr as L.Path).setStyle({ fillOpacity: 0.25, weight: 3 }));
        lyr.on('mouseout', () => (lyr as L.Path).setStyle({ fillOpacity: 0.08, weight: 2 }));
      },
    });
    map.addLayer(layer);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, geojson]);

  return null;
}
