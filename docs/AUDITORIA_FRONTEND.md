# Auditoría y plan de refactorización UI/UX — `frontend/`

> **Alcance:** exclusivamente `frontend/` (React 19 + Vite + Tailwind + Screaming Architecture).
> El backend NO se toca; toda observación que lo involucre aparece como ⚠️ *advertencia informativa*.
>
> **Metodología:** lectura del grafo (`graphify-out/GRAPH_REPORT.md`), inventario de los 153 archivos
> de `src/`, conteo de patrones duplicados con búsqueda estática y revisión manual de los módulos
> núcleo (`core/api`, `core/auth`, `app/router`, `shared/ui`, ESLint, Tailwind, Vite).
>
> Fecha: 2026-07-08 · Rama: `feature/plan-de-migracion` · Commit base del grafo: `812f0ce1`

---

## 0. Diagnóstico general (calibración honesta)

Este frontend **no es un proyecto espagueti**: ya tiene design tokens HSL, cliente HTTP único con
interceptores, sesión en memoria (sin `localStorage`), rutas lazy con guards por rol, fronteras de
capas impuestas por ESLint (`eslint-plugin-boundaries`) y 42 archivos consumiendo `@shared/ui`.
Ningún archivo supera 150 líneas y no hay ciclos de imports.

Lo que sí hay es una **capa de abstracción incompleta**: los primitivos existen (Button, Modal,
Table, Toaster…) pero varios patrones recurrentes quedaron sin extraer y las vistas los re-implementan
a mano. La auditoría se concentra ahí: cerrar la brecha entre "hay design system" y "todo pasa por
el design system".

**Deuda medida (evidencia numérica):**

| Patrón sin abstraer | Ocurrencias | Archivos afectados |
| --- | --- | --- |
| `window.confirm()` nativo (sin tema, bloquea el hilo) | 6 | `CampanaDetalle`, `UsuariosList`, `ReporteItem`, `useResolverConGPS` |
| `<button>` crudo fuera de `shared/ui` | 15 | 12 archivos de features |
| `<input>/<select>` crudos fuera de `shared/ui` | ~10 | `FiltrosBar`, `CampoEditor`, `NegociosTabla`, `AgregarNegocios`… |
| Empty state artesanal (`<p className="p-4 text-center text-xs text-fg-muted">`) | 6 | reportes, candidatos, admin, campañas |
| Clase de "card" repetida (`rounded-card border border-border bg-surface`) | 13 | 11 archivos |
| `toast.error(e.message \|\| '…')` copiado en cada mutación | 35 | 12 hooks de API |
| Overrides de tamaño en Button (`className="px-2 py-1 text-[11px]"`) | recurrente | admin, campañas, rutas |
| Tamaños tipográficos mágicos (`text-[10px]`, `text-[11px]`) | recurrente | AppShell, listas, chips |

---

## 1. Auditoría de reusabilidad: componentes faltantes y cómo extraerlos

Todos van a `src/shared/ui/` (agnósticos al dominio) y se re-exportan desde `shared/ui/index.ts`.
Orden = prioridad (impacto × frecuencia).

### 1.1 `ConfirmDialog` + hook `useConfirm()` — CRÍTICO
- **Problema:** 6 `window.confirm` nativos: rompen el tema visual, no son accesibles, bloquean el
  hilo y en móvil/WebView pueden estar deshabilitados.
- **Diseño:** dialogo Radix (reutiliza `Modal`) con API imperativa basada en promesas:
  ```tsx
  const confirm = useConfirm();
  if (await confirm({ title: '¿Eliminar campaña?', tone: 'danger', confirmLabel: 'Eliminar' })) { … }
  ```
  Un `ConfirmProvider` en `AppProviders` monta un único dialog y resuelve la promesa al elegir.
- **Extracción:** reemplazo 1:1 en los 6 call-sites; los dos de `useResolverConGPS` pasan el texto
  multilínea como `description`.

