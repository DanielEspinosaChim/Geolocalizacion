---
name: Seguridad Transversal
feature: 000
status: ACTIVA — revisar en cada PR
---

# Seguridad Transversal — Checklist

Aplica a **todas** las features del módulo Canasta Básica.

---

## Checklist de 11 puntos

### 1. Validación de inputs en el backend
- [x] `month` validado contra lista `MONTHS` — devuelve 400 si inválido
- [x] `price` convertido a float con manejo de errores; null aceptado explícitamente
- [x] `name` y `category` requeridos en POST — devuelve 400 si faltan
- [ ] `tienda` y `fecha_compra`: validar longitud máxima (≤ 80 chars) y formato de fecha ISO

### 2. Control de acceso
- [x] Endpoints de escritura (PUT, POST, DELETE) protegidos con rol `CANACO`
- [x] Lectura (GET) disponible para cualquier usuario autenticado
- [ ] Verificar que `scan-invoice` también requiere rol CANACO (actualmente sin guard)

### 3. Secrets y credenciales
- [x] `service_account.json` cargado por variable de entorno `GOOGLE_APPLICATION_CREDENTIALS`
- [x] Nunca expuesto en respuestas ni logs
- [x] `.gitignore` excluye `service_account.json`

### 4. Protección contra inyecciones
- [x] Firestore SDK parametriza automáticamente — no hay SQL ni queries de texto libre
- [x] IDs de producto generados internamente (slug del nombre) — sin interpolación de input directo en rutas Firestore
- [ ] `tienda` y `fecha_compra` se guardan como strings en Firestore — no interpolar en HTML sin escapar

### 5. Rate limiting
- [ ] El endpoint `scan-invoice` llama a Gemini por cada request. Pendiente: añadir rate limit por usuario (ej. 10 scans/hora) para evitar abuso de costos.

### 6. Logging seguro
- [x] Errores se propagan como HTTPException con mensajes genéricos al cliente
- [x] No se loguean bytes de imagen ni contenido de facturas
- [ ] Añadir log de auditoría para PUT/POST/DELETE (quién, cuándo, qué cambió)

### 7. Aislamiento multi-tenant
- N/A — sistema mono-organización (CANACO Mérida). No hay múltiples clientes. Un solo namespace Firestore.

### 8. Validación de uploads
- [x] MIME type del upload verificado antes de enviarlo a Gemini
- [ ] Añadir límite de tamaño de imagen (actualmente sin límite — un archivo de 100 MB pasaría)

### 9. Soft deletes y recuperabilidad
- [x] DELETE es soft (marca `active: false`). Los datos históricos se conservan en Firestore.
- [x] No hay operación destructiva permanente expuesta en la API

### 10. CORS y headers
- [x] FastAPI configurado con CORS en `backend/app.py` — verificar que no sea `allow_origins=["*"]` en producción

### 11. Dependencias
- [x] `openpyxl`, `google-genai` en `requirements.prod.txt` con versiones fijas
- [ ] Revisar CVEs en próxima actualización trimestral

---

## Tareas de seguridad pendientes (por prioridad)

| P | Tarea |
|---|-------|
| P1 | Guard de rol CANACO en `scan-invoice` |
| P1 | Límite de tamaño de imagen en upload (10 MB máximo) |
| P2 | Validar `tienda` (≤ 80 chars) y `fecha_compra` (formato YYYY-MM-DD) |
| P2 | Rate limit en `scan-invoice` (10 req/hora por usuario) |
| P3 | Log de auditoría en escrituras |
| P3 | Revisar CORS en producción |
