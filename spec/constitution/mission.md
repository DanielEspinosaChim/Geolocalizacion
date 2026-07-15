---
name: Mission
type: constitution
---

# Misión — GeoFormal · Canasta Básica Tracker

**Qué es:** Plataforma interna para CANACO SERVYTUR Mérida. Módulo activo: **Canasta Básica Tracker**.

**Para quién:** Equipo de CANACO Mérida — usuarios con rol `CANACO` para escritura, acceso de lectura para cualquier usuario autenticado.

**Problema que resuelve:**
El equipo llevaba el registro de precios en Excel manualmente. No había histórico centralizado, generar la infografía mensual era trabajo manual y no existía forma automatizada de cargar precios desde facturas o tickets.

**Qué hace:**
- Tabla editable mes a mes por producto (igual al Excel actual)
- Captura automática de precios vía IA escaneando facturas (Gemini 3.5 Flash)
- Registra **en qué tienda** y **en qué fecha** se compró cada producto
- Exporta Excel con el formato oficial CANACO e infografía PNG lista para publicar

**Diferenciador:** No reemplaza el flujo del equipo — lo digitaliza exactamente como ya trabajan, añade la IA como atajo y agrega trazabilidad de tienda y fecha por precio.
