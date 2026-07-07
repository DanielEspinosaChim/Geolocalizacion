# deploy.ps1 — Despliega GeoFormal en Cloud Run (videoimet)
# Uso: .\deploy.ps1

$PROJECT = "videoimet"
$SERVICE = "geolocalizacion-merida"
$REGION  = "us-central1"
$IMAGE   = "us-central1-docker.pkg.dev/$PROJECT/cloud-run-source-deploy/$SERVICE"

# Cargar GOOGLE_MAPS_API_KEY desde .env
$MAPS_KEY = ""
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match "^GOOGLE_MAPS_API_KEY=(.+)$") {
            $MAPS_KEY = $Matches[1].Trim()
        }
    }
}
if (-not $MAPS_KEY) {
    Write-Host "ERROR: GOOGLE_MAPS_API_KEY no encontrada en .env" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Build ===" -ForegroundColor Cyan
gcloud builds submit --tag="$IMAGE" --project="$PROJECT" --region="$REGION" .
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR en build" -ForegroundColor Red; exit 1 }

Write-Host "`n=== Obteniendo digest ===" -ForegroundColor Cyan
$DIGEST = gcloud artifacts docker images describe $IMAGE --project="$PROJECT" --format="value(image_summary.digest)" 2>$null
Write-Host "Digest: $DIGEST"

Write-Host "`n=== Deploy ===" -ForegroundColor Cyan
gcloud run deploy $SERVICE `
  --image="${IMAGE}@${DIGEST}" `
  --region=$REGION `
  --project=$PROJECT `
  --service-account="589026168608-compute@developer.gserviceaccount.com" `
  --allow-unauthenticated `
  --max-instances=100 `
  --min-instances=1 `
  --cpu=2 `
  --memory=2Gi `
  --concurrency=160 `
  --timeout=300 `
  --no-cpu-throttling `
  --set-env-vars="GOOGLE_MAPS_API_KEY=$MAPS_KEY"
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR en deploy" -ForegroundColor Red; exit 1 }

Write-Host "`n=== LISTO ===" -ForegroundColor Green
gcloud run services describe $SERVICE --region=$REGION --project=$PROJECT --format="value(status.url)"
