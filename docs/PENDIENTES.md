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
- [x] 🟩 ~~**Recalculadora local del índice.**~~ Hecho: `features/indice/components/IndiceCalculadora.tsx`
      recalcula el estimador con los negocios marcados formal/en_proceso, contra el escenario α=1.0.
- [ ] 🟧 **`SelectField` quedó sin consumidores** tras migrar los 8 selects a `Combobox`.
      Antes de borrarlo hay que **probar el `Combobox` en un móvil real**: el `<select>` nativo
      abre el selector del sistema operativo, que se maneja mejor con el pulgar que un listbox
      propio, y Reportes/Campañas se usan en campo desde el teléfono. Si el `Combobox` aguanta,
      eliminar `shared/ui/SelectField.tsx`; si no, conservarlo para los formularios de campo.
- [ ] 🟥 **La auditoría afirma que «el token nunca toca `localStorage`» y no es exacto.**
      `core/auth/firebase.ts` nunca llama a `setPersistence`, así que el SDK usa su persistencia
      por defecto (`indexedDBLocalPersistence`): el **refresh token se guarda en el navegador** y
      la sesión sobrevive a cerrar la pestaña y el navegador. El ID token sí vive en memoria y
      `getFreshToken()` lo renueva, que es lo que la auditoría describía. La regla de ESLint
      prohíbe *nuestro* `localStorage.setItem`, no el del SDK. Decidir la persistencia a
      conciencia: `browserSessionPersistence` cierra la sesión al cerrar la pestaña, pero obliga
      a los técnicos a re-loguearse en campo. Ver `useCierrePorInactividad`, que ya cubre el caso
      del equipo desatendido con la app abierta.
- [ ] 🟩 **Tema claro.** Los tokens ya soportan `[data-theme="light"]`; falta el toggle en el
      `AppShell` y persistir la preferencia.
- [ ] 🟩 **CI**: cachear `~/.pnpm-store` y publicar artefacto de build; añadir el job de e2e
      cuando exista (`.github/workflows/frontend.yml`).

## 3. Corte del legacy (Fase 7 final) — ✅ APLICADO en código

Ejecutado en esta rama (detalle en **`docs/CUTOVER.md`**). Falta solo desplegar y validar en prod.

- [x] 🟥 Backend sirve `frontend/dist` con mount `/assets` + SPA fallback (`app.py`, `backend/app.py`).
- [x] 🟥 `Dockerfile` multi-stage: etapa `node` construye el frontend, la de Python copia solo `dist`.
- [x] 🟥 `.dockerignore` / `.gcloudignore` excluyen `frontend/node_modules` y `frontend/dist`
      (el código fuente sí se sube: lo necesita `pnpm build` en Cloud Build).
- [x] 🟧 `frontend/legacy/` eliminada.
- [ ] 🟥 **Desplegar y validar en producción** (login, mapa, campañas, fotos, `/uploads`) — solo tú
      puedes hacerlo. Si algo falla, rollback = volver `FRONT` a `frontend/legacy` (ver CUTOVER.md).

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
| 7 | Endurecimiento + corte del legacy (código ✅) — falta desplegar y validar en prod (§1, §3) | 🚧 |
