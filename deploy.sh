#!/usr/bin/env bash
# deploy.sh — Despliega la app en Cloud Run (proyecto videoimet)
# Uso: bash deploy.sh
set -euo pipefail

PROJECT="videoimet"
SERVICE="geolocalizacion-merida"
REGION="us-central1"
IMAGE="gcr.io/${PROJECT}/${SERVICE}"

echo "=== Activando service account ==="
gcloud auth activate-service-account \
  --key-file=service_account.json \
  --project="${PROJECT}"

echo "=== Habilitando APIs necesarias ==="
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  --project="${PROJECT}"

echo "=== Creando secretos en Secret Manager ==="

# Secret: service_account.json completo
if gcloud secrets describe geolocalizacion-sa --project="${PROJECT}" &>/dev/null; then
  echo "  [skip] secreto geolocalizacion-sa ya existe"
else
  gcloud secrets create geolocalizacion-sa \
    --replication-policy="automatic" \
    --project="${PROJECT}"
fi
gcloud secrets versions add geolocalizacion-sa \
  --data-file=service_account.json \
  --project="${PROJECT}"

# Secret: Google Maps API Key
MAPS_KEY="${GOOGLE_MAPS_API_KEY:-$(grep GOOGLE_MAPS_API_KEY .env | cut -d= -f2)}"
if gcloud secrets describe geolocalizacion-maps-key --project="${PROJECT}" &>/dev/null; then
  echo "  [skip] secreto geolocalizacion-maps-key ya existe"
else
  gcloud secrets create geolocalizacion-maps-key \
    --replication-policy="automatic" \
    --project="${PROJECT}"
fi
echo -n "${MAPS_KEY}" | gcloud secrets versions add geolocalizacion-maps-key \
  --data-file=- \
  --project="${PROJECT}"

echo "=== Construyendo imagen con Cloud Build ==="
gcloud builds submit \
  --tag="${IMAGE}" \
  --project="${PROJECT}" \
  .

echo "=== Desplegando en Cloud Run ==="
gcloud run deploy "${SERVICE}" \
  --image="${IMAGE}" \
  --platform=managed \
  --region="${REGION}" \
  --project="${PROJECT}" \
  --allow-unauthenticated \
  --memory=2Gi \
  --cpu=2 \
  --timeout=300 \
  --set-env-vars="GOOGLE_APPLICATION_CREDENTIALS=/secrets/sa/service_account.json" \
  --set-secrets="/secrets/sa/service_account.json=geolocalizacion-sa:latest,GOOGLE_MAPS_API_KEY=geolocalizacion-maps-key:latest"

echo ""
echo "=== DEPLOY EXITOSO ==="
gcloud run services describe "${SERVICE}" \
  --region="${REGION}" \
  --project="${PROJECT}" \
  --format="value(status.url)"
