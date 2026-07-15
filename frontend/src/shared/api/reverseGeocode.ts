import axios from 'axios';

/**
 * Reverse geocoding con Nominatim (servicio externo — no pasa por @core/api
 * a propósito: no debe llevar el Authorization de nuestra API).
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const coords = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  try {
    const { data } = await axios.get<{ display_name?: string }>(
      'https://nominatim.openstreetmap.org/reverse',
      { params: { lat, lon: lng, format: 'json' }, timeout: 6000 },
    );
    const dir = data.display_name;
    return dir ? dir.split(',').slice(0, 3).join(',') : coords;
  } catch {
    return coords;
  }
}
