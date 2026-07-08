import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { TIPO_COLORS, tipoDe, type Candidato } from '../model/candidato';

interface ClusterLayerProps {
  candidatos: Candidato[];
  onSelect: (candidato: Candidato) => void;
}

interface EstadoCluster {
  markers: Map<string, L.CircleMarker>;
  datos: Map<string, Candidato>;
}

/**
 * Capa de clusters imperativa (leaflet.markercluster con chunkedLoading, como
 * el legacy: ~29k circleMarkers no son viables como componentes React).
 * Sincroniza por diff: agrega nuevos, quita ausentes y repinta cambios de tipo.
 */
export function ClusterLayer({ candidatos, onSelect }: ClusterLayerProps) {
  const map = useMap();
  const groupRef = useRef<L.MarkerClusterGroup | null>(null);
  const estadoRef = useRef<EstadoCluster>({ markers: new Map(), datos: new Map() });
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    const group = L.markerClusterGroup({
      chunkedLoading: true,
      chunkInterval: 200,
      chunkDelay: 50,
      maxClusterRadius: 60,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      disableClusteringAtZoom: 17,
    });
    map.addLayer(group);
    groupRef.current = group;
    const estado = estadoRef.current;
    return () => {
      map.removeLayer(group);
      groupRef.current = null;
      estado.markers.clear();
      estado.datos.clear();
    };
  }, [map]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    sincronizar(group, estadoRef.current, candidatos, (id) => {
      const candidato = estadoRef.current.datos.get(id);
      if (candidato) onSelectRef.current(candidato);
    });
  }, [candidatos]);

  return null;
}

function sincronizar(
  group: L.MarkerClusterGroup,
  { markers, datos }: EstadoCluster,
  candidatos: Candidato[],
  onClick: (placeId: string) => void,
) {
  const vistos = new Set<string>();
  const nuevos: L.CircleMarker[] = [];

  for (const c of candidatos) {
    if (c.lat == null || c.lng == null) continue;
    vistos.add(c.place_id);
    datos.set(c.place_id, c);
    const color = TIPO_COLORS[tipoDe(c)];
    const existente = markers.get(c.place_id);
    if (existente) {
      if (existente.options.fillColor !== color) existente.setStyle({ fillColor: color });
      continue;
    }
    const marker = L.circleMarker([c.lat, c.lng], {
      radius: 7,
      color: '#fff',
      weight: 1.5,
      fillColor: color,
      fillOpacity: 0.85,
    });
    marker.on('click', () => onClick(c.place_id));
    markers.set(c.place_id, marker);
    nuevos.push(marker);
  }

  const ausentes: L.Layer[] = [];
  for (const [id, marker] of markers) {
    if (!vistos.has(id)) {
      ausentes.push(marker);
      markers.delete(id);
      datos.delete(id);
    }
  }
  if (ausentes.length > 0) group.removeLayers(ausentes);
  if (nuevos.length > 0) group.addLayers(nuevos);
}
