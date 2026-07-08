# Arquitectura del frontend

Screaming Architecture: las carpetas gritan el **dominio**, no el framework. Flujo de
dependencias `app → features → shared → core` (nunca al revés), impuesto por
`frontend/eslint.config.js` (`eslint-plugin-boundaries`).

```
frontend/src/
├─ app/          composition root: providers, router, guardias, layout, ErrorBoundary
├─ features/     el dominio (una carpeta = una capacidad de negocio)
│  ├─ auth/            login, sesión, roles
│  ├─ candidatos/      mapa + lista + filtros (corazón de la app)
│  ├─ colonias-zonas/  capas GeoJSON (colonias, AGEBs, municipios)
│  ├─ rutas/           optimización de recorrido + reporte de visita
│  ├─ reportes/        reportes ciudadanos (GPS + foto + verificación)
│  ├─ campanas/        campañas, plantillas, checklist, modal de visita
│  ├─ predicciones/    predicción por clic + índice + validación
│  └─ admin/           usuarios, asignaciones, mi cuenta
├─ shared/       reutilizable y agnóstico al dominio
│  ├─ ui/              design system (Button, Modal, Tabs, Table, MapCanvas, cámara…)
│  └─ lib/             geo (GPS, haversine), device
└─ core/         infraestructura singleton (cero UI)
   ├─ api/             cliente Axios + interceptores (token fresco, logout-on-401)
   ├─ auth/            Firebase modular, sesión observable, App Check, changePassword
   ├─ query/           QueryClient de TanStack
   └─ config/          env validado con Zod
```

## Reglas de dependencia (las aplica ESLint)

| Capa | Puede importar de | Nunca de |
| ---- | ----------------- | -------- |
| `app` | features · shared · core | — |
| `feature` | shared · core · su propio interior | otra feature salvo por su `index.ts` · app |
| `shared` | shared · core | features · app |
| `core` | core | features · shared · app |

Cada feature expone **solo** su `index.ts` (API pública). Otras features la consumen por
`@features/<x>`, nunca sus archivos internos. Además: sin `fetch` directo (usar `@core/api`),
sin `dangerouslySetInnerHTML`, sin imports relativos profundos, límites de tamaño/complejidad.

## Anatomía de una feature

```
features/<x>/
├─ api/         hooks de TanStack Query (queries + mutations) sobre @core/api
├─ components/  componentes de la feature
├─ hooks/       lógica de UI reutilizable dentro de la feature
├─ model/       tipos + esquemas Zod + funciones puras (testeadas)
├─ routes/      páginas (elemento de ruta)
└─ index.ts     API pública
```

## Stack

React 19 · TypeScript estricto · Vite 6 · React Router v7 (loaders como guardias) ·
TanStack Query v5 · Axios · Tailwind v3 (design tokens en `src/styles/tokens.css`) ·
Firebase modular v12 · Leaflet/react-leaflet · pnpm · Vitest + Testing Library.

Detalle de lo pendiente en [`PENDIENTES.md`](./PENDIENTES.md); el corte en [`CUTOVER.md`](./CUTOVER.md).