### 1.2 `EmptyState` — ALTO
- **Problema:** 6 variantes artesanales del mismo párrafo centrado; padding y tamaño divergen ya
  (`p-4 text-xs` vs `p-6 text-sm` vs `p-3 text-xs`).
- **Diseño:** `EmptyState({ icon?, title, hint?, action? })` — un solo tamaño tipográfico tokenizado,
  slot opcional de acción ("Crear campaña").
- **Extracción:** sustituir los 6 párrafos; `CampanasList` aprovecha el slot `action`.

### 1.3 `Card` (o clase `@layer components .card`) — ALTO
- **Problema:** `rounded-card border border-border bg-surface` copiado 13 veces; si mañana cambia la
  elevación de las superficies hay que tocar 11 archivos.
- **Diseño recomendado:** componente `Card({ padded?, raised?, as? })`. Alternativa mínima: clase
  `.card` en `@layer components` (ver §3). El componente es preferible porque permite variantes
  (`raised`, `interactive` con hover) sin strings.
- **Extracción:** mecánica, sin cambio visual. Ideal para hacerla feature por feature junto con 1.2.

### 1.4 `Button` v2: `size`, variante `danger`, estado `loading` — ALTO
- **Problema:** los consumidores "hackean" el tamaño (`className="px-2 py-1 text-[11px]"`) y el tono
  destructivo (`variant="ghost" className="text-danger"` en `UsuariosList:80`). No hay estado de
  carga: cada vista decide si deshabilita o no durante `isPending` (30 usos de `isPending/isLoading`).
- **Diseño:**
  ```tsx
  <Button size="sm" variant="danger" loading={eliminar.isPending}>Eliminar</Button>
  ```
  `size: 'sm' | 'md'`, `variant: 'primary' | 'secondary' | 'ghost' | 'danger'`, `loading` muestra el
  `Spinner` existente y fuerza `disabled`. Implementar variantes con **CVA + tailwind-merge** (§7.3).
- **Extracción:** buscar todos los `className` de override sobre `Button` y mapearlos a props.

### 1.5 `Chip` / `ToggleChip` — MEDIO
- **Problema:** tres implementaciones de "píldora" independientes: filtros por tipo en
  `FiltrosBar` (con mapa de clases por tono), `EstadoCargaChip` y los toggles de capas en
  `CapasToggles`. Todas re-declaran `rounded-full border px-2.5 py-1 text-[11px] font-bold`.
- **Diseño:** `Chip({ tone: 'danger'|'warning'|'success'|'neutral'|'primary', active?, onToggle? })`
  con `aria-pressed` integrado (hoy solo `FiltrosBar` lo pone).
- **Extracción:** `CHIP_ACTIVO` de `FiltrosBar` se convierte en el mapa de tonos del propio Chip;
  `Badge` (que ya tiene `BadgeTone`) puede compartir ese mapa.

### 1.6 `SearchInput` — MEDIO
- **Problema:** el input de búsqueda con su string de ~20 clases está duplicado en `FiltrosBar`,
  `AgregarNegocios` y `NegociosTabla`; ya diverge del estilo de `TextField`.
- **Diseño:** wrapper de `TextField` con `type="search"`, icono de lupa, botón de limpiar y
  `debounce` opcional (prop `onDebouncedChange`, elimina lógica repetida en las vistas).

### 1.7 `Checkbox` / `Switch` — MEDIO
- **Problema:** checkbox nativo sin estilo en `NegociosTabla`; los toggles de `CapasToggles` son
  botones artesanales que semánticamente son switches.
- **Diseño:** `Checkbox` estilizado con tokens y `Switch` (Radix `@radix-ui/react-switch`) para
  las capas del mapa.

### 1.8 `IconButton` + módulo de iconos — MEDIO
- **Problema:** SVGs inline dispersos (la X del `Modal`, `GoogleIcon`, flechas en listas) y botones
  de solo-icono sin área táctil ni `aria-label` consistentes.
- **Diseño:** `IconButton({ label, icon, size, variant })` (el `label` obligatorio garantiza a11y)
  y adoptar **lucide-react** como fuente de iconos (§7.5).

