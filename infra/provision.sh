#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Azure Container Apps — one-shot provisioning script
# Usage: ./infra/provision.sh
#
# Prerequisites:
#   az cli >= 2.57  (brew install azure-cli)
#   az extension add --name containerapp
#   az login
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Configuration — edit these ───────────────────────────────────────────────
LOCATION="westeurope"
RG="rg-capacity-planning"
ACR_NAME="capacityplanningacr"          # globally unique, lowercase, no dashes
ACA_ENV="cae-capacity-planning"
LOG_WORKSPACE="law-capacity-planning"
PG_SERVER="psql-capacity-planning"     # globally unique
PG_DB="capacity_planning"
PG_USER="pgadmin"
PG_PASSWORD="${PG_PASSWORD:-$(openssl rand -base64 20)}"  # set env var or auto-generate
BACKEND_APP="capacity-backend"
FRONTEND_APP="capacity-frontend"
# ─────────────────────────────────────────────────────────────────────────────

echo "==> Using resource group : $RG"
echo "==> Location             : $LOCATION"
echo "==> ACR                  : $ACR_NAME"
echo ""

# 1. Resource group
echo "[1/9] Creating resource group..."
az group create --name "$RG" --location "$LOCATION" --output none

# 2. Azure Container Registry
echo "[2/9] Creating Azure Container Registry..."
az acr create \
  --resource-group "$RG" \
  --name "$ACR_NAME" \
  --sku Basic \
  --admin-enabled true \
  --output none

ACR_SERVER=$(az acr show --name "$ACR_NAME" --query loginServer -o tsv)
ACR_PASSWORD=$(az acr credential show --name "$ACR_NAME" --query "passwords[0].value" -o tsv)

# 3. Log Analytics workspace (required by Container Apps environment)
echo "[3/9] Creating Log Analytics workspace..."
az monitor log-analytics workspace create \
  --resource-group "$RG" \
  --workspace-name "$LOG_WORKSPACE" \
  --output none

LOG_WS_ID=$(az monitor log-analytics workspace show \
  --resource-group "$RG" \
  --workspace-name "$LOG_WORKSPACE" \
  --query customerId -o tsv)

LOG_WS_KEY=$(az monitor log-analytics workspace get-shared-keys \
  --resource-group "$RG" \
  --workspace-name "$LOG_WORKSPACE" \
  --query primarySharedKey -o tsv)

# 4. Azure Database for PostgreSQL Flexible Server
echo "[4/9] Creating PostgreSQL Flexible Server (this takes ~3 min)..."
az postgres flexible-server create \
  --resource-group "$RG" \
  --name "$PG_SERVER" \
  --location "$LOCATION" \
  --admin-user "$PG_USER" \
  --admin-password "$PG_PASSWORD" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 16 \
  --database-name "$PG_DB" \
  --public-access 0.0.0.0 \
  --output none

PG_HOST=$(az postgres flexible-server show \
  --resource-group "$RG" \
  --name "$PG_SERVER" \
  --query fullyQualifiedDomainName -o tsv)

DATABASE_URL="postgresql+asyncpg://${PG_USER}:${PG_PASSWORD}@${PG_HOST}/${PG_DB}?ssl=require"

echo "    PostgreSQL host: $PG_HOST"

# 5. Container Apps environment
echo "[5/9] Creating Container Apps environment..."
az containerapp env create \
  --name "$ACA_ENV" \
  --resource-group "$RG" \
  --location "$LOCATION" \
  --logs-workspace-id "$LOG_WS_ID" \
  --logs-workspace-key "$LOG_WS_KEY" \
  --output none

# 6. Build & push images from local source
echo "[6/9] Building and pushing images to ACR..."
az acr build \
  --registry "$ACR_NAME" \
  --image "capacity-backend:latest" \
  ./backend

az acr build \
  --registry "$ACR_NAME" \
  --image "capacity-frontend:latest" \
  ./frontend

