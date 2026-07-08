import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

/** Centra el mapa en el reporte seleccionado. */
export function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 17);
  }, [map, lat, lng]);
  return null;
}