### 1.9 `DataTable` dinámica — MEDIO/BAJO
- **Problema:** existe `Table/THead/Tr/Td` (bien para tablas estáticas), pero `NegociosTabla` arma a
  mano selección por checkbox, búsqueda y estados por fila; `UsuariosList` renderiza una "tabla" como
  divs. Con el volumen actual no urge una librería.
- **Diseño:** `DataTable<T>({ columns, rows, rowKey, selectable?, onSelectionChange?, empty? })`
  construida sobre los primitivos `Table` existentes + `EmptyState` + `Skeleton` integrados
  (estado `loading` → filas skeleton automáticas). Migrar a TanStack Table solo si aparecen
  sort/paginación/columnas dinámicas (§7.2).

### 1.10 `FormModal` (patrón, no componente ciego) — BAJO
- **Problema:** `CrearUsuarioModal`, `CambiarPasswordModal`, `CrearCampanaModal` y `PlantillasModal`
  repiten la misma coreografía: Modal + react-hook-form + zod + submit con `isPending` + toast.
- **Diseño:** no un mega-componente; un helper `useFormModal(schema, mutation)` que entregue
  `{ form, onSubmit, submitting }` y un `<ModalFooter>` compartido (Cancelar/Confirmar alineados
  igual en todos los modales).

### 1.11 Reciclaje dentro de features (no va a shared)
- `UsuarioRow` (avatar con inicial) → si otro listado lo necesita, extraer `Avatar` a shared; hoy no.
- `FlyTo` (candidatos) y `FlyToReporte` (reportes) hacen lo mismo sobre Leaflet → unificar en
  `shared/ui/map/FlyTo.tsx` junto a `MapCanvas`.
- `fmt()`/`formatearTiempo()` (predicciones, rutas) → consolidar en `shared/lib/format.ts`.

---

## 2. Calificación del proyecto (antes → después)

Escala 1–100. "Después" = con el plan de §8 completado.

| Criterio | Hoy | Proyectado | Justificación |
| --- | :-: | :-: | --- |
| Reutilización de componentes | **72** | **93** | Primitivos sólidos y adoptados (42 archivos), pero 6 patrones recurrentes sin extraer y overrides de `className` que erosionan la API del design system. |
| Consistencia UX/UI | **70** | **93** | Tokens y tema claro/oscuro ejemplares; lo rompen los `window.confirm` nativos, empty states divergentes y tipografías mágicas `text-[10px]/[11px]`. |
| Manejo del frontend (arquitectura, estado) | **85** | **94** | Screaming Architecture real y vigilada por ESLint; sin ciclos; archivos pequeños. Falta patrón único para confirmaciones y formularios modales. |
| Lógica de negocio (models, validación) | **82** | **90** | Zod en modelos y env, tests por feature. Duplicación menor de formateadores y de FlyTo. |
| Consumo de API | **80** | **93** | Cliente único, `ApiError` normalizado, keys por feature. Contra: manejo de errores copiado 35 veces, `retry: 2` reintenta también errores 4xx, sin `onError` global. |
| Seguridad frontend | **78** | **90** | Token en memoria (correcto), guards + revalidación backend, fetch prohibido por lint. Contra: 403 fuerza signOut (§4.2), App Check aún sin enforcement, fuga de coordenadas a Nominatim sin aviso. |
| **Global** | **78** | **92** | |

---

## 3. Sistema de diseño y Tailwind

Lo existente (tokens HSL en `styles/tokens.css` + mapeo en `tailwind.config.ts` + `darkMode` por
selector) es la base correcta. Falta completar la tokenización:

