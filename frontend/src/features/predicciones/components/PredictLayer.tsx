import L from 'leaflet';
import { useEffect } from 'react';
import { useMapEvents } from 'react-leaflet';

interface PredictLayerProps {
  activo: boolean;
  punto: { lat: number; lng: number } | null;
  onPredict: (lat: number, lng: number) => void;
}

/** Cursor crosshair + clic para predecir + marcador del punto analizado. */
export function PredictLayer({ activo, punto, onPredict }: PredictLayerProps) {
  const map = useMapEvents({
    click(e) {
      if (activo) onPredict(e.latlng.lat, e.latlng.lng);
    },
  });

  useEffect(() => {
    map.getContainer().style.cursor = activo ? 'crosshair' : '';
    return () => {
      map.getContainer().style.cursor = '';
    };
  }, [map, activo]);

  useEffect(() => {
    if (!punto) return;
    const marker = L.circleMarker([punto.lat, punto.lng], {
      radius: 10,
      color: '#fbbf24',
      weight: 3,
      fillColor: '#fbbf24',
      fillOpacity: 0.3,
    }).addTo(map);
    map.setView([punto.lat, punto.lng], Math.max(map.getZoom(), 15));
    return () => {
      marker.remove();
    };
  }, [map, punto]);

  return null;
}
