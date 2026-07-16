# Especificación de módulos — Canasta Básica

---

## Módulo 1: `backend/routers/canasta.py`

**Descripción:** Endpoints REST del módulo. Solo expone rutas y delega toda la lógica a `canasta_service.py`.

**Archivos:**
- `backend/routers/canasta.py` — router FastAPI
- Registrar en `app.py`: `app.include_router(canasta.router, prefix="/api/canasta")`

**Depende de:**
- `canasta_service.py` para toda la lógica de negocio
- `backend/core/auth.py` para validar rol CANACO

**No debe afectar a:** ningún otro router

**Endpoints:**

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/{year}` | Todos los productos del año con precios |
| PUT | `/{year}/{product_id}` | Actualiza precio de un mes |
| POST | `/{year}/product` | Agrega nuevo producto y en este poder alñadir a que año quiero agregarl|
| DELETE | `/{year}/{product_id}` | Desactiva producto (soft delete) |
| POST | `/scan-invoice` | Envía imagen, retorna productos detectados por IA |
| GET | `/{year}/summary` | Totales y % de cambio mes a mes |
| GET | `/{year}/export/excel` | Descarga .xlsx |
| GET | `/{year}/export/infographic` | Descarga PNG de la infografía |

**Tareas:**

| P | Tarea |
|---|-------|
| P1 | Crear router con endpoints GET y PUT |
| P1 | Registrar router en app.py |
| P1 | Proteger escritura con rol CANACO |
| P2 | Endpoint scan-invoice (multipart/form-data) |
| P2 | Endpoint export/excel |
| P3 | Endpoint export/infographic |

---

## Módulo 2: `backend/services/canasta_service.py`

**Descripción:** Lógica de negocio. Lee y escribe en Firebase. Calcula totales y porcentajes. No sabe nada del HTTP layer.

**Archivos:**
- `backend/services/canasta_service.py`

**Depende de:**
- Firebase Firestore — colección `canasta_basica/{year}/products/{product_id}`
- `backend/core/firebase.py` para el cliente Firestore

**Modelo de datos Firebase:**
```
canasta_basica/
  {year}/                          # ej: "2026"
    products/
      {product_id}/                # ej: "aguacate"
        name: "AGUACATE"
        category: "FRUTAS"
        unit: "KILO"
        sort_order: 1
        active: true
        prices:
          jan: 39.95
          feb: 49.95
          mar: 46.95
          apr: 46.95
          may: 54.95
          jun: 124.00
          jul: 79.00
          aug: null               # null = mes no capturado aún
          sep: null
          oct: null
          nov: null
          dec: null
