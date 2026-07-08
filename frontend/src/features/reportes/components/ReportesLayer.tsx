import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import { REPORTE_META, type Reporte } from '../model/reporte';

function iconoReporte(r: Reporte): L.DivIcon {
  const meta = REPORTE_META[r.tipo];
  return L.divIcon({
    className: '',
    html: `<div style="background:${meta.color};color:#fff;border-radius:50%;width:30px;height:30px;
             display:flex;align-items:center;justify-content:center;font-size:15px;border:3px solid #fff;
             box-shadow:0 2px 6px rgba(0,0,0,.4);${r.status === 'resuelto' ? 'opacity:.5' : ''}">${meta.emoji}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

/** Marcadores de reportes; click → selección (la card React hace de popup). */
export function ReportesLayer({ reportes, onSelect }: { reportes: Reporte[]; onSelect: (r: Reporte) => void }) {
  const map = useMap();
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    const grupo = L.layerGroup();
    for (const r of reportes) {
      if (r.lat == null || r.lng == null) continue;
      L.marker([r.lat, r.lng], { icon: iconoReporte(r) })
        .on('click', () => onSelectRef.current(r))
        .addTo(grupo);
    }
    map.addLayer(grupo);
    return () => {
      map.removeLayer(grupo);
    };
  }, [map, reportes]);

  return null;
}

/** Modo "clic en el mapa para ubicar": cursor crosshair + callback con lat/lng. */
export function UbicacionPicker({ activo, onPick }: { activo: boolean; onPick: (lat: number, lng: number) => void }) {
  const map = useMapEvents({
    click(e) {
      if (activo) onPick(e.latlng.lat, e.latlng.lng);
    },
  });

  useEffect(() => {
    map.getContainer().style.cursor = activo ? 'crosshair' : '';
    return () => {
      map.getContainer().style.cursor = '';
    };
  }, [map, activo]);

  return null;
}

/** Marcador temporal de la ubicación elegida para el nuevo reporte. */
export function UbicacionTemporal({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    const marker = L.marker([lat, lng], {
      icon: L.divIcon({
        className: '',
        html: `<div style="background:#f97316;color:#fff;border-radius:50%;width:28px;height:28px;
                 display:flex;align-items:center;justify-content:center;font-size:16px;
                 border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)">📍</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }),
    }).addTo(map);
    return () => {
      marker.remove();
    };
  }, [map, lat, lng]);
  return null;
}
