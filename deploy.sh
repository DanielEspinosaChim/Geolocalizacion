#!/usr/bin/env bash
# deploy.sh — Despliega GeoFormal en Cloud Run (videoimet)
# Uso: bash deploy.sh

set -e

PROJECT="videoimet"
SERVICE="geolocalizacion-merida"
REGION="us-central1"
IMAGE="us-central1-docker.pkg.dev/${PROJECT}/cloud-run-source-deploy/${SERVICE}"

echo "=== Build ==="
gcloud builds submit \
  --tag="${IMAGE}" \
  --project="${PROJECT}" \
  --region="${REGION}" \
  .

# Obtener el digest exacto del :latest recién pusheado
DIGEST=$(gcloud artifacts docker images describe "${IMAGE}" \
  --project="${PROJECT}" \
  --format="value(image_summary.digest)" 2>/dev/null)
echo "Digest: ${DIGEST}"

echo "=== Deploy ==="
gcloud run deploy "${SERVICE}" \
  --image="${IMAGE}@${DIGEST}" \
  --region="${REGION}" \
  --project="${PROJECT}" \
  --service-account=589026168608-compute@developer.gserviceaccount.com \
  --allow-unauthenticated \
  --max-instances=100 \
  --min-instances=1 \
  --cpu=2 \
  --memory=2Gi \
  --concurrency=160 \
  --timeout=300 \
  --no-cpu-throttling \
  --set-env-vars="GOOGLE_MAPS_API_KEY=GOOGLE_MAPS_API_KEY_REMOVED"

echo ""
echo "=== LISTO ==="
gcloud run services describe "${SERVICE}" \
  --region="${REGION}" \
  --project="${PROJECT}" \
  --format="value(status.url)"
