# API — Canasta Básica Tracker

Módulo independiente integrado en la plataforma GeoFormal · CANACO SERVYTUR Mérida.

---

## Stack real implementado

| Capa | Tecnología |
|------|-----------|
| Backend | FastAPI · `backend/routers/canasta.py` |
| Base de datos | Firebase Firestore · colección `canasta_basica` |
| IA (facturas) | `google-genai` 2.x · modelo `gemini-3.5-flash` · autenticación por `service_account.json` sin API key |
| Excel | `openpyxl` |
| Infografía | Canvas 2D API (client-side, sin dependencias extra) |
| Gráfica | Chart.js 4.4.0 |
| Frontend | Vanilla JS · `frontend/js/canasta.js` |

---

## Esquema Firebase

```
canasta_basica/
  {year}/                          # "2026", "2025", etc.
    products/
      {product_id}/                # ej: "aguacate", "res_bistec"
        name:       "AGUACATE"
        category:   "FRUTAS"
        unit:       "KILO"
        sort_order: 1
        active:     true
        created_at: "2026-07-13 02:50:00"
        prices:
          jan: 39.95
          feb: 49.95
          mar: 46.95
          apr: 46.95
          may: 54.95
          jun: 124.00
          jul: 79.00
          aug: null          # null = mes no capturado aún
          sep: null
          oct: null
          nov: null
          dec: null
```

**Categorías válidas (orden de la tabla):**
`FRUTAS` · `VEGETALES` · `ABARROTES` · `CARNES` · `LECHES` · `HIGIENE` · `FARMACÉUTICOS`

---

## Endpoints

### `GET /api/canasta/{year}`

Retorna todos los productos activos del año ordenados por categoría y `sort_order`.

**Ejemplo — request:**
```
GET /api/canasta/2026
```

**Ejemplo — response `200 OK`:**
```json
[
  {
    "id": "aguacate",
    "name": "AGUACATE",
    "category": "FRUTAS",
    "unit": "KILO",
    "sort_order": 1,
    "active": true,
    "prices": {
      "jan": 39.95,
      "feb": 49.95,
      "mar": 46.95,
      "apr": 46.95,
      "may": 54.95,
      "jun": 124.00,
      "jul": 79.00,
      "aug": null,
      "sep": null,
      "oct": null,
      "nov": null,
      "dec": null
    }
  },
  {
    "id": "limon",
    "name": "LIMON",
    "category": "FRUTAS",
    "unit": "KILO",
    "sort_order": 2,
    "prices": { "jan": 29.95, "feb": 29.95, "mar": 56.95, ... }
  }
]
```

---

### `PUT /api/canasta/{year}/{product_id}`

Actualiza el precio de un producto para un mes específico. Si la celda ya tenía valor lo sobreescribe. Pasar `price: null` borra el valor.

**Ejemplo — request:**
```
PUT /api/canasta/2026/aguacate
Content-Type: application/json

{
  "month": "aug",
  "price": 85.00
}
```

**Meses válidos:** `jan` `feb` `mar` `apr` `may` `jun` `jul` `aug` `sep` `oct` `nov` `dec`

**Ejemplo — response `200 OK`:**
```json
{ "ok": true }
```

**Errores:**
```json
{ "detail": "Mes inválido: xyz" }   // 400
{ "detail": "Firestore no disponible" }  // 503
```

**Uso en frontend (`canasta.js`):**
```javascript
await fetch(`/api/canasta/${_canYear}/${productId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ month: 'aug', price: 85.00 }),
});
```

---

### `POST /api/canasta/{year}/product`

Agrega un nuevo producto al catálogo del año indicado. El `id` se genera automáticamente a partir del nombre.

**Ejemplo — request:**
```
POST /api/canasta/2026/product
Content-Type: application/json