### 3.1 Ampliar tokens (`tokens.css` + `tailwind.config.ts`)
```css
:root {
  /* tipografía — mata los text-[10px]/text-[11px] mágicos */
  --text-2xs: 0.625rem;   /* 10px — metadatos */
  --text-xs2: 0.6875rem;  /* 11px — chips, celdas densas */

  /* sombras (hoy se usa shadow-lg/shadow-2xl arbitrariamente) */
  --shadow-card: 0 1px 3px hsl(var(--bg) / 0.4);
  --shadow-overlay: 0 25px 50px -12px hsl(var(--bg) / 0.7);

  /* z-index con escala (hoy: z-40/z-50 hardcodeados en Modal) */
  --z-map: 10; --z-panel: 20; --z-overlay: 40; --z-modal: 50; --z-toast: 60;

  /* motion */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --duration-fast: 150ms;
}
```
En `tailwind.config.ts`: `fontSize: { '2xs': 'var(--text-2xs)', … }`, `boxShadow: { card, overlay }`,
`zIndex: { map, panel, overlay, modal, toast }`. **Regla:** ningún valor arbitrario `[…]` de color,
tamaño tipográfico o z-index en las vistas (auditable con grep en CI).

### 3.2 Limpieza de clases repetidas
1. Los strings largos repetidos se eliminan **vía componentes** (§1.3, §1.6), no vía `@apply`
   indiscriminado. `@layer components` solo para lo que no puede ser componente (ya se hace bien
   con los clusters de Leaflet en `index.css`).
2. **CVA + tailwind-merge** para variantes de Button/Chip/Badge/Alert (§7.3): elimina los
   `Record<Variant, string>` manuales y hace seguros los `className` extra.
3. **`prettier-plugin-tailwindcss`** (falta en devDependencies): orden canónico de clases; los
   diffs dejan de pelearse por orden de utilidades.

### 3.3 Reglas del tema
- Un solo lugar cambia el tema: `tokens.css`. El plan **no** introduce colores nuevos.
- El toggle claro/oscuro ya existe vía `[data-theme='light']`; documentar en `frontend/README.md`
  cómo se persiste la preferencia (hoy no hay UI para cambiarla — candidato a `UserMenu`).

---

## 4. Seguridad, API y estados de UI

### 4.1 Lo que ya está bien (no tocar)
- **Token nunca en `localStorage`**: vive en memoria del SDK de Firebase; `getFreshToken()` en cada
  request evita el bug del legacy (token congelado 60 min). ESLint además **prohíbe**
  `localStorage.setItem` y `fetch` global — la regla ya existe y funciona.
- Config Firebase en cliente es pública por diseño (correcto el comentario en `env.ts`); la
  autorización real la revalida el backend en cada endpoint.
- `env.ts` valida con Zod y falla al arrancar (fail-fast).

### 4.2 Hallazgos y correcciones (frontend)
1. **`403` no debe cerrar la sesión** — `http.ts:35` trata 401 y 403 igual (`signOutAndRedirect`).
   Un técnico que toque un endpoint de admin (403 legítimo) pierde su sesión completa. Corregir:
   `401 → signOutAndRedirect()`; `403 → toast + redirect('/')` conservando sesión.
2. **`retry: 2` global reintenta errores 4xx** — `queryClient.ts` debe reintentar solo red/5xx:
   ```ts
   retry: (count, err) => count < 2 && (!(err instanceof ApiError) || (err.status ?? 500) >= 500)
   ```
3. **Manejo de errores global (elimina 35 duplicados):** registrar `MutationCache`/`QueryCache` con
   `onError` que dispare `toast.error(mensajeDe(error))`; las mutaciones solo declaran
   `meta: { errorMessage: 'Error al crear la campaña' }` cuando quieren personalizar, y `onError`
   local únicamente para lógica (rollback). Mismo toast estandarizado para fallo de red
   (`ApiError` sin `status`) con mensaje "Sin conexión con el servidor".
4. **Fuga de datos a Nominatim** — `reverseGeocode.ts` manda coordenadas de reportes a
   `nominatim.openstreetmap.org` (correcto que no lleve el Bearer, pero es un tercero). Acción
   mínima: documentarlo en política de privacidad interna; ideal: proxyearlo por el backend
   (⚠️ *advertencia informativa backend*).
5. **`window.confirm` con datos interpolados** (`¿Eliminar a ${u.email}?`) desaparece con
   `ConfirmDialog` (§1.1), que renderiza como texto React (sin superficie de inyección).
