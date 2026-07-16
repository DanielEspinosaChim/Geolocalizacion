# Módulo: Canasta Básica Tracker

## Qué hace

Digitaliza el flujo actual de CANACO SERVYTUR Mérida para registrar y comparar
precios de la canasta básica mes a mes. Mantiene la misma lógica del Excel actual
y añade captura automática vía IA y generación de reportes con un clic.

## Problema que resuelve

Hoy el equipo lleva el registro en Excel manualmente. No hay histórico centralizado,
generar la infografía mensual es trabajo manual y no existe forma automatizada de
cargar precios desde facturas.

---

## Funcionalidades

### F1 — Tabla de precios manual (MVP)
- Tabla editable igual al Excel: categoría / producto / unidad / precio por mes
- Cálculo automático de total mensual y % de cambio vs mes anterior
- Colorización: verde si baja, rojo si sube
- Agregar y desactivar productos desde la UI
- Solo usuarios con rol CANACO pueden editar

### F2 — Escaneo de facturas con IA
- El usuario sube foto de la cámara o galería
- Backend manda la imagen a  Gemini 3.5-flash
- La IA extrae productos y precios en JSON estructurado
- Mapeo automático al catálogo existente (fuzzy matching)
- Modal de confirmación con semáforo: verde = seguro, amarillo = revisar, rojo = no encontrado
- El usuario aprueba y se guardan los precios

### F3 — Dashboard y exportación
- Gráfica de barras con % de cambio por mes (mismos colores del infográfico actual)
- Línea de evolución por producto (hover interactivo)
- Tabla resumen por categoría
- Descarga Excel (.xlsx) con el mismo formato del archivo actual
- Descarga PNG de la infografía lista para publicar
- Selector de año para histórico

---

## Stack del módulo

| Capa | Tecnología |
|------|-----------|
| Backend | FastAPI — nuevo router `backend/routers/canasta.py` |
| Servicios | `backend/services/canasta_service.py`, `canasta_ia.py`, `canasta_export.py` |
| Base de datos | Firebase Firestore — colección `canasta_basica/` |
| IA | Vertex AI SDK — modelo `gemini-2.0-flash` (visión, sin API key extra) |
| Excel | `openpyxl` |
| Imagen | `Pillow` |
| Frontend | Vanilla JS + Chart.js — `frontend/canasta.html` |

---

## Variables de entorno nuevas

Ninguna. Vertex AI usa la cuenta de servicio de Cloud Run automáticamente
(`589026168608-compute@developer.gserviceaccount.com`).

**Solo se necesita habilitar la API una vez:**
```bash
gcloud services enable aiplatform.googleapis.com --project=videoimet
```

---

## Dependencias nuevas (requirements.prod.txt)

```
google-cloud-aiplatform
openpyxl
Pillow
```

---

## Fases y estimación

| Fase | Contenido | Estimado |
|------|-----------|----------|
| F1 | Tabla manual + Firebase + cálculos | ~1 semana |
| F2 | Integración IA + modal confirmación | ~1 semana |
| F3 | Dashboard + exportación Excel + PNG | ~1 semana |

---

## Reglas de aislamiento

Este módulo es 100% independiente. **No toca nada de lo que ya existe.**

- No modifica `backend/routers/geo.py`, `campanas.py`, `candidatos.py`
- No modifica `backend/core/auth.py` — solo consume el decorador de rol
- No modifica colecciones Firebase existentes
- Solo añade un link de navegación en `frontend/index.html`
- El router llama únicamente a `canasta_service.py`; el servicio nunca importa desde otros módulos