{
  "name": "PAPAYA",
  "category": "FRUTAS",
  "unit": "KILO"
}
```

**Ejemplo — response `200 OK`:**
```json
{ "ok": true, "id": "papaya" }
```

**El producto se crea con:**
- `active: true`
- `prices: { jan: null, feb: null, ... }` (todos los meses vacíos)
- `sort_order`: siguiente al último producto existente

---

### `DELETE /api/canasta/{year}/{product_id}`

Soft delete — marca `active: false`. El producto deja de aparecer en la tabla pero sus datos permanecen en Firestore.

**Ejemplo — request:**
```
DELETE /api/canasta/2026/papaya
```

**Ejemplo — response `200 OK`:**
```json
{ "ok": true }
```

---

### `GET /api/canasta/{year}/summary`

Calcula el total de la canasta por mes y la variación porcentual respecto al mes anterior.

**Ejemplo — request:**
```
GET /api/canasta/2026/summary
```

**Ejemplo — response `200 OK`:**
```json
[
  { "month": "jan", "total": 1304.32, "diff": null,   "pct": null  },
  { "month": "feb", "total": 1353.32, "diff": 49.00,  "pct": 3.8   },
  { "month": "mar", "total": 1417.25, "diff": 63.93,  "pct": 4.7   },
  { "month": "apr", "total": 1389.61, "diff": -27.64, "pct": -1.9  },
  { "month": "may", "total": 1326.52, "diff": -63.09, "pct": -4.5  },
  { "month": "jun", "total": 1442.50, "diff": 115.98, "pct": 8.7   },
  { "month": "jul", "total": 1370.35, "diff": -72.15, "pct": -5.0  },
  { "month": "aug", "total": null,    "diff": null,   "pct": null  },
  ...
]
```

- `total`: suma de todos los productos con precio ese mes
- `diff`: diferencia absoluta vs mes anterior (`null` si no hay mes anterior con datos)
- `pct`: porcentaje de cambio redondeado a 1 decimal (`null` si no aplica)

---

### `POST /api/canasta/{year}/seed`

Inserta los 19 productos históricos de 2026 (ENE–JUL). Solo disponible para `year = "2026"`. Omite los que ya existen (idempotente).

**Ejemplo — request:**
```
POST /api/canasta/2026/seed
```

**Ejemplo — response `200 OK`:**
```json
{ "ok": true, "insertados": 19, "ya_existian": 0 }
```

---

### `GET /api/canasta/{year}/export/excel`

Genera y descarga un archivo `.xlsx` con el formato del Excel actual de CANACO:
- Encabezado azul oscuro (`#1F3864`)
- Filas coloreadas por categoría
- Fila `TOTAL` en azul
- Fila `DIFERENCIA` con valores en rojo/verde
- Fila `% CAMBIO` con formato porcentaje
- Primeras 3 columnas + encabezado congelado (`D2`)

**Ejemplo — request:**
```
GET /api/canasta/2026/export/excel
```

**Response:** `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
Nombre del archivo: `canasta_basica_2026.xlsx`

**Uso en frontend:**
```javascript
const res  = await fetch(`/api/canasta/${_canYear}/export/excel`);
const blob = await res.blob();
const url  = URL.createObjectURL(blob);
const a    = document.createElement('a');
a.href = url; a.download = `canasta_basica_${_canYear}.xlsx`; a.click();
URL.revokeObjectURL(url);
```

---

### `POST /api/canasta/{year}/scan-invoice`

Envía una imagen de factura/ticket al modelo `gemini-3.5-flash` y retorna los productos detectados con su precio y su mapeo contra el catálogo existente.

**Autenticación IA:** `service_account.json` · `google-genai` con `enterprise=True` · proyecto `canaco-info` · región `us` — sin API key.

**Ejemplo — request:**
```
POST /api/canasta/2026/scan-invoice
Content-Type: multipart/form-data

