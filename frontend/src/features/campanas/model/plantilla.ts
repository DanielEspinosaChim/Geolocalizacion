import { z } from 'zod';

export const CAMPO_TIPOS = ['texto', 'textarea', 'numero', 'bool', 'opciones', 'foto'] as const;
export type CampoTipo = (typeof CAMPO_TIPOS)[number];

export const CAMPO_TIPO_LABELS: Record<CampoTipo, string> = {
  texto: 'Texto',
  textarea: 'Párrafo',
  numero: 'Número',
  bool: 'Sí/No',
  opciones: 'Lista',
  foto: 'Foto',
};

export const campoSchema = z.object({
  key: z.string(),
  label: z.string().catch(''),
  tipo: z.enum(CAMPO_TIPOS).catch('texto'),
  opciones: z.array(z.string()).nullish(),
  requerido: z.boolean().nullish(),
});
export type Campo = z.infer<typeof campoSchema>;

export const plantillaSchema = z.object({
  id: z.string(),
  nombre: z.string().catch('Plantilla'),
  descripcion: z.string().nullish(),
  campos: z.array(campoSchema).catch([]),
  es_default: z.boolean().nullish(),
});
export const plantillaListSchema = z.array(plantillaSchema);
export type Plantilla = z.infer<typeof plantillaSchema>;

/** Valor de un campo de visita (los datos_json que se envían al backend). */
export type ValorCampo = string | number | boolean;
export type DatosVisita = Record<string, ValorCampo>;

/**
 * Deriva una key estable a partir del label (slug), como el editor legacy.
 *
 * Normaliza los acentos antes de filtrar: sin esto, "Teléfono" acababa en
 * "telfono" porque la «é» se descartaba entera en vez de volverse «e».
 */
export function slugify(label: string): string {
  return label
    .normalize('NFD') // separa la letra de su tilde
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

/**
 * Id único para un campo nuevo del editor.
 *
 * Antes se usaba `c_${Date.now()}`: dos campos añadidos dentro del mismo
 * milisegundo compartían la `key` de React y uno de ellos no se pintaba.
 */
export function nuevaKeyCampo(): string {
  return `c_${crypto.randomUUID()}`;
}

/** Elige la plantilla a usar: la última usada en el negocio, la default, o la primera. */
export function elegirPlantilla(
  plantillas: Plantilla[],
  ultimaUsadaId?: string | null,
): Plantilla | undefined {
  return (
    (ultimaUsadaId ? plantillas.find((p) => p.id === ultimaUsadaId) : undefined) ??
    plantillas.find((p) => p.es_default) ??
    plantillas[0]
  );
}
