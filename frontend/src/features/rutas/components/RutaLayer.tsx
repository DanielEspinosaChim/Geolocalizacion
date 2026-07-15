import type { GeoJsonObject } from 'geojson';
import L from 'leaflet';
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import type { RutaCalculada } from '../model/ruta';

function iconoNumerado(n: number): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="background:#2563eb;color:#fff;border-radius:50%;width:30px;height:30px;
             display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;
             border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.5)">${n}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

interface RutaLayerProps {
  ruta: RutaCalculada;
  /** Click en una parada: abre el popup completo (lo pinta la página). */
  onParadaClick?: (placeId: string) => void;
}

/** Línea de la ruta + marcadores numerados por orden de visita. */
export function RutaLayer({ ruta, onParadaClick }: RutaLayerProps) {
  const map = useMap();

  useEffect(() => {
    const grupo = L.layerGroup();
    const linea = L.geoJSON(ruta.geometry as GeoJsonObject, {
      style: { color: '#2563eb', weight: 5, opacity: 0.85 },
    }).addTo(grupo);
    ruta.waypoints_ordenados.forEach((pt, i) => {
      const marker = L.marker([pt.lat, pt.lng], { icon: iconoNumerado(i + 1) })
        .bindTooltip(`${i + 1}. ${pt.nombre}`)
        .addTo(grupo);
      if (onParadaClick && pt.place_id) {
        const placeId = pt.place_id;
        marker.on('click', () => onParadaClick(placeId));
      }
    });
    map.addLayer(grupo);
    const bounds = linea.getBounds();
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30] });
    return () => {
      map.removeLayer(grupo);
    };
  }, [map, ruta, onParadaClick]);

  return null;
}
