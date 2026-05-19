# 🗺️ Diagnóstico: Sistema de Geolocalización de Formalización de Negocios

> **Veredicto directo:** El proyecto existe como código pero **no puede ejecutarse ni usarse** porque le faltan los datos que lo alimentan. Es código sin combustible. No es que esté mal hecho conceptualmente — es que está incompleto de manera fundamental.

---

## 📦 Qué existe hoy

### Arquitectura del sistema

```
main.py              ← Orquestador principal (4 pasos en secuencia)
consultar.py         ← CLI para consultar una coordenada específica
src/
  config.py          ← Configuración, coordenadas, rutas
  descargar_datos.py ← Paso 1: descarga DENUE de INEGI
  features.py        ← Paso 2: calcula variables por zona de 500m×500m
  modelo.py          ← Paso 3: entrena Random Forest + XGBoost
  mapa.py            ← Paso 4: genera HTML interactivo con Leaflet.js
  google_maps.py     ← Paso 1.5: enriquecer con Google Maps Places API
mapas/               ← Output: HTML, gráficas
data/                ← Vacío — aquí deberían vivir los datos
```

### Qué hace el sistema (cuando funciona)

1. Descarga el DENUE de Yucatán de INEGI (~50 MB, negocios **formales** registrados)
2. Divide Mérida en una cuadrícula de celdas de 500m × 500m
3. Calcula features por celda: densidad de negocios, sector, antigüedad, % sector informal
4. Entrena dos modelos ML (Random Forest + XGBoost) para predecir qué zonas tienen más negocios informales **candidatos a formalizarse**
5. Genera un mapa HTML interactivo donde puedes hacer clic en cualquier punto y saber si un negocio es formal o informal

---

## 🔴 Por qué está inútil hoy

### Problema #1 — La carpeta `data/` está vacía

```
data/
  raw/        ← VACÍO (necesita denue_yucatan.csv)
  procesado/  ← VACÍO (necesita todos los CSVs procesados)
```

**`main.py` necesita ejecutarse de principio a fin para generar esos archivos.**  
`consultar.py` depende de `predicciones_zonas.csv` — si no existe, falla inmediatamente con error.

### Problema #2 — La descarga del DENUE probablemente está rota

```python
url = "https://www.inegi.org.mx/contenidos/masiva/denue/denue_31_csv.zip"
```

INEGI cambia periódicamente sus URLs de descarga masiva. Si esta URL ya no responde con HTTP 200, el pipeline **se detiene en el Paso 1** y no genera nada.

### Problema #3 — Sin Google Maps, el modelo es débil

El feature más poderoso del modelo (`gmaps_brecha` = proporción de negocios informales visibles en Maps que no están en DENUE) **requiere ejecutar `python src/google_maps.py`** lo que:
- Cuesta ~$5–10 USD en Google Cloud
- Requiere la service account configurada (`service_account.json`)
- Nunca se ha ejecutado (no hay `gmaps_places.json` en caché)

**Sin Google Maps, el modelo solo usa datos DENUE** — que solo contiene negocios **ya formales**, así que lo que "predice" es esencialmente densidad de negocios formales, no informalidad real.

### Problema #4 — El modelo predice algo circular

> El target (`alta_formalizacion`) se define como zonas con micro-negocios de sectores informales **registrados en DENUE en los últimos 3 años**.

Esto es una contradicción: **si están en DENUE, ya son formales**. El modelo está aprendiendo a predecir dónde hay negocios recién formalizados — no dónde hay negocios informales sin registrar. El feature que rompe esta circularidad es `gmaps_brecha`, que precisamente no está configurado.

### Problema #5 — El mapa HTML tiene 16 MB

```
mapas/mapa_formalizacion_merida.html  ← 16.7 MB
```

Eso significa que el pipeline sí se ejecutó alguna vez, pero el HTML embebe **todo el DENUE de Yucatán** (no solo Mérida) como JSON. El mapa tarda en cargar, el browser puede trabarse, y el archivo es imposible de compartir por email.

### Problema #6 — Sin interfaz real

El uso actual es:
```bash
python consultar.py 20.9674 -89.5926
# → output en terminal con colores ANSI
```

Eso **no es una herramienta**. Es un script de desarrollador. Nadie de negocio o gobierno va a usar eso.

---

## 🟡 Qué sí funciona (crédito donde corresponde)

| Componente | Estado |
|---|---|
| Arquitectura modular | ✅ Bien diseñada |
| Pipeline de 4 pasos | ✅ Lógica correcta |
| Mapa HTML interactivo | ✅ Se generó, Leaflet.js funciona |
| Modelo ML dual (RF + XGBoost) | ✅ Código correcto |
| Haversine / búsqueda de negocios cercanos | ✅ Implementado |
| Autenticación GCP con service account | ✅ Implementado |
| Cache de datos procesados | ✅ No reprocesa si ya existe |

---

