# ── Etapa 1: build del frontend (React + Vite) ────────────────────────────────
FROM node:22-slim AS web
WORKDIR /web
RUN corepack enable
# Dependencias primero (mejor caché de capas)
COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
# Código y build → genera /web/dist
COPY frontend/ ./
RUN pnpm build

# ── Etapa 2: backend (FastAPI) ─────────────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

COPY requirements.prod.txt .
RUN pip install --no-cache-dir -r requirements.prod.txt

COPY app.py .
COPY service_account.json .
# Frontend ya compilado desde la etapa web (no se copia el código fuente)
COPY --from=web /web/dist ./frontend/dist
COPY data/procesado/predicciones_zonas.csv data/procesado/
COPY data/procesado/cruce_completo.csv data/procesado/
COPY data/procesado/colonias_merida.geojson data/procesado/
COPY data/procesado/municipio_merida.geojson data/procesado/
COPY data/inegi/ data/inegi/

ENV PORT=8080
ENV PYTHONUNBUFFERED=1
EXPOSE 8080

CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port $PORT"]
