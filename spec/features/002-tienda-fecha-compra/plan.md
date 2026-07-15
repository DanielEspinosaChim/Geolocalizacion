---
name: Plan — Tienda y Fecha de Compra
feature: 002
status: COMPLETADO ✅
---

# Plan de implementación — F4

## Orden de ejecución

```
1. backend/routers/canasta.py
   a. update_precio()  → aceptar tienda y fecha_compra opcionales
   b. add_product()    → inicializar tiendas: {} y fechas_compra: {}
   c. seed_canasta()   → ídem en docs de seed
   d. export_excel()   → añadir hoja "Detalle"

2. frontend/index.html
   a. Añadir campo "Tienda del lote" al modal-scan
   b. Añadir modal-meta (tienda + fecha por celda)

3. frontend/js/canasta.js
   a. _buildTbody()         → etiqueta de tienda bajo precio
   b. editarMetadataCanasta() → abrir modal-meta con valores actuales
   c. cerrarModalMeta()
   d. guardarMetadataCanasta() → PUT con tienda + fecha
   e. guardarEscaneo()      → incluir tienda y fecha de hoy en el PUT
```

## Consideraciones

- **Backward compatible**: documentos sin `tiendas`/`fechas_compra` se tratan como `{}` — sin migración
- **No rompe la tabla**: la etiqueta de tienda es un elemento adicional bajo el precio, no reemplaza la edición inline
- **Excel hoja principal**: no cambia — la hoja "Detalle" es adicional
- **Costo cero**: no hay nuevas llamadas a APIs externas

## Dependencias

- Depende de F1 (tabla), F2 (scan) y F3 (Excel) — todas implementadas
- No hay dependencias externas nuevas