imagen: [archivo de imagen JPEG/PNG/WEBP/HEIC]
```

**Ejemplo — response `200 OK`:**
```json
{
  "ok": true,
  "total_detected": 5,
  "items": [
    {
      "detected_name":  "AGUACATE",
      "detected_price": 54.95,
      "detected_unit":  "KILO",
      "matched_id":     "aguacate",
      "matched_name":   "AGUACATE",
      "confidence":     "high",
      "score":          0.923
    },
    {
      "detected_name":  "RES BISTEC ESP.",
      "detected_price": 195.00,
      "detected_unit":  "KILO",
      "matched_id":     "res_bistec",
      "matched_name":   "RES BISTEC ESPECIAL",
      "confidence":     "medium",
      "score":          0.612
    },
    {
      "detected_name":  "PAPAYA",
      "detected_price": 32.00,
      "detected_unit":  "KILO",
      "matched_id":     null,
      "matched_name":   null,
      "confidence":     "low",
      "score":          0.21
    }
  ]
}
```

**Niveles de confianza (`confidence`):**

| Valor | Score | Semáforo en modal | Comportamiento |
|-------|-------|-------------------|----------------|
| `high` | ≥ 0.72 | 🟢 Verde · "Alta" | Checkbox marcado por default |
| `medium` | ≥ 0.45 | 🟡 Amarillo · "Media" | Checkbox marcado por default |
| `low` | < 0.45 | 🔴 Rojo · "Baja" | Checkbox desmarcado, requiere revisión manual |

**Uso en frontend:**
```javascript
const form = new FormData();
form.append('imagen', file);
const res  = await fetch(`/api/canasta/${_canYear}/scan-invoice`, {
  method: 'POST',
  body: form,
});
const data = await res.json();
// data.items → array de productos detectados
// Mostrar en modal de confirmación con checkboxes
```

**Prerequisitos para que funcione:**
1. API `aiplatform.googleapis.com` habilitada en proyecto `canaco-info`
2. Rol `roles/aiplatform.user` otorgado a `firebase-adminsdk-fbsvc@canaco-info.iam.gserviceaccount.com`

---

## Infografía PNG (client-side)

No es un endpoint — se genera en el navegador con Canvas 2D API en `generarInfografiaCanasta()`.

**Función JS:**
```javascript
generarInfografiaCanasta()
// Lee _canData (ya cargado en memoria)
// Renderiza canvas 1280×720 con barras rojo/verde y branding CANACO
// Descarga como canasta_basica_2026.png
```

**Contenido del PNG:**
- Fondo azul marino (`#060d1b`)
- Borde izquierdo azul (`#2563eb`)
- Encabezado: "CANACO SERVYTUR MÉRIDA" + "VARIACIÓN % COSTO CANASTA BÁSICA"
- Barras por mes: rojo = incremento, verde = decremento
- Etiqueta `+X.X%` / `-X.X%` sobre cada barra
- Total `$XXX` bajo cada mes
- Footer: nombre organización + fecha de generación

---

## Columnas visibles por año (lógica frontend)

```javascript
function _mesesVisibles() {
  const anioActual = new Date().getFullYear().toString();
  const mesActual  = new Date().getMonth(); // 0-based
  if (_canYear < anioActual) return CAN_MONTHS;                         // año pasado: 12 meses
  if (_canYear === anioActual) return CAN_MONTHS.slice(0, mesActual + 1); // hasta mes actual
  return [];                                                              // año futuro: nada
}
```

| Escenario | Columnas visibles |
|-----------|-----------------|
| Año 2025 (pasado) | ENE – DIC (12 columnas) |
| Año 2026 en julio | ENE – JUL (7 columnas) |
| Año 2026 en agosto | ENE – AGO (8 columnas, se abre sola) |
| Año 2027 (futuro) | No aparece en el selector |

El selector de año se genera dinámicamente desde 2025 hasta el año actual — nunca muestra años futuros.

---

## Catálogo de productos (19 items — seed 2026)

| # | ID | Nombre | Categoría | Unidad |
|---|----|--------|-----------|--------|
| 1 | `aguacate` | AGUACATE | FRUTAS | KILO |
| 2 | `limon` | LIMON | FRUTAS | KILO |
| 3 | `cebolla` | CEBOLLA | VEGETALES | KILO |
| 4 | `jitomate` | JITOMATE | VEGETALES | KILO |
| 5 | `aceite_vegetal` | ACEITE VEGETAL | ABARROTES | LITRO |
| 6 | `arroz` | ARROZ | ABARROTES | 900 GR. |
| 7 | `azucar` | AZUCAR | ABARROTES | KILO |
| 8 | `frijol` | FRIJOL | ABARROTES | 900 GR |
| 9 | `tortillas` | TORTILLAS | ABARROTES | KILO |
| 10 | `res_bistec` | RES BISTEC ESPECIAL | CARNES | KILO |
| 11 | `cerdo_lomo` | CERDO LOMO | CARNES | KILO |
| 12 | `huevo` | HUEVO (REJILLA 30 PZAS) | CARNES | REJILLA |
| 13 | `pollo_pechuga` | POLLO PECHUGA | CARNES | KILO |
| 14 | `leche_entera` | LECHE ENTERA | LECHES | 1LT |
| 15 | `jabon_tocador` | JABON DE TOCADOR | HIGIENE | 1PZA |
| 16 | `papel_higienico` | PAPEL HIGIENICO | HIGIENE | 4 PZA |
| 17 | `detergente` | DETERGENTE | HIGIENE | 750 GR |
| 18 | `algodon` | ALGODON | FARMACÉUTICOS | 500 GR |
| 19 | `agua_oxigenada` | AGUA OXIGENADA | FARMACÉUTICOS | LITRO |
