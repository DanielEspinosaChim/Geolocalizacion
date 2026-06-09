FROM python:3.11-slim

WORKDIR /app

COPY requirements.prod.txt .
RUN pip install --no-cache-dir -r requirements.prod.txt

COPY app.py .
COPY service_account.json .
COPY frontend/ frontend/
COPY data/procesado/predicciones_zonas.csv data/procesado/
COPY data/procesado/cruce_completo.csv data/procesado/
COPY data/procesado/colonias_merida.geojson data/procesado/
COPY data/procesado/municipio_merida.geojson data/procesado/
COPY data/inegi/ data/inegi/

ENV PORT=8080
ENV PYTHONUNBUFFERED=1
EXPOSE 8080

CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port $PORT"]