6. **App Check**: el frontend ya lo activa si hay `VITE_RECAPTCHA_SITE_KEY`; sin *enforcement* en
   el backend es decorativo (⚠️ ya registrado en `docs/PENDIENTES.md` — solo recordatorio).

### 4.3 ⚠️ Advertencias informativas de backend (NO se tocan aquí)
- **CSP / security headers**: el backend que sirve `frontend/dist` debería emitir
  `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`. Hoy el frontend no puede
  compensarlo.
- **Proxy dev desalineado**: `vite.config.ts` proxya `/api` → `localhost:8080`, pero
  `backend/app.py` arranca por defecto en `8765`. En dev el proxy solo funciona si se exporta
  `VITE_API_PROXY=http://localhost:8765` o se corre el backend con `PORT=8080`. Ver §5.4.
- Mensajes de error del backend llegan por `detail`/`message`; conviene garantizar que nunca
  incluyan trazas internas, porque el frontend los muestra en toasts.

### 4.4 Estados de UI estandarizados
Contrato por vista de datos: **loading → `Skeleton`; error → `Alert` con retry; vacío →
`EmptyState`; ok → contenido**. Hoy cada página lo resuelve distinto. Extraer
`<QueryBoundary query={q} skeleton={<ListSkeleton/>} empty={<EmptyState…/>}>{(data) => …}</QueryBoundary>`
en `shared/ui` para volverlo declarativo.

---

## 5. Rutas: protección, redirecciones y lazy loading

Lo actual ya es el patrón correcto (loaders `requireAuth`/`requireRole`, `lazy:` por feature,
`redirectIfAuthed`, índice por rol). Mejoras:

1. **Ruta 404**: no existe catch-all. Añadir `{ path: '*', element: <NotFoundPage /> }` dentro del
   shell (aprovecha `requireAuth`) con enlace de regreso.
2. **Fallback de lazy**: al navegar a una feature aún no descargada no hay indicador. Usar
   `useNavigation()` en `AppShell` para una barra de progreso fina (2px, `bg-primary`) bajo el
   header durante `state === 'loading'`.
3. **Prefetch por intención**: en `NavTabs`, `onPointerEnter` dispara el `import()` de la feature
   (los `lazy` ya están separados por chunk gracias a `manualChunks` + rutas lazy).
4. **Puerto 8765 (requisito):** en `vite.config.ts`:
   ```ts
   server: {
     port: 8765,
     strictPort: true,  // falla en vez de saltar a 8766 en silencio (hoy salta a 5174)
     proxy: { '/api': { target: process.env.VITE_API_PROXY ?? 'http://localhost:8080', changeOrigin: true } },
   },
   ```
   Hoy corre en 5174 precisamente porque no hay `port` fijado y el 5173 estaba ocupado.
   ⚠️ *Advertencia backend:* `backend/app.py` también usa 8765 por defecto. En dev deben convivir:
   arrancar el backend con `PORT=8080` (variable de entorno, sin tocar código) para que además
   coincida con el target por defecto del proxy; en prod no hay conflicto (el backend en 8765 sirve
   el `dist`, no corre Vite).
5. **Centralizar metadatos de ruta**: `NavTabs` y `router/index.tsx` mantienen listas paralelas de
   rutas/roles. Extraer `app/router/routes.ts` con `{ path, label, roles, lazy }` y generar ambos
   desde ahí — una sola fuente de verdad para "qué ve cada rol".

---

## 6. ESLint: reglas estrictas de la arquitectura

El `eslint.config.js` actual ya impone boundaries, entry-points, prohibición de `fetch`/localStorage
y límites de tamaño. **Deltas propuestos** (archivo completo listo para reemplazar abajo):