## 🚀 Plan para hacerlo funcional de verdad

### Fase 1 — Que corra (1-2 horas)

**Objetivo:** Que `python main.py` termine sin errores y genere el mapa.

1. **Verificar/arreglar la URL del DENUE:**
   - Ir a [inegi.org.mx/app/descarga](https://www.inegi.org.mx/app/descarga/?ti=6) y confirmar la URL actual
   - Si cambió, actualizar `descargar_datos.py` línea 24
   - Alternativa: descargar manualmente y poner en `data/raw/denue_yucatan.csv`

2. **Ejecutar el pipeline completo:**
   ```bash
   cd "c:\Users\danye\OneDrive\Documentos\Geolocalizacion"
   pip install -r requirements.txt
   python main.py
   ```

3. **Verificar el mapa:** Abrir `mapas/mapa_formalizacion_merida.html`

**Resultado esperado:** Mapa funcional con datos DENUE (solo negocios formales, sin Google Maps).

---

### Fase 2 — Que sea preciso (2-4 horas + ~$5 USD)

**Objetivo:** Activar el feature más importante: la brecha de informalidad con Google Maps.

1. **Configurar service account:**
   - Asegurarse de que `service_account.json` está en la raíz del proyecto
   - Habilitar "Places API (New)" en Google Cloud Console para el proyecto `videoimet`

2. **Descargar datos de Google Maps:**
   ```bash
   python src/google_maps.py
   # Confirmar cuando pregunte el costo estimado (~$5-10 USD)
   ```

3. **Borrar caché y regenerar el modelo:**
   ```bash
   del data\procesado\features_zonas.csv
   del data\procesado\predicciones_zonas.csv
   python main.py
   ```

**Resultado esperado:** El modelo ahora sí predice informalidad real, no solo densidad de formales.

---

### Fase 3 — Que sea una herramienta real (1-2 días)

**Objetivo:** Convertirlo en algo que alguien que no es programador pueda usar.

#### Opción A — Web app local (más rápido)
Crear una interfaz web con FastAPI o Flask:

```
http://localhost:8000/
  → Mapa interactivo ya cargado
  → Formulario: pegar dirección o coordenadas
  → Resultado inmediato: formal/informal, score de zona, negocios cercanos
  → Exportar reporte PDF de una zona
```

#### Opción B — Mejorar el mapa HTML existente
- Agregar buscador por **nombre de calle o colonia** (Nominatim geocoding, gratis)
- Reducir el tamaño del HTML filtrando solo Mérida (no todo Yucatán)
- Agregar botón "Descargar reporte de esta zona" (genera PDF con datos)
- Agregar filtros por sector económico

#### Opción C — Dashboard para gobierno/stakeholders
Un dashboard Streamlit o Panel que muestre:
- Mapa de calor de informalidad
- Top 10 zonas prioritarias para intervención
- Tendencia de formalización por año
- Comparativa de sectores

---

### Fase 4 — Que sea correcto (refactor del modelo)

**Objetivo:** Corregir la circularidad del target para que el modelo prediga informalidad real.

**Redefinir el target `alta_formalizacion`:**

En lugar de "zonas con micro-negocios formalizados recientemente en DENUE", usar:

```
alta_informalidad = (gmaps_brecha > percentil_75)
```

Esto es: zonas donde hay muchos negocios visibles en Google Maps que **no están** en DENUE = economía informal real.

También agregar datos adicionales:
- **SIEM** (Sistema de Información Empresarial Mexicano) — registros adicionales
- **IMSS** — densidad de trabajadores formales por colonia (dato público)
- **Colonias populares / polígonos de pobreza** — CONEVAL o SEDESOL

---

## 📋 Resumen ejecutivo

| Diagnóstico | Detalle |
|---|---|
| **Problema raíz** | No hay datos procesados; el pipeline nunca completó correctamente |
| **Segundo problema** | El feature crítico (Google Maps) nunca se configuró |
| **Tercer problema** | El target del modelo tiene una contradicción lógica |
| **El código en sí** | Bien estructurado, reutilizable, no hay que tirarlo |
| **Para hacerlo útil** | Necesita datos reales + interfaz para humanos + corrección del target |
| **Tiempo mínimo** | 2-4 horas para tener algo funcional |
| **Costo mínimo** | ~$5-10 USD para Google Maps (una sola vez) |

> [!IMPORTANT]
> **Acción inmediata:** Antes de cualquier otra cosa, verificar si la URL de DENUE de INEGI sigue activa y ejecutar `python main.py`. Si la descarga funciona, en una hora ya tienes el mapa corriendo.

> [!NOTE]
> El archivo `mapas/mapa_formalizacion_merida.html` que ya existe (16 MB) fue generado en una ejecución anterior. Ábrelo en Chrome para ver si el mapa carga — si funciona, al menos el pipeline sí corrió alguna vez y el problema es solo que los datos no están en el repositorio de git (probablemente en `.gitignore`).
