/** Utilidades de geolocalización (agnósticas al dominio). */

export interface PosicionGPS {
  lat: number;
  lng: number;
  precision: number; // metros
}

const GPS_ERRORES: Record<number, string> = {
  1: 'Permiso de ubicación denegado',
  2: 'Ubicación no disponible',
  3: 'Tiempo de espera agotado',
};

export class GpsError extends Error {}

export function obtenerGPS(): Promise<PosicionGPS> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new GpsError('Este dispositivo no tiene GPS disponible'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          precision: Math.round(pos.coords.accuracy),
        }),
      (err) => reject(new GpsError(GPS_ERRORES[err.code] ?? 'No se pudo obtener tu ubicación')),
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 0 },
    );
  });
}

/** Distancia haversine en metros (redondeada). */
export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