- `window.confirm/alert/prompt` prohibidos (tras implementar §1.1).
- Límites de tamaño pasan de `warn` a **`error`** al cerrar la Fase 2 (evita regresión).
- `eslint-plugin-react` para **`react/jsx-max-depth` (máx. 6)** — el "callback hell de JSX".
- **Anti prop-drilling:** `max-params` ya en 4; se añade límite de props vía profundidad y la
  convención (documentada en `features/README.md`) de co-ubicar estado con quien lo usa.
- `import/order` con grupos por capa (core → shared → features → relativo).
- Prohibir valores arbitrarios de color en clases (`bg-[#`, `text-[#`) — el tema vive en tokens.

```js
// frontend/eslint.config.js — versión endurecida
import js from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import importPlugin from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { boundaries, import: importPlugin, 'jsx-a11y': jsxA11y, react, 'react-hooks': reactHooks },
    settings: {
      react: { version: 'detect' },
      'import/resolver': { typescript: { project: './tsconfig.app.json' } },
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app' },
        { type: 'feature', pattern: 'src/features/*', capture: ['name'] },
        { type: 'shared', pattern: 'src/shared' },
        { type: 'core', pattern: 'src/core' },
      ],
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/only-throw-error': ['error', { allow: [{ from: 'lib', name: 'Response' }] }],
      ...jsxA11y.flatConfigs.recommended.rules,

      /* 1 ── Fronteras: app → features → shared → core */
      'boundaries/element-types': ['error', {
        default: 'disallow',
        rules: [
          { from: ['app'], allow: ['app', 'feature', 'shared', 'core'] },
          { from: ['feature'], allow: ['shared', 'core', 'feature'] },
          { from: ['shared'], allow: ['shared', 'core'] },
          { from: ['core'], allow: ['core'] },
        ],
      }],
      'boundaries/entry-point': ['error', {
        default: 'disallow',
        rules: [
          { target: ['feature'], allow: ['index.ts', 'index.tsx'] },
          { target: ['app', 'shared', 'core'], allow: '**' },
        ],
      }],

      /* 2 ── Imports: sin rutas profundas, orden por capas */
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['../../*'], message: 'Import relativo profundo: usa @app/@core/@shared/@features.' },
          { group: ['@features/*/**'], message: 'Importa la feature por su index (@features/<x>).' },
        ],
      }],
      'import/no-duplicates': 'error',
      'import/order': ['warn', {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        pathGroups: [
          { pattern: '@core/**', group: 'internal', position: 'before' },
          { pattern: '@shared/**', group: 'internal' },
          { pattern: '@features/**', group: 'internal', position: 'after' },
        ],
        'newlines-between': 'never',
        alphabetize: { order: 'asc', caseInsensitive: true },
      }],

      /* 3 ── Anti-espagueti: tamaño, profundidad, anidamiento */
      'max-lines': ['error', { max: 250, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 60, skipComments: true }],
      'max-depth': ['error', 3],
      complexity: ['error', 12],
      'max-params': ['error', 4],
      'max-nested-callbacks': ['error', 3],
      'react/jsx-max-depth': ['error', { max: 6 }],
      'react/jsx-no-useless-fragment': 'warn',

      /* 4 ── Seguridad */
      'no-restricted-globals': ['error',
        { name: 'fetch', message: 'Usa http de @core/api (interceptores + auth).' },
        { name: 'confirm', message: 'Usa useConfirm() de @shared/ui.' },
        { name: 'alert', message: 'Usa toast de @shared/ui.' },
        { name: 'prompt', message: 'Usa un Modal con TextField.' },
      ],
      'no-restricted-properties': ['error',
        { object: 'window', property: 'fetch', message: 'Prohibido monkey-patch de fetch.' },
        { object: 'window', property: 'confirm', message: 'Usa useConfirm() de @shared/ui.' },
        { object: 'window', property: 'alert', message: 'Usa toast de @shared/ui.' },
        { object: 'localStorage', property: 'setItem', message: 'No guardes estado sensible en localStorage.' },
      ],
      'no-restricted-syntax': ['error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'dangerouslySetInnerHTML prohibido: superficie XSS.',
        },
        {
          selector: "Literal[value=/(?:bg|text|border)-\\[#/]",
          message: 'Color arbitrario en clase: usa los tokens del tema (tokens.css).',
        },
      ],
    },
  },

  /* Componentes .tsx: el markup es verboso; límite por función 90 */
  { files: ['src/**/*.tsx'], rules: { 'max-lines-per-function': ['error', { max: 90, skipComments: true }] } },

  /* Tests: límites relajados */
  {
    files: ['src/**/*.test.{ts,tsx}'],
    rules: { 'max-lines-per-function': 'off', 'max-nested-callbacks': ['error', 5] },
  },
);
```

