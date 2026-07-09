/**
 * Categorías de Google Places → etiqueta en español.
 *
 * Los datos traen 248 categorías distintas; estas 107 cubren el 95 % de las
 * apariciones (el resto son colas de ≤15 casos). Lo que no esté aquí pasa por
 * `humanizar()`, de modo que nunca llegue a la interfaz una clave cruda del
 * backend como `food_store` o `hair_care`.
 */
export const GIROS_ES: Record<string, string> = {
  // Comida y bebida
  restaurant: 'Restaurante',
  food: 'Comida',
  food_store: 'Abarrotes',
  grocery_store: 'Abarrotes',
  cafe: 'Café',
  coffee_shop: 'Cafetería',
  bar: 'Bar',
  bakery: 'Panadería',
  pastry_shop: 'Pastelería',
  cake_shop: 'Pastelería',
  confectionery: 'Dulcería',
  dessert_shop: 'Postres',
  ice_cream_shop: 'Heladería',
  meal_takeaway: 'Comida para llevar',
  meal_delivery: 'Comida a domicilio',
  food_delivery: 'Comida a domicilio',
  fast_food_restaurant: 'Comida rápida',
  mexican_restaurant: 'Cocina mexicana',
  american_restaurant: 'Cocina americana',
  taco_restaurant: 'Taquería',
  hamburger_restaurant: 'Hamburguesas',
  pizza_restaurant: 'Pizzería',
  seafood_restaurant: 'Mariscos',
  barbecue_restaurant: 'Asados',
  breakfast_restaurant: 'Desayunos',
  brunch_restaurant: 'Desayunos',
  butcher_shop: 'Carnicería',
  night_club: 'Antro',

  // Comercio
  store: 'Tienda',
  supermarket: 'Supermercado',
  convenience_store: 'Tienda de conveniencia',
  clothing_store: 'Ropa',
  womens_clothing_store: 'Ropa de mujer',
  home_goods_store: 'Artículos para el hogar',
  furniture_store: 'Muebles',
  electronics_store: 'Electrónica',
  hardware_store: 'Ferretería',
  building_materials_store: 'Materiales de construcción',
  home_improvement_store: 'Mejoras del hogar',
  auto_parts_store: 'Refacciones',
  sporting_goods_store: 'Artículos deportivos',
  cosmetics_store: 'Cosméticos',
  florist: 'Florería',
  market: 'Mercado',
  wholesaler: 'Mayorista',
  supplier: 'Proveedor',
  general_store: 'Miscelánea',
  garden_center: 'Vivero',
  jewelry_store: 'Joyería',

  // Belleza y salud
  beauty_salon: 'Salón de belleza',
  hair_care: 'Peluquería',
  barber_shop: 'Barbería',
  nail_salon: 'Uñas',
  spa: 'Spa',
  massage: 'Masajes',
  body_art_service: 'Tatuajes',
  hair_salon: 'Estética',
  makeup_artist: 'Maquillaje',
  massage_spa: 'Spa de masajes',
  health: 'Salud',
  pharmacy: 'Farmacia',
  doctor: 'Médico',
  medical_clinic: 'Clínica',
  dentist: 'Dentista',
  physiotherapist: 'Fisioterapia',
  veterinary_care: 'Veterinaria',
  chiropractor: 'Quiropráctico',
  pet_care: 'Cuidado de mascotas',

  // Deporte
  gym: 'Gimnasio',
  fitness_center: 'Gimnasio',
  sports_activity_location: 'Centro deportivo',
  sports_complex: 'Complejo deportivo',
  sports_school: 'Escuela deportiva',
  athletic_field: 'Campo deportivo',
  swimming_pool: 'Alberca',
  yoga_studio: 'Yoga',

  // Servicios y oficios
  car_repair: 'Taller mecánico',
  car_wash: 'Lavado de autos',
  laundry: 'Lavandería',
  electrician: 'Electricista',
  plumber: 'Plomero',
  general_contractor: 'Constructora',
  manufacturer: 'Manufactura',
  transportation_service: 'Transporte',
  storage: 'Bodega',
  parking_lot: 'Estacionamiento',
  parking: 'Estacionamiento',
  shipping_service: 'Paquetería',
  accounting: 'Contabilidad',
  internet_cafe: 'Cibercafé',
  consultant: 'Consultoría',
  lawyer: 'Abogado',
  finance: 'Finanzas',
  real_estate_agency: 'Inmobiliaria',
  travel_agency: 'Agencia de viajes',
  corporate_office: 'Oficina',
  association_or_organization: 'Asociación',

  // Hospedaje y eventos
  lodging: 'Hospedaje',
  hotel: 'Hotel',
  private_guest_room: 'Habitación privada',
  event_venue: 'Salón de eventos',
  banquet_hall: 'Salón de banquetes',
  wedding_venue: 'Salón de bodas',
  bed_and_breakfast: 'Posada',

  // Otros
  school: 'Escuela',
  farm: 'Rancho / Granja',
  ranch: 'Rancho',
};

/**
 * Categorías sin valor informativo: Google se las pone a casi todo. `service`
 * entra aquí a propósito — en "service,car_repair" la útil es la segunda.
 */
const GENERICOS = new Set(['point_of_interest', 'establishment', 'service', '']);

/**
 * Último recurso para una categoría sin traducir: `sports_activity_location`
 * pasa a "Sports activity location". Imperfecto, pero legible; nunca un
 * identificador con guiones bajos.
 */
function humanizar(clave: string): string {
  const texto = clave.replace(/_/g, ' ').trim();
  const inicial = texto[0];
  return inicial ? inicial.toUpperCase() + texto.slice(1) : 'Negocio';
}

/** Traduce una categoría suelta; la humaniza si no está en el diccionario. */
export function giroEs(giro: string): string {
  return GIROS_ES[giro] ?? humanizar(giro);
}

/** Primer giro reconocible del CSV de categorías (ej. "restaurant,food" → "Restaurante"). */
export function giroLabel(tipos: string | null | undefined): string {
  if (!tipos) return 'Negocio';
  const lista = tipos.split(',').map((t) => t.trim());
  for (const t of lista) if (GIROS_ES[t]) return GIROS_ES[t];
  const primero = lista.find((t) => !GENERICOS.has(t));
  return primero ? humanizar(primero) : 'Negocio';
}

export { GENERICOS as GIROS_GENERICOS };
