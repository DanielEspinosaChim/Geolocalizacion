/**
 * Versión de la aplicación — ÚNICA fuente de verdad.
 * Se muestra en el login y en el sidebar; al publicar un release se actualiza
 * SOLO este archivo (y opcionalmente el `version` de package.json para npm).
 *
 * Convención semver: MAYOR.MENOR.PARCHE
 *  - MAYOR: cambios incompatibles o rediseños completos
 *  - MENOR: funcionalidad nueva compatible
 *  - PARCHE: correcciones
 */
export const APP_VERSION = '0.2.0';

/** Etiqueta lista para pintar en la UI. */
export const VERSION_LABEL = `v${APP_VERSION}`;

/** Nombre comercial de la app, para que login/sidebar no lo dupliquen. */
export const APP_NAME = 'GeoFormal';
