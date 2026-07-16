---
name: Tech Stack
type: constitution
---

# Tech Stack

## Stack real implementado

| Capa | Tecnología | Notas |
|------|-----------|-------|
| Backend | FastAPI | Cloud Run · `backend/routers/canasta.py` (todo en un solo router) |
| Base de datos | Firebase Firestore | Colección `canasta_basica/{year}/products/` |
| IA (facturas) | `google-genai` 2.x | `gemini-3.5-flash` · auth por `service_account.json` · proyecto `canaco-info` |
| Excel | `openpyxl` | En `requirements.prod.txt` |
| Infografía | Canvas 2D API | Client-side, sin dependencias extra |
| Gráfica | Chart.js 4.4.0 | CDN |
| Frontend | Vanilla JS | `frontend/js/canasta.js` — sin frameworks |
| Auth | `backend/core/auth.py` | Rol `CANACO` para escritura |
| Deploy | Cloud Run | Proyecto GCP `videoimet` |

## Proyectos GCP relevantes

| Proyecto | Uso |
|----------|-----|
| `videoimet` | Cloud Run deploy principal |
| `canaco-info` | Proyecto de Gemini / IA — `service_account.json` |

## Comandos de desarrollo

```bash
# Dev local
uvicorn backend.app:app --reload

# Deploy
gcloud run deploy videoimet --region us-central1 --source .

# Habilitar Vertex AI (una sola vez)
gcloud services enable aiplatform.googleapis.com --project=videoimet
```

## Dependencias nuevas (ya en requirements.prod.txt)

```
google-cloud-aiplatform
google-genai
openpyxl
Pillow
```

## Reglas de aislamiento

El módulo canasta es **100% independiente**. No toca:
- `backend/routers/geo.py`, `campanas.py`, `candidatos.py`
- `backend/core/auth.py` (solo lo consume, no lo modifica)
- Colecciones Firestore existentes (`geolocalizacion/`, `campanas/`, etc.)
