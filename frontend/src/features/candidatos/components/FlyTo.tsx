import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

interface FlyToProps {
  lat: number;
  lng: number;
  zoom?: number;
}

/** Centra el mapa al cambiar el objetivo (selección desde la lista). */
export function FlyTo({ lat, lng, zoom = 16 }: FlyToProps) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], Math.max(map.getZoom(), zoom));
  }, [map, lat, lng, zoom]);
  return null;
}
