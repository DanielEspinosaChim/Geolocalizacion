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

/** Deriva una key estable a partir del label (slug), como el editor legacy. */
export function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
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
