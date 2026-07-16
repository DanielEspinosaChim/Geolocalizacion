# Geolocalizacion Mérida — Documentación Completa

> Última actualización: 2026-05-25

---

## Cómo levantar el servicio

```bash
# Desde la raíz del proyecto
python backend/app.py
```

| URL | Qué es |
|-----|--------|
| `http://localhost:8765` | **Frontend** — el mapa interactivo |
| `http://localhost:8765/docs` | **Swagger** — prueba los endpoints en vivo |
| `http://localhost:8765/redoc` | ReDoc — documentación más limpia |

> El servidor se recarga automáticamente cuando editas cualquier archivo (`reload=True`).  
> Para detenerlo: `Ctrl+C` en la terminal.

---

## Qué hace el sistema

Mapa interactivo para identificar negocios informales en Mérida, Yucatán:
- Cruza datos de **Google Maps** vs **DENUE (INEGI)** — los que están en GMaps pero NO en el padrón son candidatos informales
- Modelo ML (**Random Forest + XGBoost**) predice qué zonas tienen mayor potencial de formalización
- Permite **planificar rutas de visita** para los inspectores
- Cada negocio puede marcarse como `informal`, `en proceso` o `formal`

---

## Estructura del proyecto

```
Geolocalizacion/
│
├── backend/                         ← API Python (FastAPI)
│   ├── app.py                       ← ENTRADA: python backend/app.py
│   ├── requirements.txt             ← dependencias
│   ├── db/
│   │   ├── database.py              ← conexión DB, haversine, TSP
│   │   └── migrations.py            ← crea/actualiza tablas al arrancar
│   └── routers/
│       ├── candidatos.py            ← /api/candidatos, /api/metricas
│       ├── zonas.py                 ← /api/zonas, /api/colonias
│       ├── ruta.py                  ← /api/ruta, /api/ruta-colonia
│       └── prediccion.py            ← /api/predecir
│
├── frontend/                        ← UI HTML/CSS/JS (Leaflet.js)
│   ├── index.html                   ← app de una página
│   ├── css/styles.css
│   └── js/app.js
│
├── data/
│   ├── raw/
│   │   └── denue_yucatan.csv        ← INEGI: negocios formales de Yucatán
│   └── procesado/
│       ├── negocios.db              ← SQLite principal (candidatos, formales, etc.)
│       ├── predicciones_zonas.csv   ← output del modelo ML
│       ├── cruce_completo.csv       ← resultado del cruce GMaps vs DENUE
│       └── modelo_*.pkl             ← modelos entrenados
│
├── src/                             ← Pipeline ML (no tocar)
│   ├── descargar_datos.py           ← Paso 1: descarga DENUE
│   ├── features.py                  ← Paso 2: features por zona
│   ├── modelo.py                    ← Paso 3: entrena RF + XGBoost
│   └── mapa.py                      ← Paso 4: genera mapa HTML estático
│
├── cruce.py                         ← genera negocios.db (correr antes de app.py)
├── main.py                          ← corre los 4 pasos del pipeline
└── PLAN_MEJORAS.md                  ← este archivo
```

---

## Base de datos (SQLite)

Archivo: `data/procesado/negocios.db`

### Tablas existentes
| Tabla | Contenido |
|-------|-----------|
| `candidatos` | Negocios en GMaps sin match en DENUE (informales) |
| `formales` | Negocios con match confirmado en DENUE |

### Columnas nuevas en `candidatos` (agregadas automáticamente)
| Columna | Tipo | Valores |
|---------|------|---------|
| `tipo` | TEXT | `informal` / `en_proceso` / `formal` |
| `fecha_actualizacion` | TEXT | ISO timestamp |
| `colonia_id` | INTEGER | FK a tabla `colonias` |

### Tablas nuevas (creadas automáticamente al arrancar)
| Tabla | Para qué |
|-------|----------|
| `colonias` | Polígonos de colonias de Mérida |
| `reportes` | Reportes ciudadanos (baches, luminarias, etc.) |
| `campanas` | Campañas de visita |
| `campana_negocios` | Negocios asignados a cada campaña con checklist |

---

