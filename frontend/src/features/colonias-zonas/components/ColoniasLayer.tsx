import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { COLONIA_COLORS } from '../model/colonia';
import { useGeoJsonLayer } from '../api/useColonias';

interface ColoniasLayerProps {
  /** Colonia seleccionada (MAYÚSCULAS) para resaltarla. */
  seleccionada: string | null;
  onSelect: (nombreUpper: string) => void;
}

interface FeatureProps {
  nombre?: string;
  nombre_raw?: string;
  tipo?: string;
  d_codigo?: string;
  num_colonias?: number;
}

function tooltipDe(props: FeatureProps): string {
  let texto = props.nombre ?? props.nombre_raw ?? `CP ${props.d_codigo ?? '?'}`;
  if (props.tipo) texto += ` (${props.tipo})`;
  if (props.d_codigo) texto += `<br><small>CP: ${props.d_codigo}</small>`;
  if ((props.num_colonias ?? 1) > 1) texto += `<br><small>${props.num_colonias} colonias en este CP</small>`;
  return texto;
}

/** Polígonos INEGI/SEPOMEX de colonias, con hover, tooltip y click-para-filtrar. */
export function ColoniasLayer({ seleccionada, onSelect }: ColoniasLayerProps) {
  const map = useMap();
  const { data: geojson } = useGeoJsonLayer('colonias', '/colonias-geojson');
  const layerRef = useRef<L.GeoJSON | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const seleccionadaRef = useRef(seleccionada);
  seleccionadaRef.current = seleccionada;

  useEffect(() => {
    if (!geojson) return;
    let i = 0;
    const layer = L.geoJSON(geojson, {
      style: () => ({
        color: '#ffffff',
        weight: 1.2,
        fillColor: COLONIA_COLORS[i++ % COLONIA_COLORS.length],
        fillOpacity: 0.14,
      }),
      onEachFeature: (feat, lyr) => {
        const props = (feat.properties ?? {}) as FeatureProps;
        const nombreUpper = (props.nombre ?? props.nombre_raw ?? '').toUpperCase();
        lyr.bindTooltip(tooltipDe(props), { direction: 'center', sticky: true, opacity: 0.93 });
        lyr.on('mouseover', () =>
          (lyr as L.Path).setStyle({ fillOpacity: 0.3, weight: 2.5 }),
        );
        lyr.on('mouseout', () => {
          const activa = seleccionadaRef.current === nombreUpper;
          (lyr as L.Path).setStyle({ fillOpacity: activa ? 0.35 : 0.14, weight: activa ? 3 : 1.2 });
        });
        lyr.on('click', () => onSelectRef.current(nombreUpper));
      },
    });
    map.addLayer(layer);
    layerRef.current = layer;
    return () => {
      map.removeLayer(layer);
      layerRef.current = null;
    };
  }, [map, geojson]);

  return null;
}
