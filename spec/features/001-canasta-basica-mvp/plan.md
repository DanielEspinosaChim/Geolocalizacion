---
name: Plan — Canasta Básica MVP
feature: 001
status: COMPLETADO ✅
---

# Plan de implementación — MVP (retrospectivo)

> El MVP ya está implementado. Este plan es la reconstrucción del orden en que se construyó.

## Orden de construcción seguido

```
1. Script de seedeo Firebase (datos históricos 2026 ENE–JUL) → endpoint /seed
2. canasta_service integrado en canasta.py — get y update básico
3. Endpoints GET y PUT — tabla funcional
4. canasta.js — tabla editable con guardado por celda
5. Integración Gemini (google-genai) — scan-invoice
6. Modal de confirmación IA en frontend (modal-scan)
7. Export Excel (openpyxl) con formato CANACO
8. Infografía PNG client-side (Canvas 2D)
9. Gráfica de barras Chart.js
```

## Fases de desarrollo

| Fase | Contenido | Estado |
|------|-----------|--------|
| F1 | Tabla manual + Firebase + cálculos | ✅ |
| F2 | Integración IA + modal confirmación | ✅ |
| F3 | Dashboard + exportación Excel + PNG | ✅ |

## Decisiones técnicas tomadas

- **Todo en un solo router**: se optó por mantener todo en `canasta.py` en vez de separar en services — el módulo es autónomo y el volumen de código es manejable.
- **Canvas 2D client-side para infografía**: evita dependencia de Pillow en el servidor y es más rápido.
- **google-genai enterprise=True**: usa `service_account.json` del proyecto `canaco-info` en lugar del proyecto principal `videoimet` — diferente billing.
- **Soft delete**: productos nunca se eliminan de Firestore para conservar históricos.