## Endpoints actuales

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/candidatos` | Lista candidatos. `?limit=`, `?tipo=`, `?colonia_id=` |
| PATCH | `/api/candidatos/{id}/tipo` | Cambiar tipo: `informal` / `en_proceso` / `formal` |
| GET | `/api/metricas` | Total, formales, informales, score promedio |
| GET | `/api/muestra-validacion` | Muestra de matches y no-matches |
| GET | `/api/zonas` | Predicciones por zona del modelo ML |
| GET | `/api/colonias` | Lista colonias (vacía hasta correr importar_colonias.py) |
| GET | `/api/predecir` | Predicción en punto. `?lat=`, `?lng=`, `?radio=` |
| POST | `/api/ruta` | Ruta optimizada. Body: `{place_ids: [...]}` |
| POST | `/api/ruta-colonia` | Ruta auto por colonia. Body: `{colonia_id, limite}` |

---

## Funcionalidades ya implementadas

### Mapa interactivo
- Markers de candidatos informales con colores por tipo (rojo / naranja / verde)
- Capa de zonas de probabilidad de formalización (toggle 🔥 Probabilidad)
- Filtros por tipo: 🔴 Informal · 🟠 En proceso · 🟢 Formal
- Búsqueda por nombre

### Tipo de negocio (Feature 4 — listo)
- Popup en cada marker con dropdown para cambiar el tipo
- `PATCH /api/candidatos/{id}/tipo` guarda en la DB
- El marker cambia de color inmediatamente

### Ruta de visita (Feature 2 — listo)
- Selección manual de candidatos + cálculo de ruta optimizada (TSP + OSRM)
- Ruta automática por colonia: `POST /api/ruta-colonia`
- Botón "Descargar reporte de visita" (el endpoint backend aún está pendiente)

### Predicción por coordenada
- Click en el mapa o ingreso manual de lat/lng
- Muestra si hay un negocio formal, informal o zona con score ML

### Validación del cruce DENUE vs GMaps
- Tabla de matches confirmados con score de similitud de nombre y distancia en metros
- Tabla de candidatos informales para revisión manual

---

## Lo que falta implementar

### 1. Colonias en el mapa (Feature 1)

**Qué hace**: muestra polígonos de colonias sobre el mapa y permite filtrar candidatos por colonia.

**Paso 1** — Crear `scripts/importar_colonias.py` y correrlo una vez:
```python
import osmnx as ox, sqlite3, json
from pathlib import Path

DB = Path("data/procesado/negocios.db")

# Descargar colonias de Mérida desde OpenStreetMap
gdf = ox.features_from_place("Mérida, Yucatán, Mexico", tags={"place": "neighbourhood"})

conn = sqlite3.connect(DB)
for _, row in gdf.iterrows():
    nombre = str(row.get("name", "Sin nombre"))
    geom   = json.dumps(row.geometry.__geo_interface__)
    conn.execute("INSERT OR IGNORE INTO colonias (nombre, geometry_geojson) VALUES (?,?)", (nombre, geom))
conn.commit()
conn.close()
print("Colonias importadas.")
```
```bash
python scripts/importar_colonias.py
```

**Paso 2** — Crear `frontend/js/colonias.js`:
- Fetch `GET /api/colonias` al cargar
- Renderizar polígonos con `L.geoJSON()` sobre el mapa Leaflet (opacidad baja)
- Agregar `<select>` de colonia en el panel lateral
- Al cambiar colonia: refetch `GET /api/candidatos?colonia_id=X` y re-renderizar markers

**Archivos a modificar**:
- `frontend/index.html` → agregar `<select id="select-colonia">` y `<script src="/js/colonias.js">`
- `frontend/js/colonias.js` → CREAR

---

### 2. Reportes ciudadanos (Feature 3)

**Qué hace**: desde el mapa, reportar baches, luminarias, basura, etc. con geolocalización y foto.

**Crear `backend/routers/reportes.py`**:
```
POST   /api/reportes          → tipo, descripcion, lat, lng, foto (multipart)
GET    /api/reportes          → ?tipo=bache&status=pendiente
PATCH  /api/reportes/{id}     → {status: "resuelto"}
```

Tipos: `bache`, `luminaria`, `basura`, `arbol`, `vandalism`, `otro`  
Status: `pendiente` → `en_proceso` → `resuelto`

**Registrar el router en `backend/app.py`**:
```python
from routers import reportes
app.include_router(reportes.router, tags=["Reportes"])
```

**Crear `frontend/js/reportes.js`**:
- Nueva pestaña "Reportes" en la barra de tabs (`index.html`)
- Formulario: tipo (select), descripción (textarea), foto (file input)
- Botón "Colocar en mapa" → modo click en el mapa para elegir ubicación
- Reverse geocoding con Nominatim para obtener dirección
- Lista de reportes recientes con botón "Resolver"
- Markers en el mapa con ícono de advertencia ⚠️, coloreados por status

**Archivos a modificar/crear**:
- `backend/routers/reportes.py` → CREAR
- `backend/app.py` → agregar `include_router(reportes.router)`
- `frontend/js/reportes.js` → CREAR
- `frontend/index.html` → agregar tab + panel de reportes

---

### 3. Reporte de visita descargable (Feature 5)

**Qué hace**: genera un reporte HTML imprimible con los datos del comercio (nombre, dirección, tipo, foto de fachada) y la ruta.

> El botón "📄 Descargar reporte de visita" ya existe en el frontend — solo falta el endpoint.

**Crear `backend/routers/visitas.py`**:
```
POST /api/reporte-visita
Body: {place_ids: ["id1","id2"], fecha_visita: "2026-05-25"}
```
1. Busca los negocios en `candidatos`
2. Construye URL de Google Street View: `https://maps.googleapis.com/maps/api/streetview?size=400x200&location={lat},{lng}&key={KEY}`
3. Renderiza `frontend/templates/reporte_visita.html` con Jinja2
4. Retorna HTML como descarga (`Content-Disposition: attachment`)

