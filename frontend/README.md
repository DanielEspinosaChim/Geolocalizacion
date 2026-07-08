# GeoFormal — frontend nuevo (React 19 + Screaming Architecture)

Frontend de GeoFormal. El corte del legacy ya está aplicado: el backend sirve `frontend/dist`
(build de Vite) con mount `/assets` + SPA fallback, y `frontend/legacy/` fue eliminada.
El `Dockerfile` es multi-stage (etapa `node` construye el frontend). Falta desplegar y validar
en producción — ver `docs/CUTOVER.md`.

## Stack

React 19 · TypeScript estricto · Vite 6 · React Router v7 (loaders como guardias) ·
TanStack Query v5 · Axios centralizado (`@core/api`) · Tailwind v3 con design tokens · pnpm.

## Comandos

```bash
pnpm dev        # http://localhost:5173 — proxy /api → backend (VITE_API_PROXY)
pnpm typecheck  # tsc -b
pnpm lint       # ESLint con fronteras de arquitectura
pnpm test       # vitest
pnpm build      # tsc -b && vite build
```

## Arquitectura (dirección del flujo: app → features → shared → core)

- `src/app/` composition root: providers, router. Sin lógica de negocio.
- `src/features/` el dominio (ver `src/features/README.md`).
- `src/shared/` UI/hooks/lib agnósticos al dominio.
- `src/core/` infraestructura: `api` (Axios + interceptores), `auth`, `query`, `config`.

Las fronteras las aplica `eslint.config.js` (eslint-plugin-boundaries): romperlas es error de lint.

## Plan de fases

0. ✅ Andamiaje + guardarraíles (este scaffold)
1. ✅ `core/auth` + login + router protegido (token fresco por request, logout-on-401,
   guardias `requireAuth`/`requireRole`, técnico aterriza en /campanas)
2. ✅ Design system `shared/ui` (Badge, Modal, Tabs, Toast, Table, Skeleton, Spinner,
   SelectField) + `MapCanvas` (wrapper React-Leaflet)
3. ✅ `candidatos` (mapa + lista + filtros)
4. ✅ `reportes` · `rutas` · `colonias-zonas`
5. ✅ `campanas` + plantillas (vista admin/técnico, modal de visita con campos
   dinámicos, editor de plantillas, cámara reutilizable en `shared/ui`)
6. ✅ `predicciones` (predicción por clic + índice + validación) + `admin`
   (usuarios, asignaciones, mi cuenta + cambio de contraseña)
7. 🚧 Endurecimiento (CSP, App Check, manualChunks, ErrorBoundary — hecho) y
   **corte del legacy** (pendiente, requiere backend/deploy → `docs/CUTOVER.md`)
