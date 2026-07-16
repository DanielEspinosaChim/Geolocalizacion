---
name: Tasks — Tienda y Fecha de Compra
feature: 002
status: COMPLETADO ✅
---

# Tasks — F4

## Backend (`backend/routers/canasta.py`)

- [x] `update_precio()` — leer `tienda` y `fecha_compra` del body (opcionales)
- [x] `update_precio()` — actualizar `tiendas.{month}` y `fechas_compra.{month}` en Firestore solo si se enviaron
- [x] `add_product()` — inicializar `tiendas: {}` y `fechas_compra: {}` en nuevo documento
- [x] `seed_canasta()` — añadir `tiendas: {}` y `fechas_compra: {}` a cada producto seeded
- [x] `export_excel()` — añadir hoja "Detalle" (CATEGORIA · SUMINISTRO · MES · PRECIO · TIENDA · FECHA_COMPRA)

## Frontend HTML (`frontend/index.html`)

- [x] Añadir campo Tienda al modal-scan (junto al selector de mes)
- [x] Añadir `modal-meta` — modal de edición tienda + fecha por celda

## Frontend JS (`frontend/js/canasta.js`)

- [x] `_buildTbody()` — etiqueta de tienda bajo cada precio (azul si set, gris si vacía)
- [x] `editarMetadataCanasta(productId, month)` — abrir modal-meta con valores precargados
- [x] `cerrarModalMeta()` — cerrar modal
- [x] `guardarMetadataCanasta()` — PUT con `{ month, price, tienda, fecha_compra }`, actualizar memoria, re-renderizar
- [x] `guardarEscaneo()` — leer `scan-tienda`, calcular fecha de hoy, incluir en cada PUT

## Seguridad (ver feature 000)

- [ ] Validar `tienda` (max 80 chars) y `fecha_compra` (formato YYYY-MM-DD) en backend
