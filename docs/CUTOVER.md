# Corte del legacy → frontend nuevo

Guía operativa para reemplazar el frontend legacy (`frontend/legacy/`) por la build de React
(`frontend/dist/`). **Toca backend y deploy**, por lo que está fuera del alcance de la migración
del frontend y requiere aprobación explícita antes de ejecutarse.

## Contexto actual

- El backend sirve el **legacy** desde rutas fijas:
  - `app.py`: `FRONT = BASE / "frontend" / "legacy"` → monta `/css`, `/js` y sirve `index.html`.
  - `backend/app.py`: `FRONTEND_DIR = ROOT_DIR / "frontend" / "legacy"`.
  - `backend/routers/visitas.py`: `frontend/legacy/templates/reporte_visita.html`.
- El `Dockerfile` copia `frontend/` completo (`COPY frontend/ frontend/`).
- La app nueva compila a `frontend/dist/` con `pnpm build`.

## Pasos del corte (en orden)

1. **Validar paridad** en un entorno de staging con la build nueva (todos los flujos).
2. **Construir el frontend en el pipeline** antes de empaquetar la imagen. En el `Dockerfile`,
   etapa previa con Node:
   ```dockerfile
   FROM node:22-slim AS web
   WORKDIR /web
   RUN corepack enable
   COPY frontend/package.json frontend/pnpm-lock.yaml ./
   RUN pnpm install --frozen-lockfile
   COPY frontend/ ./
   RUN pnpm build          # genera /web/dist
   ```
   y en la imagen de Python: `COPY --from=web /web/dist ./frontend/dist`.
3. **Apuntar el backend a la build nueva** (cambiar solo estas 3 referencias):
   - `app.py`: `FRONT = BASE / "frontend" / "dist"`
   - `backend/app.py`: `FRONTEND_DIR = ROOT_DIR / "frontend" / "dist"`
   - Servir `assets/` en vez de `/js` y `/css`: `app.mount("/assets", StaticFiles(directory=str(FRONT / "assets")))`.
   - **SPA fallback**: cualquier ruta desconocida debe devolver `index.html` (React Router es
     client-side). Añadir un catch-all que retorne `FileResponse(FRONT / "index.html")`.
4. **CSP como cabecera** (middleware FastAPI) — más robusta que el `<meta>`. Reusar la lista de
   orígenes de `frontend/index.html`.
5. **Excluir del contexto de build** en `.dockerignore` y `.gcloudignore`:
   ```
   frontend/node_modules
   frontend/src
   frontend/dist        # se genera en la etapa web, no se sube desde local
   ```
6. **Desplegar y verificar** en producción (login, mapa, campañas, subida de fotos, /uploads).
7. **Eliminar `frontend/legacy/`** y sus referencias una vez estable.

## Rollback

El corte es un cambio de rutas en el backend. Para revertir: volver `FRONT` a
`frontend/legacy` y redeploy. Mantener `legacy/` hasta confirmar estabilidad (paso 7).