> Requiere `pnpm add -D eslint-plugin-react`. Las reglas de `confirm/alert` se activan **después**
> de la Fase 1 (si no, el lint rompe antes de tener el reemplazo).

---

## 7. Conflictos técnicos: opciones y recomendación

### 7.1 Estado global de modales
| Opción | Pros | Contras |
| --- | --- | --- |
| **A. Estado local + `useConfirm` por provider (RECOMENDADA)** | Cero librerías; los modales de formulario ya funcionan con estado local; solo la *confirmación* necesita API imperativa | Un provider más en `AppProviders` |
| B. Store global de modales (Zustand) | Abrir modales desde cualquier lugar | Introduce dependencia y acoplamiento; ninguno de los 7 modales actuales lo necesita |
| C. Context genérico de modales | Sin dependencia | Reinventa B con más código |

**Criterio:** los modales del proyecto son 1-a-1 con su vista; solo las confirmaciones son
transversales. A resuelve el 100 % del problema real con ~60 líneas.

### 7.2 Tablas de datos
| Opción | Pros | Contras |
| --- | --- | --- |
| **A. `DataTable` propia sobre los primitivos `Table` (RECOMENDADA)** | Tokens y a11y ya resueltos; cubre selección/empty/skeleton que es lo que usan `NegociosTabla` y admin | Hay que mantenerla (~150 líneas) |
| B. TanStack Table (headless) | Sort/filtros/paginación gratis, headless combina con Tailwind | Sobredimensionado para listas de <200 filas sin paginación |
| C. AG Grid / MUI DataGrid | Todo incluido | Bundle enorme, pelea con el design system, licencia (AG) |

**Criterio:** migrar a B solo cuando alguna vista necesite ordenamiento o paginación server-side;
la API de `DataTable` propuesta (columns/rows) es compatible con esa migración.

### 7.3 Gestión de variantes de clases
| Opción | Pros | Contras |
| --- | --- | --- |
| **A. CVA + tailwind-merge (RECOMENDADA)** | Variantes tipadas, `className` externo deja de romper estilos (merge inteligente), estándar de facto (shadcn) | +2 deps pequeñas (~3 KB) |
| B. `Record<Variant, string>` actual | Cero deps | Colisiones de clases al pasar `className` (ya ocurre: overrides de padding en Button) |
| C. CSS Modules / vanilla-extract | Aislamiento total | Rompe el modelo utility-first ya adoptado |

### 7.4 Persistencia del tema claro/oscuro
| Opción | Pros | Contras |
| --- | --- | --- |
| **A. Cookie no sensible o `localStorage` SOLO para `theme` con excepción de lint puntual (RECOMENDADA: localStorage con `// eslint-disable` justificado en un único archivo `core/theme.ts`)** | Persistente, simple; la regla de lint existe para *tokens*, no para preferencias | Hay que documentar la excepción |
| B. Solo `prefers-color-scheme` | Cero estado | El usuario no puede elegir |

### 7.5 Iconos
| Opción | Pros | Contras |
| --- | --- | --- |
| **A. lucide-react (RECOMENDADA)** | Tree-shakeable, consistente, 1 línea por icono | +1 dep |
| B. SVG inline como hoy | Cero deps | Duplicación, tamaños/strokes inconsistentes (ya pasa) |
| C. Sprite SVG propio | Control total | Infraestructura injustificada |

