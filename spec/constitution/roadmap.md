---
name: Roadmap
type: constitution
---

# Roadmap — Canasta Básica Tracker

## Implementadas ✅

### F1 — Tabla de precios manual
- Tabla editable: categoría / producto / unidad / precio por mes
- Cálculo automático de totales y % de cambio vs mes anterior
- Colorización rojo/verde según variación
- Agregar y desactivar productos desde la UI
- Solo usuarios con rol CANACO pueden editar
- Columnas visibles según año (histórico: 12 meses, año actual: hasta el mes corriente)

### F2 — Escaneo de facturas con IA
- Upload de imagen (JPEG/PNG/WEBP/HEIC) → Gemini 3.5 Flash → JSON de productos
- Fuzzy matching contra catálogo existente con score de confianza
- Modal de confirmación con semáforo: 🟢 Alta / 🟡 Media / 🔴 Baja
- El usuario aprueba y se guardan los precios del mes seleccionado

### F3 — Dashboard y exportación
- Gráfica de barras Chart.js con % de cambio mensual (rojo = sube, verde = baja)
- Descarga Excel (.xlsx) con formato oficial CANACO (headers azul, por categoría, filas TOTAL/DIFERENCIA/%)
- Infografía PNG client-side 1280×720 (Canvas 2D, lista para publicar en redes)
- Selector de año con histórico desde 2025

---

## En curso 🔄

### F4 — Tienda y fecha de compra
- Campo `tienda` por producto-mes (¿dónde se compró?)
- Campo `fecha_compra` por producto-mes (¿cuándo?)
- Visible en la tabla (pequeña etiqueta bajo el precio)
- Modal ligero para editar tienda + fecha
- En escaneo IA: captura tienda única para todos los productos del lote
- Exportable en hoja "Detalle" del Excel

---

## Backlog

- Comparativo entre tiendas (¿dónde es más barato cada producto?)
- Alertas automáticas cuando un precio sube > X% vs mes anterior
- Línea de evolución histórica por producto (hover interactivo en dashboard)
- Selector de año futuro bloqueado con explicación al usuario
