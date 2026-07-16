# docs/ — Registro de sesiones y notas de trabajo

Esta carpeta se actualiza automáticamente en cada sesión de trabajo relevante.

**Regla:** Al terminar cualquier tarea que modifique código o decisiones de diseño,
dejar una nota breve en `sesiones/YYYY-MM-DD.md` con:
- Qué se hizo
- Decisiones tomadas y por qué
- Qué quedó pendiente

---

## Archivos de referencia

| Archivo | Contenido |
|---------|-----------|
| `modulos/canasta_basica/API.md` | Documentación de todos los endpoints REST del módulo |
| `modulos/canasta_basica/MODULOS.md` | Especificación de módulos backend y frontend |
| `modulos/canasta_basica/PLAN.md` | Plan original del módulo (histórico) |

> Para la spec oficial y roadmap actualizado → ver `spec/`

---

## Notas de sesión

### 2026-07-14
- Se creó estructura SDD completa en `spec/`
- Se añadieron campos `tienda` y `fecha_compra` a la tabla canasta
  - Firestore: nuevos mapas `tiendas` y `fechas_compra` por producto
  - Backend: `PUT` acepta `tienda` y `fecha_compra` opcionales; `POST /product` y seed los inicializan vacíos; Excel añade hoja "Detalle"
  - Frontend: etiqueta de tienda bajo cada precio en la tabla; modal ligero para editar; scan IA captura tienda del lote
- Spec: `spec/features/002-tienda-fecha-compra/` — LISTO PARA IMPLEMENTAR