### 7.6 Versión de Tailwind
Quedarse en **3.4** durante esta refactorización (la config por `tailwind.config.ts` + tokens ya
funciona). Migrar a v4 (`@theme` CSS-first) como tarea aparte post-plan; migrar a mitad de una
refactorización de estilos duplica el riesgo.

---

## 8. Plan de trabajo por fases

Cada fase termina con `pnpm lint && pnpm typecheck && pnpm test` en verde y sin cambios visuales
no intencionados (smoke manual de las 7 rutas con ambos roles).

### Fase 0 — Fundaciones (½ día)
1. `vite.config.ts`: `port: 8765`, `strictPort: true` (§5.4). Documentar en README el arranque dev
   (backend con `PORT=8080`).
2. `pnpm add -D prettier-plugin-tailwindcss eslint-plugin-react` · `pnpm add class-variance-authority tailwind-merge lucide-react`.
3. Ampliar tokens (§3.1) y mapearlos en Tailwind. Sin consumidores aún — cero riesgo.
4. Fix de seguridad §4.2.1 (403 ≠ 401) y §4.2.2 (retry solo 5xx). Son 6 líneas y es lo más valioso
   del plan por línea de código.

### Fase 1 — Primitivos faltantes en `shared/ui` (1–2 días)
1. `ConfirmDialog` + `ConfirmProvider` + `useConfirm` → reemplazar los 6 `window.confirm`.
2. `EmptyState` → reemplazar los 6 empty states.
3. `Card` → reemplazar las 13 repeticiones.
4. `Button` v2 (CVA: `size`, `danger`, `loading`) → limpiar overrides en admin/campañas/rutas.
5. Activar en ESLint las reglas de `confirm/alert/prompt` y subir tamaños a `error` (§6).

### Fase 2 — Formularios, chips y tabla (1–2 días)
1. `Chip` (+ unificar mapa de tonos con `Badge`), `Checkbox`, `Switch`, `SearchInput` (con debounce).
2. `IconButton` + migración de SVGs a lucide.
3. `DataTable` sobre los primitivos → migrar `NegociosTabla` y el listado de usuarios.
4. Patrón `useFormModal` + `ModalFooter` → aplicar a los 4 modales de formulario.

### Fase 3 — API y estados de UI (1 día)
1. `MutationCache`/`QueryCache` con `onError` global + `meta.errorMessage` → borrar los 35
   `onError` repetidos (quedan solo los que hacen lógica).
2. `QueryBoundary` (loading/error/empty declarativo) → adoptar en las 7 páginas.
3. Consolidar `shared/lib/format.ts` y `shared/ui/map/FlyTo.tsx`.

### Fase 4 — Router y pulido (½–1 día)
1. Ruta 404, barra de progreso con `useNavigation`, prefetch en `NavTabs`.
2. `app/router/routes.ts` como fuente única de rutas/roles/labels.
3. Toggle de tema en `UserMenu` (+ `core/theme.ts`, §7.4).
4. Auditoría final: grep de `text-[`, `bg-[#`, `window.confirm`, `<button` fuera de shared → 0
   resultados; `graphify update .`; actualizar calificaciones reales vs proyectadas.

**Total estimado: 4–6 días efectivos.** Riesgo bajo: cada paso es sustitución mecánica con lint/tests
como red y ninguna migración de datos o de librería mayor.

---

## 9. Resumen de advertencias informativas (backend — fuera de alcance)
1. Conflicto de puerto en dev: backend por defecto en 8765 = puerto requerido para el frontend;
   correr backend dev con `PORT=8080` (coincide con el proxy de Vite). En prod no hay conflicto.
2. Falta de security headers (CSP, X-Content-Type-Options, Referrer-Policy) al servir `dist`.
3. App Check sin enforcement del lado servidor (ya en `docs/PENDIENTES.md`).
4. Considerar proxyear el reverse-geocoding (Nominatim) para no exponer coordenadas de reportes a
   un tercero directamente desde el navegador.
5. Garantizar que `detail`/`message` de los errores HTTP nunca incluyan trazas internas: el
   frontend los muestra al usuario en toasts.
