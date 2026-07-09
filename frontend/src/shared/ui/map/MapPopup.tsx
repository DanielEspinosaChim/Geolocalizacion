import L from 'leaflet';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useMap } from 'react-leaflet';

interface MapPopupProps {
  lat: number;
  lng: number;
  onClose: () => void;
  /** Ancho del globo, en px. Debe coincidir con el del contenido. */
  width?: number;
  children: ReactNode;
}

/**
 * Globo de Leaflet anclado a unas coordenadas, con contenido React dentro.
 *
 * Leaflet exige un nodo del DOM como contenido, así que se le pasa un `<div>`
 * vacío y React lo rellena por portal: el contenido conserva su estado, sus
 * hooks y el árbol de contexto de la app. Leaflet aporta lo suyo — la cola que
 * apunta al marcador, el auto-paneo si el globo se sale de la vista y el
 * bloqueo de la propagación de clics hacia el mapa.
 *
 * Se le pasa `key={id}` para que cambiar de marcador remonte el contenido.
 */
export function MapPopup({ lat, lng, onClose, width = 288, children }: MapPopupProps) {
  const map = useMap();
  const contenedor = useMemo(() => document.createElement('div'), []);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const popup = L.popup({
      className: 'popup-tarjeta',
      closeButton: true,
      minWidth: width,
      maxWidth: width,
      autoPan: true,
      autoPanPadding: [24, 24],
      offset: [0, -4],
    })
      .setLatLng([lat, lng])
      .setContent(contenedor)
      .openOn(map);

    // La ✕ de Leaflet y la tecla Escape cierran el globo por su cuenta; hay que
    // avisar a React para que suelte la selección y no quede desincronizada.
    function alCerrar(e: L.PopupEvent) {
      if (e.popup === popup) onCloseRef.current();
    }
    map.on('popupclose', alCerrar);

    return () => {
      // Primero se desuscribe: cerrar el globo al desmontar emitiría
      // `popupclose` y `onClose` correría durante el propio desmontaje.
      map.off('popupclose', alCerrar);
      popup.close();
    };
  }, [map, lat, lng, width, contenedor]);

  return createPortal(children, contenedor);
}