# 7. Deploy backend container app
echo "[7/9] Deploying backend container app..."
az containerapp create \
  --name "$BACKEND_APP" \
  --resource-group "$RG" \
  --environment "$ACA_ENV" \
  --image "${ACR_SERVER}/capacity-backend:latest" \
  --registry-server "$ACR_SERVER" \
  --registry-username "$ACR_NAME" \
  --registry-password "$ACR_PASSWORD" \
  --target-port 8000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 3 \
  --cpu 0.5 \
  --memory 1.0Gi \
  --secrets "database-url=${DATABASE_URL}" \
  --env-vars "DATABASE_URL=secretref:database-url" \
  --output none

BACKEND_FQDN=$(az containerapp show \
  --name "$BACKEND_APP" \
  --resource-group "$RG" \
  --query "properties.configuration.ingress.fqdn" -o tsv)

BACKEND_URL="https://${BACKEND_FQDN}"
echo "    Backend URL: $BACKEND_URL"

# 8. Deploy frontend container app
echo "[8/9] Deploying frontend container app..."
az containerapp create \
  --name "$FRONTEND_APP" \
  --resource-group "$RG" \
  --environment "$ACA_ENV" \
  --image "${ACR_SERVER}/capacity-frontend:latest" \
  --registry-server "$ACR_SERVER" \
  --registry-username "$ACR_NAME" \
  --registry-password "$ACR_PASSWORD" \
  --target-port 80 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 3 \
  --cpu 0.25 \
  --memory 0.5Gi \
  --env-vars "BACKEND_URL=${BACKEND_URL}" \
  --output none

FRONTEND_FQDN=$(az containerapp show \
  --name "$FRONTEND_APP" \
  --resource-group "$RG" \
  --query "properties.configuration.ingress.fqdn" -o tsv)

# 9. Seed the database (runs via the backend's /seed endpoint doesn't exist,
#    so we exec into a one-shot job instead)
echo "[9/9] Running database seed via Container Apps job..."
az containerapp job create \
  --name "capacity-seed-job" \
  --resource-group "$RG" \
  --environment "$ACA_ENV" \
  --trigger-type Manual \
  --replica-timeout 120 \
  --image "${ACR_SERVER}/capacity-backend:latest" \
  --registry-server "$ACR_SERVER" \
  --registry-username "$ACR_NAME" \
  --registry-password "$ACR_PASSWORD" \
  --cpu 0.25 \
  --memory 0.5Gi \
  --secrets "database-url=${DATABASE_URL}" \
  --env-vars "DATABASE_URL=secretref:database-url" \
  --command "uv" "run" "python" "seed.py" \
  --output none

az containerapp job start \
  --name "capacity-seed-job" \
  --resource-group "$RG" \
  --output none

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════"
echo "  Deployment complete!"
echo "════════════════════════════════════════════════════════"
echo "  Frontend :  https://${FRONTEND_FQDN}"
echo "  Backend  :  ${BACKEND_URL}"
echo "  API docs :  ${BACKEND_URL}/docs"
echo "  ACR      :  ${ACR_SERVER}"
echo "  PG host  :  ${PG_HOST}"
echo ""
echo "  PG password saved to env var PG_PASSWORD"
echo "  Store it safely — it won't be shown again."
echo "════════════════════════════════════════════════════════"

# Print GitHub Actions secrets/vars to configure
echo ""
echo "── GitHub Actions secrets to set ──────────────────────"
echo "  AZURE_CLIENT_ID       (from your service principal)"
echo "  AZURE_TENANT_ID       (from your service principal)"
echo "  AZURE_SUBSCRIPTION_ID (from az account show)"
echo ""
echo "── GitHub Actions variables to set ────────────────────"
echo "  ACR_NAME              = $ACR_NAME"
echo "  ACR_LOGIN_SERVER      = $ACR_SERVER"
echo "  AZURE_RESOURCE_GROUP  = $RG"
echo "  ACA_ENVIRONMENT       = $ACA_ENV"
echo "════════════════════════════════════════════════════════"
