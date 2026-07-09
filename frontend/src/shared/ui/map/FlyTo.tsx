import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

interface FlyToProps {
  lat: number;
  lng: number;
  /** Zoom mínimo al centrar; conserva el zoom actual si ya está más cerca. */
  zoom?: number;
}

/** Centra el mapa en un punto (ej. selección desde una lista). */
export function FlyTo({ lat, lng, zoom = 16 }: FlyToProps) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], Math.max(map.getZoom(), zoom));
  }, [map, lat, lng, zoom]);
  return null;
}
