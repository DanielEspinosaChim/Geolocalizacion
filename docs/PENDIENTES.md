# Pendientes por implementar y limpiar

Estado a cierre de la **Fase 6**: paridad funcional completa entre el frontend nuevo
(`frontend/src`, React 19 + Screaming Architecture) y el legacy (`frontend/legacy`).
Este documento lista lo que **falta** para dar por terminada la migración (Fase 7 y corte),
la deuda técnica conocida y las observaciones de backend acumuladas.

Leyenda: 🟥 bloqueante para el corte · 🟧 importante · 🟩 mejora.

---

## 1. Frontend — Fase 7 (endurecimiento)

Lo que ya quedó hecho en código está marcado `[x]`. Lo que requiere navegador,
consola de Firebase o infraestructura queda `[ ]`.

- [x] Bundling propio (sin CDNs) y **`manualChunks`** para partir vendor (react/firebase/map/query).
- [x] **CSP** como `<meta>` en `frontend/index.html` (fallback) + `referrer-policy`.
- [x] **App Check** opt-in en `core/auth/firebase.ts` (reCAPTCHA v3 tras `VITE_RECAPTCHA_SITE_KEY`).
- [x] **ErrorBoundary** global (evita pantalla en blanco).
- [ ] 🟥 **Validar la CSP en navegador** antes del corte. Probar: login email + Google popup,
      carga de tiles, fotos de `/uploads`, Nominatim y OSRM. Ajustar orígenes si algo se bloquea.
      Mover la CSP a **cabecera HTTP** (más robusta que `<meta>`) — ver `CUTOVER.md`.
- [ ] 🟧 **Activar App Check de verdad**: registrar el sitio en consola de Firebase
      (reCAPTCHA v3), poner `VITE_RECAPTCHA_SITE_KEY` en el entorno y **exigir** el token
      en el backend. Sin el enforcement server-side, el opt-in del cliente no protege nada.
- [ ] 🟧 **Tests e2e (Playwright)** de los flujos críticos: redirección a `/login` sin sesión,
      login → mapa, técnico aterriza en `/campanas`, `/admin` bloqueado para técnico,
      registrar visita. Requiere instalar navegadores (`pnpm exec playwright install`) y
      un backend/Firebase de prueba o mocks — no se pudo dejar corriendo en este entorno.
- [ ] 🟩 **Auditoría Lighthouse / a11y** con la build servida y ajustar hallazgos
      (contraste, foco, `lang`, tamaños táctiles). El linter `jsx-a11y` ya cubre lo estático.
- [ ] 🟩 **Observabilidad**: conectar el `console.error` del `ErrorBoundary` y del interceptor
      de `@core/api` a Sentry o Cloud Logging.

## 2. Deuda técnica del frontend (limpieza)

- [ ] 🟧 **`reportes` debe adoptar `FotoField`/`CameraModal`** de `shared/ui`. Hoy usa un
      `<input type="file">` simple; la cámara reutilizable de la Fase 5 le da paridad con el
      legacy (modal getUserMedia en PC) y elimina duplicación.
- [ ] 🟩 **Drag & drop real en el editor de plantillas.** Se migró a botones ↑/↓ accesibles
      (robusto y teclado-friendly). Si se quiere arrastrar, integrar `@dnd-kit/*` en
      `EditorPlantilla` conservando accesibilidad.
- [ ] 🟩 **Warnings `act(...)` en `LoginForm.test`.** Envolver la interacción async en
      `await waitFor(...)` para silenciarlos (no afectan el resultado del test).
- [ ] 🟩 **Recalculadora local del índice.** El legacy recalculaba el índice en vivo con los
      negocios marcados formal/en_proceso (`_calcIndice`). El panel nuevo muestra los datos del
      backend; si se quiere el recálculo interactivo, añadirlo en `IndicePanel`.
- [ ] 🟩 **Tema claro.** Los tokens ya soportan `[data-theme="light"]`; falta el toggle en el
      `AppShell` y persistir la preferencia.
- [ ] 🟩 **CI**: cachear `~/.pnpm-store` y publicar artefacto de build; añadir el job de e2e
      cuando exista (`.github/workflows/frontend.yml`).

## 3. Corte del legacy (Fase 7 final)

El detalle operativo está en **`docs/CUTOVER.md`**. Resumen de lo que falta y **por qué no se
hizo aquí** (tocan backend/deploy, fuera del alcance acordado):

- [ ] 🟥 Backend sirve `frontend/dist` (build nueva) en vez de `frontend/legacy`.
- [ ] 🟥 Pipeline de deploy construye el frontend (`pnpm build`) antes de empaquetar.
- [ ] 🟥 `.dockerignore` / `.gcloudignore` excluyen `frontend/node_modules` y `frontend/src`
      (hoy subirían ~400 MB al contexto de build).
- [ ] 🟧 Eliminar `frontend/legacy/` una vez validada la paridad en producción.

## 4. Observaciones de backend (fuera de alcance — pasar al equipo)

No se tocó `app.py`, `backend/` ni el deploy. Estas son necesarias para cerrar seguridad/paridad:

- [ ] 🟥 **Rotar la API key de Google Maps** (`AIzaSyBN-M3SB…`): quedó expuesta en el historial
      de git aunque ya se lea de Secret Manager. Regenerar y restringir por referer/IP.
- [ ] 🟧 **Endpoint faltante `DELETE /api/campanas/{id}/negocios/{negocio_id}`.** Hoy "quitar
      negocio" hace `PATCH {_quitar:true}`, que **no borra** el doc — el negocio sigue contando
      en `total_negocios`. Bug heredado; el frontend replica el comportamiento del legacy.
- [ ] 🟧 **CSP + cabeceras** (`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`)
      servidas desde el backend.
- [ ] 🟧 **App Check enforcement** en los endpoints `/api/`.
- [ ] 🟩 **CORS**: al separar builds/orígenes en dev, fijar `allow_origins` al origen real.
- [ ] 🟩 **Plantilla `reporte_visita.html`**: `backend/routers/visitas.py` apunta a
      `frontend/legacy/templates/reporte_visita.html`, que **no existe** (el código lo tolera).
      Confirmar si el reporte de visita debe usar plantilla o generarse de otra forma.
- [ ] 🟩 **Límite de subida de fotos** (tamaño + MIME) en `/api/reportes` y `/visita`.

## 5. Estado por fase

| Fase | Descripción | Estado |
| ---- | ----------- | ------ |
| 0 | Andamiaje + guardarraíles (Vite, TS, ESLint boundaries, Tailwind tokens, CI) | ✅ |
| 1 | Auth (Firebase modular, token fresco, logout-on-401) + router protegido | ✅ |
| 2 | Design system `shared/ui` + `MapCanvas` | ✅ |
| 3 | `candidatos` (mapa + lista + filtros) | ✅ |
| 4 | `reportes` · `rutas` · `colonias-zonas` | ✅ |
| 5 | `campanas` + plantillas + cámara | ✅ |
| 6 | `predicciones` + `admin` | ✅ |
| 7 | Endurecimiento (código ✅) + **corte del legacy** (pendiente, ver §3) | 🚧 |
