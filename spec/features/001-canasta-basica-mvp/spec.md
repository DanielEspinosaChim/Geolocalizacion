---
name: Canasta Básica MVP
feature: 001
status: IMPLEMENTADA ✅
---

# Spec — Canasta Básica MVP (F1 + F2 + F3)

> Feature completamente implementada. Este documento es referencia de lo que existe.
> Para cambios al módulo → crear nueva feature en `spec/features/00N-*/`.

---

## Descripción

Digitalización completa del flujo CANACO: tabla de precios editable, captura IA de facturas
y exportación en los formatos que el equipo ya usa (Excel + infografía PNG).

---

## Módulos implementados

### `backend/routers/canasta.py`
Router FastAPI único con toda la lógica del módulo. Registrado en `app.py` bajo `/api/canasta`.

### Esquema Firestore

```
canasta_basica/
  {year}/                          # "2026", "2025", etc.
    products/
      {product_id}/                # ej: "aguacate"
        name:         "AGUACATE"
        category:     "FRUTAS"
        unit:         "KILO"
        sort_order:   1
        active:       true
        created_at:   "2026-07-13 02:50:00"
        updated_at:   "2026-07-13 02:50:00"
        prices:
          jan: 39.95
          feb: 49.95
          ...
          dec: null               # null = mes no capturado
        tiendas:                  # NUEVO (F4) — puede no existir en docs pre-F4
          jan: "WALMART"
          ...
        fechas_compra:            # NUEVO (F4)
          jan: "2026-01-15"
          ...
```

**Categorías válidas (en orden):**
`FRUTAS` · `VEGETALES` · `ABARROTES` · `CARNES` · `LECHES` · `HIGIENE` · `FARMACÉUTICOS`

---

## Endpoints implementados

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/canasta/{year}` | Todos los productos activos del año |
| PUT | `/api/canasta/{year}/{product_id}` | Actualiza precio (+ tienda/fecha en F4) |
| POST | `/api/canasta/{year}/product` | Agrega producto nuevo |
| DELETE | `/api/canasta/{year}/{product_id}` | Soft delete (active=false) |
| GET | `/api/canasta/{year}/summary` | Totales y % de cambio mes a mes |
| POST | `/api/canasta/{year}/seed` | Carga datos históricos 2026 (idempotente) |
| GET | `/api/canasta/{year}/export/excel` | Descarga .xlsx formato CANACO |
| POST | `/api/canasta/{year}/scan-invoice` | Escanea factura con Gemini 3.5 Flash |

---

## Frontend implementado

- `frontend/js/canasta.js` — toda la lógica UI
- Tabla en `frontend/index.html` (sección canasta del panel)
- Modales: `modal-canasta` (agregar producto), `modal-scan` (escaneo IA), `modal-meta` (tienda/fecha — F4)

---

## Catálogo inicial (seed 2026 — 19 productos)

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
