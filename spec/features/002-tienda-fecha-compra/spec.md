---
name: Tienda y Fecha de Compra
feature: 002
status: IMPLEMENTADA ✅
---

# Spec — Tienda y Fecha de Compra (F4)

## Qué resuelve

Actualmente la tabla registra el precio por producto-mes pero no hay trazabilidad de
**dónde** ni **cuándo** se compró. Esta feature añade esos dos metadatos opcionales
para cada entrada de precio, sin romper el flujo actual de edición.

---

## Cambios al modelo de datos (Firestore)

Se añaden dos nuevos mapas al documento de cada producto, paralelos a `prices`:

```
{product_id}/
  prices:          { jan: 39.95, feb: 49.95, ... }   ← existente
  tiendas:         { jan: "WALMART", feb: "CHEDRAUI", ... }   ← NUEVO
  fechas_compra:   { jan: "2026-01-15", feb: "2026-02-08", ... }  ← NUEVO
```

**Reglas:**
- Ambos campos son opcionales por mes — `null` si no se capturaron
- `tienda`: string en mayúsculas, máx. 80 caracteres
- `fecha_compra`: string formato `YYYY-MM-DD`
- Documentos creados antes de esta feature no tienen estos mapas — el backend los trata como `{}`

---

## Cambios al backend (`backend/routers/canasta.py`)

### `PUT /{year}/{product_id}` — actualizar precio

**Antes:**
```json
{ "month": "aug", "price": 85.00 }
```

**Después (campos nuevos opcionales):**
```json
{
  "month": "aug",
  "price": 85.00,
  "tienda": "WALMART",
  "fecha_compra": "2026-08-05"
}
```

Si `tienda` o `fecha_compra` no se envían → no se modifican en Firestore.
Si se envían como `null` → se borran del mapa.

### `POST /{year}/product` — nuevo producto

El doc creado inicializa `tiendas: {}` y `fechas_compra: {}`.

### `POST /{year}/seed` — seedeo histórico

Los docs insertados incluyen `tiendas: {}` y `fechas_compra: {}`.

### `GET /{year}/export/excel` — Excel

Añade segunda hoja **"Detalle"** con columnas:
`CATEGORIA · SUMINISTRO · MES · PRECIO · TIENDA · FECHA_COMPRA`
— una fila por cada producto-mes que tenga precio, tienda o fecha capturados.

---

## Cambios al frontend

### Tabla (canasta.js — `_buildTbody`)

Cada celda de precio ahora muestra una pequeña etiqueta bajo el número:

```
[ $85.00 ]
[ WALMART ]    ← azul si tienda está set, gris sutil si no
```

- Click en la etiqueta → abre `modal-meta` para editar tienda + fecha de ese producto-mes
- Tooltip (`title`) muestra tienda + fecha completos

### Modal nuevo — `modal-meta` (index.html)

Campos:
- **Tienda** — input texto, autocomplete=off, se guarda en mayúsculas
- **Fecha de compra** — input type=date

Al guardar: llama `PUT` con `{ month, price: precioActual, tienda, fecha_compra }`.
Actualiza el dato en memoria y vuelve a renderizar la tabla.

### Modal scan IA — `modal-scan` (index.html)

Añade campo **Tienda del lote** junto al selector de mes.
Al guardar el escaneo: todos los precios guardados reciben la tienda capturada
y `fecha_compra` = fecha de hoy.

---

## Qué NO cambia

- El cálculo de `summary` (totales y %) no usa tienda ni fecha — sin cambio
- La infografía PNG no cambia
- Los datos históricos pre-F4 siguen funcionando sin tienda/fecha (campos ausentes = vacíos)
- El formato de la hoja principal del Excel no cambia

---

## Tests mínimos

- [ ] `PUT /api/canasta/2026/aguacate` con `tienda="WALMART"` y `fecha_compra="2026-08-05"` → verifica en Firestore que `tiendas.aug == "WALMART"` y `fechas_compra.aug == "2026-08-05"`
- [ ] `PUT` sin `tienda` ni `fecha_compra` → no modifica los mapas existentes
- [ ] `PUT` con `tienda=null` → borra el campo del mes
- [ ] `GET /api/canasta/2026` → respuesta incluye `tiendas` y `fechas_compra` cuando existen
- [ ] `POST /api/canasta/2026/product` → doc creado tiene `tiendas: {}` y `fechas_compra: {}`
- [ ] `GET /api/canasta/2026/export/excel` → archivo .xlsx tiene hoja "Detalle"
