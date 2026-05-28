FROM python:3.11-slim

# Dependencias del sistema para geopandas/osmnx/pyproj
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgdal-dev \
    libgeos-dev \
    libproj-dev \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instalar dependencias Python primero (mejor caché)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código y datos procesados
COPY app.py .
COPY data/procesado/ data/procesado/

# Puerto por defecto (Cloud Run lo sobreescribe con $PORT)
ENV PORT=8080

EXPOSE 8080

CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port $PORT"]
