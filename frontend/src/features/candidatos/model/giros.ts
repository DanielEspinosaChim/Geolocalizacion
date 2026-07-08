/** Categorías de Google Places → etiqueta en español (paridad con el legacy). */
export const GIROS_ES: Record<string, string> = {
  restaurant: 'Restaurante',
  food: 'Comida',
  cafe: 'Café',
  bar: 'Bar',
  beauty_salon: 'Salón de belleza',
  hair_care: 'Peluquería',
  car_repair: 'Taller mecánico',
  car_wash: 'Lavado de autos',
  laundry: 'Lavandería',
  store: 'Tienda',
  pharmacy: 'Farmacia',
  gym: 'Gimnasio',
  clothing_store: 'Ropa',
  hardware_store: 'Ferretería',
  bakery: 'Panadería',
  supermarket: 'Supermercado',
  school: 'Escuela',
  doctor: 'Médico',
  dentist: 'Dentista',
  manufacturer: 'Manufactura',
  lodging: 'Hospedaje',
  event_venue: 'Salón de eventos',
  farm: 'Rancho/Granja',
  electrician: 'Electricista',
  plumber: 'Plomero',
};

const GENERICOS = new Set(['point_of_interest', 'establishment', 'service', '']);

/** Primer giro reconocible del CSV de categorías (ej. "restaurant,food" → "Restaurante"). */
export function giroLabel(tipos: string | null | undefined): string {
  if (!tipos) return 'Negocio';
  const lista = tipos.split(',').map((t) => t.trim());
  for (const t of lista) if (GIROS_ES[t]) return GIROS_ES[t];
  return lista.find((t) => !GENERICOS.has(t)) ?? 'Negocio';
}

export { GENERICOS as GIROS_GENERICOS };
