import 'leaflet/dist/leaflet.css';
import type { LatLngExpression } from 'leaflet';
import type { PropsWithChildren } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';

export const MERIDA_CENTER: LatLngExpression = [20.9674, -89.5926];

interface MapCanvasProps extends PropsWithChildren {
  center?: LatLngExpression;
  zoom?: number;
  className?: string;
}

/**
 * Lienzo base del mapa (OSM, mismos tiles que el legacy). Las features añaden
 * sus capas como children (markers, geojson, clusters…).
 */
export function MapCanvas({
  center = MERIDA_CENTER,
  zoom = 11,
  className = '',
  children,
}: MapCanvasProps) {
  return (
    <MapContainer center={center} zoom={zoom} className={`h-full w-full ${className}`}>
      <TileLayer
        attribution="© OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      {children}
    </MapContainer>
  );
}
