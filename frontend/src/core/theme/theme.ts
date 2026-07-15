/**
 * Tema claro/oscuro de la app. Los colores viven en styles/tokens.css:
 * `[data-theme='dark']` redefine los tokens y Tailwind (darkMode: selector)
 * genera las variantes `dark:`. Aquí solo se decide QUÉ tema está activo,
 * se persiste y se publica a los suscriptores (useTheme).
 */
export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'geoformal:theme';
const listeners = new Set<() => void>();
let actual: Theme = 'light';

function leerPreferencia(): Theme {
  try {
    const guardado = localStorage.getItem(STORAGE_KEY);
    if (guardado === 'light' || guardado === 'dark') return guardado;
  } catch {
    /* localStorage puede fallar en modo incógnito estricto; se ignora. */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function aplicar(theme: Theme) {
  actual = theme;
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* sin persistencia no pasa nada: la sesión actual sí cambia. */
  }
  listeners.forEach((fn) => fn());
}

/** Se llama UNA vez en el arranque (main.tsx), antes del primer render. */
export function initTheme() {
  aplicar(leerPreferencia());
}

export function getTheme(): Theme {
  return actual;
}

export function toggleTheme() {
  aplicar(actual === 'dark' ? 'light' : 'dark');
}

/** Para useSyncExternalStore: notifica cada cambio de tema. */
export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
