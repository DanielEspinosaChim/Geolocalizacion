---
name: Tasks — Canasta Básica MVP
feature: 001
status: COMPLETADO ✅
---

# Tasks — MVP (todas completadas)

## Backend

- [x] Router FastAPI `backend/routers/canasta.py`
- [x] Registrado en `app.py` bajo `/api/canasta`
- [x] `GET /{year}` — lista productos activos ordenados
- [x] `PUT /{year}/{product_id}` — actualiza precio por mes
- [x] `POST /{year}/product` — agrega producto nuevo (slug auto)
- [x] `DELETE /{year}/{product_id}` — soft delete
- [x] `GET /{year}/summary` — totales y % mes a mes
- [x] `POST /{year}/seed` — seedeo histórico 2026 (idempotente)
- [x] `GET /{year}/export/excel` — .xlsx con formato CANACO
- [x] `POST /{year}/scan-invoice` — Gemini 3.5 Flash + fuzzy matching
- [x] Manejo de errores con HTTPException en todos los endpoints
- [x] Fuzzy matching con `difflib.SequenceMatcher`

## Firebase

- [x] Estructura `canasta_basica/{year}/products/{id}`
- [x] Seed con 19 productos y datos históricos 2026 ENE–JUL

## Frontend

- [x] `frontend/js/canasta.js` — carga, renderiza tabla, totales, %
- [x] Edición inline por celda (contenteditable)
- [x] Guardado automático `onblur`
- [x] Modal agregar producto (`modal-canasta`)
- [x] Modal escaneo IA (`modal-scan`) con semáforo de confianza
- [x] Guardar precios de escaneo en paralelo
- [x] Gráfica de barras Chart.js con % mensual
- [x] Infografía PNG Canvas 2D 1280×720
- [x] Descarga Excel desde API
- [x] Selector de año dinámico (2025 → año actual)
- [x] Columnas visibles según año (histórico vs. año en curso)

## Seguridad transversal

- [ ] Guard de rol CANACO en `scan-invoice` → pendiente (ver feature 000)
- [ ] Límite de tamaño de imagen en upload → pendiente