**Crear `frontend/templates/reporte_visita.html`**:
- Layout blanco, apto para imprimir (`@media print`)
- Header: título + fecha de visita
- Tarjeta por negocio: nombre, dirección, tipo, badge de status, foto Street View
- Footer con timestamp de generación

**Registrar en `backend/app.py`**:
```python
from routers import visitas
app.include_router(visitas.router, tags=["Visitas"])
# También montar templates:
templates = Jinja2Templates(directory=str(FRONTEND_DIR / "templates"))
```

**Archivos a modificar/crear**:
- `backend/routers/visitas.py` → CREAR
- `backend/app.py` → agregar router + Jinja2Templates
- `frontend/templates/reporte_visita.html` → CREAR

---

### 4. Campañas con checklist y rutas (Feature 6)

**Qué hace**: crear campañas de visita con nombre, colonia, fechas, lista de negocios a visitar y checklist por negocio.

**Crear `backend/routers/campanas.py`**:
```
POST    /api/campanas                              → crear campaña
GET     /api/campanas                              → listar ?status=activa
GET     /api/campanas/{id}                         → detalle + negocios + ruta calculada
POST    /api/campanas/{id}/negocios                → agregar negocios (bulk)
PATCH   /api/campanas/{id}/negocios/{negocio_id}   → actualizar completado/notas/fecha
DELETE  /api/campanas/{id}                         → eliminar
```

**Crear `frontend/js/campanas.js`** — nueva pestaña "Campañas":

*Vista de lista*:
- Cards por campaña: nombre, colonia, fechas, badge de status, barra de progreso
- Botón "Nueva Campaña" → modal con campos: nombre, descripción, colonia (select), fechas

*Vista de detalle*:
- Tabla de negocios con checkbox completado, input notas, date de visita
- "Guardar cambios" → PATCH por cada fila modificada
- "Ver Ruta en Mapa" → llama GET /api/campanas/{id} y renderiza la ruta
- "Descargar Reporte" → llama POST /api/reporte-visita con los IDs de la campaña

**Archivos a modificar/crear**:
- `backend/routers/campanas.py` → CREAR
- `backend/app.py` → agregar `include_router(campanas.router)`
- `frontend/js/campanas.js` → CREAR
- `frontend/index.html` → agregar tab + panel de campañas

---

## Orden recomendado para implementar

```
① scripts/importar_colonias.py    → python scripts/importar_colonias.py
   frontend/js/colonias.js        → polígonos en mapa + filtro por colonia

② backend/routers/reportes.py     → API reportes ciudadanos
   frontend/js/reportes.js        → UI reportes en el mapa

③ backend/routers/visitas.py      → generador de reporte HTML
   frontend/templates/reporte_visita.html

④ backend/routers/campanas.py     → CRUD campañas
   frontend/js/campanas.js        → gestor de campañas
```

Cada ítem es independiente — puedes hacerlos en cualquier orden.

---

## Deploy a producción (Cloud Run)

Cuando quieras subir a producción:

```bash
# Actualizar Dockerfile para apuntar al nuevo backend
# CMD ["uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "8080"]

bash deploy.sh
```

El script sube la imagen a Google Container Registry y despliega en Cloud Run (proyecto `videoimet`, región `us-central1`).

---

## Regenerar los datos (pipeline ML)

Si necesitas actualizar los datos desde cero:

```bash
python main.py           # corre los 4 pasos en secuencia
python cruce.py          # regenera negocios.db
python backend/app.py    # levanta el servicio
```
