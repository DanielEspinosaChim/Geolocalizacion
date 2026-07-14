import 'leaflet/dist/leaflet.css';
import type { LatLngExpression } from 'leaflet';
import type { PropsWithChildren } from 'react';
import { MapContainer, TileLayer, ZoomControl } from 'react-leaflet';

export const MERIDA_CENTER: LatLngExpression = [20.9674, -89.5926];

interface MapCanvasProps extends PropsWithChildren {
  center?: LatLngExpression;
  zoom?: number;
  className?: string;
  /**
   * Esquina del control de zoom. Las vistas con panel flotante a la izquierda
   * (Mapa) lo mueven a 'topright' para que no quede debajo del panel glass.
   */
  zoomPosition?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright';
}

/**
 * Lienzo base del mapa (OSM, mismos tiles que el legacy). Las features añaden
 * sus capas como children (markers, geojson, clusters…).
 *
 * `isolate` es imprescindible. Leaflet apila sus paneles y controles con
 * z-index de 400 a 800 y, sin un contexto de apilamiento propio, esos valores
 * compiten en la raíz del documento: cualquier overlay nuestro (el desplegable
 * del Combobox vive en un portal con z-index 50) se dibujaría por debajo del
 * mapa y sus clics irían a parar al mapa. Con `isolate` la escala interna de
 * Leaflet queda contenida y el mapa ocupa el `z-map` de nuestros tokens.
 */
export function MapCanvas({
  center = MERIDA_CENTER,
  zoom = 11,
  className = '',
  zoomPosition = 'topleft',
  children,
}: MapCanvasProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      zoomControl={false}
      className={`isolate z-map h-full w-full ${className}`}
    >
      <ZoomControl position={zoomPosition} />
      <TileLayer
        attribution="© OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      {children}
    </MapContainer>
  );
}
