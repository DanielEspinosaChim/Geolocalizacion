# deploy.ps1 — Despliega GeoFormal en Cloud Run (proyecto canaco-info)
# Requisitos: gcloud autenticado con cuenta Owner, Docker Desktop corriendo
# Uso: .\deploy.ps1

$PROJECT  = "canaco-info"
$REGION   = "us-central1"
$SERVICE  = "geoformal"
$IMAGE    = "gcr.io/$PROJECT/$SERVICE"
$RUN_SA   = "firebase-adminsdk-fbsvc@$PROJECT.iam.gserviceaccount.com"

Write-Host "`n[1/6] Configurando proyecto..." -ForegroundColor Cyan
gcloud config set project $PROJECT

Write-Host "`n[2/6] Habilitando APIs..." -ForegroundColor Cyan
gcloud services enable `
  run.googleapis.com `
  artifactregistry.googleapis.com `
  secretmanager.googleapis.com `
  --project $PROJECT

Write-Host "`n[3/6] Configurando Docker para GCR..." -ForegroundColor Cyan
gcloud auth configure-docker gcr.io --quiet

Write-Host "`n[4/6] Construyendo y subiendo imagen Docker..." -ForegroundColor Cyan
docker build -t "${IMAGE}:latest" .
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR en docker build" -ForegroundColor Red; exit 1 }
docker push "${IMAGE}:latest"
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR en docker push" -ForegroundColor Red; exit 1 }

Write-Host "`n[5/6] Desplegando en Cloud Run..." -ForegroundColor Cyan
gcloud run deploy $SERVICE `
  --image "${IMAGE}:latest" `
  --platform managed `
  --region $REGION `
  --project $PROJECT `
  --allow-unauthenticated `
  --port 8080 `
  --memory 1Gi `
  --cpu 1 `
  --min-instances 0 `
  --max-instances 3 `
  --service-account $RUN_SA `
  --timeout 60

Write-Host "`n[6/6] URL del servicio:" -ForegroundColor Green
gcloud run services describe $SERVICE `
  --region $REGION `
  --project $PROJECT `
  --format="value(status.url)"

Write-Host "`n✅ Deploy completo." -ForegroundColor Green