```

**Categorías del catálogo:**
`FRUTAS`, `VEGETALES`, `ABARROTES`, `CARNES`, `LECHES`, `HIGIENE`, `FARMACÉUTICOS`

**Productos iniciales (seedeo):**

| Categoría | Producto | Unidad |
|-----------|---------|--------|
| FRUTAS | AGUACATE | KILO |
| FRUTAS | LIMON | KILO |
| VEGETALES | CEBOLLA | KILO |
| VEGETALES | JITOMATE | KILO |
| ABARROTES | ACEITE VEGETAL | LITRO |
| ABARROTES | ARROZ | 900 GR. |
| ABARROTES | AZUCAR | KILO |
| ABARROTES | FRIJOL | 900 GR |
| ABARROTES | TORTILLAS | KILO |
| CARNES | RES BISTEC ESPECIAL | KILO |
| CARNES | CERDO LOMO | KILO |
| CARNES | HUEVO (REJILLA 30 PIEZAS) | KILO |
| CARNES | POLLO PECHUGA | KILO |
| LECHES | LECHE ENTERA | 1LT |
| HIGIENE | JABON DE TOCADOR | 1PZA |
| HIGIENE | PAPEL HIGIENICO | 4 PZA |
| HIGIENE | DETERGENTE | 750 GR |
| FARMACÉUTICOS | ALGODON | 500 GR |
| FARMACÉUTICOS | AGUA OXIGENADA | LITRO |

**Tareas:**

| P | Tarea |
|---|-------|
| P1 | Función `get_year_data(year)` — lee todos los productos y precios |
| P1 | Función `update_price(year, product_id, month, price)` |
| P1 | Función `get_summary(year)` — totales y % por mes |
| P1 | Script de seedeo con datos históricos 2026 (ene–jul) |
| P2 | Función `add_product(year, data)` |
| P2 | Función `deactivate_product(year, product_id)` |

---

## Módulo 3: `backend/services/canasta_ia.py`

**Descripción:** Integración con Gemini via Vertex AI para extraer productos y precios de
imágenes de facturas. Usa la cuenta de servicio de Cloud Run — sin API keys adicionales.

**Archivos:**
- `backend/services/canasta_ia.py`

**Depende de:**
- `google-cloud-aiplatform` SDK — modelo `gemini-2.0-flash` (soporta visión, rápido y económico)
- Autenticación: ADC (Application Default Credentials) — usa automáticamente la cuenta de
  servicio `589026168608-compute@developer.gserviceaccount.com` que ya está en Cloud Run
- `canasta_service.py` para obtener el catálogo y hacer el matching

**⚠️ Vertex AI NO está habilitado en el proyecto todavía — ver sección "Activación" abajo.**

**Flujo:**
1. Recibe imagen en bytes (multipart upload desde el frontend)
2. Llama a Gemini con la imagen + prompt estructurado
3. Obtiene JSON `[{nombre, precio, unidad}]`
4. Hace fuzzy matching contra catálogo existente
5. Retorna lista con campo `confidence`: `high` / `medium` / `low`

**Modelo recomendado:** `gemini-2.0-flash` en región `us-central1`
- Soporta imágenes nativas (JPEG, PNG, WEBP, HEIC)
- Costo estimado: ~$0.0003 USD por escaneo de factura (muy por debajo de otras opciones)
- Latencia: ~2-4 segundos por imagen

**Prompt base:**
```
Eres un asistente que extrae información de facturas o tickets de supermercado.
Identifica cada producto con su precio unitario y unidad de medida.
Devuelve únicamente JSON con el siguiente formato, sin texto adicional:
[{"nombre": "...", "precio": 0.00, "unidad": "..."}]
```

**Código de referencia:**
```python
import vertexai
from vertexai.generative_models import GenerativeModel, Part

vertexai.init(project="videoimet", location="us-central1")
model = GenerativeModel("gemini-2.0-flash")

image_part = Part.from_data(image_bytes, mime_type="image/jpeg")
response = model.generate_content([image_part, prompt])
# response.text → JSON string
```

---

### Activación de Vertex AI en el proyecto `videoimet`

Vertex AI no está habilitado actualmente. Pasos para solicitarlo/activarlo:

**Opción A — Desde Google Cloud Console (recomendado, 2 minutos):**
1. Ir a [console.cloud.google.com](https://console.cloud.google.com)
2. Seleccionar proyecto `videoimet`
3. Buscar "Vertex AI API" en el buscador superior
4. Clic en "Habilitar"
5. También habilitar "Generative Language API" si aparece como dependencia

**Opción B — Desde gcloud CLI:**
```bash
gcloud services enable aiplatform.googleapis.com --project=videoimet
```

**Permiso en la cuenta de servicio (verificar):**
La cuenta `589026168608-compute@developer.gserviceaccount.com` necesita el rol
`roles/aiplatform.user`. Verificar en IAM o agregar:
```bash
gcloud projects add-iam-policy-binding videoimet \
  --member="serviceAccount:589026168608-compute@developer.gserviceaccount.com" \
  --role="roles/aiplatform.user"
```

**Una vez habilitado:** No se necesita ninguna variable de entorno nueva. Cloud Run
detecta automáticamente las credenciales de la cuenta de servicio.

**Regla de confianza para matching:**
- `high` (≥ 85% similitud): se mapea automáticamente
- `medium` (60–84%): se muestra al usuario para confirmar
- `low` (< 60%): se marca como "no encontrado", el usuario mapea manualmente

**Tareas:**

| P | Tarea |
|---|-------|
| P1 | Función `extract_from_image(base64_image)` — llama a Claude Vision |
| P1 | Función `match_to_catalog(extracted, catalog)` — fuzzy matching |
| P2 | Manejo de errores: imagen ilegible, respuesta malformada |
| P2 | Tests con imágenes de prueba reales |

---

## Módulo 4: `backend/services/canasta_export.py`

**Descripción:** Genera el archivo Excel y la infografía PNG a partir de los datos de Firebase.

**Archivos:**
- `backend/services/canasta_export.py`

**Depende de:**
- `openpyxl` para Excel
- `Pillow` para la imagen de infografía
- `canasta_service.py` para obtener los datos

**Excel — formato de salida:**
Reproduce exactamente la hoja actual:
- Columnas: CATEGORIA, SUMINISTRO, PRESENTACION, ENERO … MES_ACTUAL
- Fila de totales
- Fila de diferencia absoluta vs mes anterior
- Fila de % de cambio
- Estilos: headers en azul oscuro, texto blanco, alternado por categoría

**Infografía PNG — formato de salida:**
- Fondo azul marino (`#1a2744`)
- Título: "Comparativo {AÑO} / Costo Canasta Básica"
- Barras de colores por mes con el % de cambio encima
- Nota al pie: "Incremento/Decremento respecto al mes inmediato anterior"

**Tareas:**

| P | Tarea |
|---|-------|
| P2 | Función `generate_excel(year_data)` — retorna bytes del .xlsx |
| P2 | Aplicar estilos y formato igual al Excel original |
| P3 | Función `generate_infographic(summary)` — retorna bytes del PNG |
| P3 | Replicar paleta de colores de la infografía actual |

---

## Módulo 5: `frontend/canasta.html` + `frontend/js/canasta.js`

**Descripción:** Interfaz de usuario. Tabla editable, botón de escaneo, gráficas y botones de descarga. Vanilla JS + Chart.js.

**Archivos:**
- `frontend/canasta.html`
- `frontend/js/canasta.js`
- `frontend/css/canasta.css` (opcional, puede ir inline)

**Dependencias frontend (CDN, sin npm):**
- Chart.js 4.x — gráficas
- Sin frameworks adicionales (mantener consistencia con el proyecto)

**Componentes UI:**

1. **Header del módulo** — título, selector de año, botones Excel/PNG
2. **Tabla de precios** — edición inline por celda, agrupada por categoría, fila de totales y % al final
3. **Botón "Escanear factura"** — abre input de imagen, muestra spinner mientras procesa
4. **Modal de confirmación IA** — tabla con semáforo de confianza, checkboxes para aprobar/rechazar
5. **Dashboard de gráficas** — barras de % mensual + línea de evolución por producto

**Tareas:**

| P | Tarea |
|---|-------|
| P1 | Tabla editable con guardado por celda (PATCH a la API) |
| P1 | Cálculo visual de totales y % (refleja datos de `/summary`) |
| P1 | Agregar producto desde la UI (modal simple) |
| P2 | Botón de escaneo con upload de imagen |
| P2 | Modal de confirmación con semáforo de confianza |
| P2 | Gráfica de barras mensual (Chart.js) |
| P3 | Botones de descarga Excel y PNG |
| P3 | Selector de año con histórico |
| P3 | Línea de evolución por producto |

---

## Tests mínimos requeridos

- [ ] `GET /api/canasta/2026` retorna los 19 productos con precios
- [ ] `PUT /api/canasta/2026/aguacate` actualiza correctamente en Firebase
- [ ] `POST /api/canasta/scan-invoice` retorna JSON con al menos 1 producto detectado
- [ ] `GET /api/canasta/2026/summary` calcula correctamente los % de cambio
- [ ] `GET /api/canasta/2026/export/excel` retorna un archivo .xlsx válido
- [ ] Usuario sin rol CANACO no puede hacer PUT/POST/DELETE

---

## Orden de implementación recomendado

```
1. Script de seedeo Firebase (datos 2026)
2. canasta_service.py — get y update básico
3. canasta.py — endpoints GET y PUT
4. canasta.html — tabla editable (MVP funcional)
5. canasta_ia.py — integración Claude Vision
6. Modal de confirmación IA en frontend
7. canasta_export.py — Excel primero, PNG después
8. Dashboard con Chart.js
```
