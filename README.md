# Capacity Planning

A full-stack web application for collecting and visualising monthly employee capacity data across projects.

## Features

- **Monthly Entry** — spreadsheet-style matrix (employees × projects) with hours inputs, row/column totals, colour-coded utilisation, and one-click save
- **Utilisation Charts** — horizontal bar charts showing employee utilisation vs. 168 h capacity and hours per project
- **Manage** — add and soft-delete employees and projects in real time
- Department filter and month selector shared across tabs

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11, FastAPI, Pydantic v2, SQLAlchemy 2 (async), Alembic |
| Database | PostgreSQL 16 |
| Package manager | [uv](https://docs.astral.sh/uv/) |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |

## Project Structure

```
capacity-planning/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app + CORS
│   │   ├── config.py        # Settings (reads .env)
│   │   ├── database.py      # Async engine & session
│   │   ├── models.py        # SQLAlchemy ORM models
│   │   ├── schemas.py       # Pydantic v2 request/response schemas
│   │   └── api/
│   │       ├── capacity.py  # POST /bulk, GET /?month=
│   │       ├── employees.py # CRUD + /departments
│   │       └── projects.py  # CRUD
│   ├── alembic/             # Migrations
│   ├── seed.py              # Seed script (employees, projects)
│   └── pyproject.toml
├── frontend/
│   └── src/
│       ├── App.tsx
│       ├── components/
│       │   ├── MonthlyEntry.tsx      # Tab 1
│       │   ├── UtilisationChart.tsx  # Tab 2
│       │   └── ManageTab.tsx         # Tab 3
│       ├── hooks/useApi.ts
│       └── types/index.ts
├── docker-compose.yml       # PostgreSQL service (local dev)
├── start.sh                 # One-shot dev startup script
├── infra/
│   └── provision.sh         # Azure CLI provisioning script
└── .github/
    └── workflows/
        └── deploy.yml       # GitHub Actions CI/CD pipeline
```

## Data Model

```
Department  ──<  Employee  ──<  CapacityEntry  >──  Project
                                 (month, hours)
```

- **CapacityEntry** has a unique constraint on `(month, employee_id, project_id)` — bulk upsert is idempotent.
- All deletes are **soft** (`is_active = False`); records are never hard-deleted.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/capacity/bulk` | Upsert a list of capacity entries for a month |
| `GET` | `/api/capacity?month=YYYY-MM` | Fetch all entries for a month |
| `GET` | `/api/employees` | List active employees (with department) |
| `POST` | `/api/employees` | Create employee |
| `DELETE` | `/api/employees/{id}` | Soft-delete employee |
| `GET` | `/api/employees/departments` | List departments |
| `GET` | `/api/projects` | List active projects |
| `POST` | `/api/projects` | Create project |
| `DELETE` | `/api/projects/{id}` | Soft-delete project |

Interactive docs available at **http://localhost:8000/docs** when the server is running.

## Capacity Thresholds

| Condition | Hours | Colour |
|-----------|-------|--------|
| Over capacity | > 168 h | Red |
| Fully planned | 160 – 168 h | Green |
| Under-planned | < 160 h | Amber |

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (for PostgreSQL)
- [uv](https://docs.astral.sh/uv/getting-started/installation/) — Python package manager
- [Node.js](https://nodejs.org/) 18+

### Quick start (all-in-one)

```bash
./start.sh
```

This script will:
1. Start PostgreSQL via Docker Compose
2. Run Alembic migrations
3. Seed the database (10 employees, 7 projects)
4. Start the FastAPI backend on **http://localhost:8000**
5. Start the Vite dev server on **http://localhost:5173**

### Manual setup

**Database**
```bash
docker compose up -d db
```

**Backend**
```bash
cd backend
cp .env.example .env          # edit DATABASE_URL if needed
uv sync                       # install dependencies
uv run alembic upgrade head   # run migrations
uv run python seed.py         # seed initial data
uv run uvicorn app.main:app --reload --port 8000
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

### Environment variables

Create `backend/.env`:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/capacity_planning
```

## Seed Data

The seed script (`backend/seed.py`) populates:

**Employees**

| Name | Department |
|------|-----------|
| Anna Fischer | Engineering |
| Ben Koch | Engineering |
| Clara Maier | Design |
| David Wolf | Engineering |
| Eva Braun | Product |
| Felix Huber | Data |
| Gabi Schmid | Design |
| Hans Bauer | Engineering |
| Iris Müller | Product |
| Jan Richter | Data |

**Projects**: Phoenix CRM, DataVault, MobileFirst, InfraScale, Analytics Hub, Internal, Leave

The seed script is idempotent — safe to run multiple times.

---

## Deploying to Azure Container Apps

### Architecture

```
Internet
   │
   ▼
┌─────────────────────────────────┐
│  Azure Container Apps (ACA)     │
│                                 │
│  ┌──────────────────────────┐   │
│  │  capacity-frontend       │   │   nginx serves React SPA
│  │  (nginx, port 80)        │   │   proxies /api → backend
│  └──────────┬───────────────┘   │
│             │ internal HTTP     │
│  ┌──────────▼───────────────┐   │
│  │  capacity-backend        │   │   FastAPI, port 8000
│  │  (uvicorn, port 8000)    │   │   runs Alembic on startup
│  └──────────┬───────────────┘   │
└─────────────┼───────────────────┘
              │ SSL (require)
┌─────────────▼───────────────────┐
│  Azure Database for PostgreSQL  │
│  Flexible Server (Standard_B1ms)│
└─────────────────────────────────┘
```

Azure resources created:

| Resource | Purpose |
|----------|---------|
| Azure Container Registry (ACR) | Stores Docker images |
| Container Apps Environment | Shared networking & observability |
| Container App — backend | FastAPI API server |
| Container App — frontend | nginx serving React + API proxy |
| PostgreSQL Flexible Server | Managed database |
| Log Analytics Workspace | Container logs & metrics |

### Option A — One-shot provisioning script (quickest)

> Requires: [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) ≥ 2.57 and the `containerapp` extension.

```bash
# Install the Container Apps extension (once)
az extension add --name containerapp --upgrade

# Log in
az login

# Run the provisioning script from the repo root
./infra/provision.sh
```

The script will:
1. Create a resource group
2. Create an Azure Container Registry
3. Create a PostgreSQL Flexible Server
4. Create a Container Apps Environment (+ Log Analytics)
5. Build and push both Docker images to ACR via `az acr build`
6. Deploy the backend Container App (with `DATABASE_URL` as a secret)
7. Deploy the frontend Container App (with `BACKEND_URL` env var pointing to the backend)
8. Run a one-shot Container Apps Job to seed the database

#### Customise before running

Edit the variables at the top of `infra/provision.sh`:

```bash
LOCATION="westeurope"        # Azure region
RG="rg-capacity-planning"    # Resource group name
ACR_NAME="capacityplanningacr"  # Must be globally unique, lowercase
PG_SERVER="psql-capacity-planning"  # Must be globally unique
```

Set a strong PostgreSQL password (or let the script auto-generate one):

```bash
export PG_PASSWORD="my-strong-password"
./infra/provision.sh
```

### Option B — CI/CD with GitHub Actions

The workflow in `.github/workflows/deploy.yml` runs on every push to `main` and:
1. Builds and pushes both Docker images to ACR (tagged with the commit SHA)
2. Deploys the backend Container App
3. Fetches the backend FQDN and injects it into the frontend deployment
4. Deploys the frontend Container App

#### Setup steps

**1. Create a service principal with Federated Identity Credentials** (no stored secrets):

```bash
APP_ID=$(az ad app create --display-name "capacity-planning-gh-actions" --query appId -o tsv)
az ad sp create --id "$APP_ID"
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)

az role assignment create \
  --assignee "$APP_ID" \
  --role Contributor \
  --scope "/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/rg-capacity-planning"

# Allow GitHub Actions to federate
az ad app federated-credential create --id "$APP_ID" --parameters '{
  "name": "gh-actions",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:YOUR_GITHUB_ORG/capacity-planning:ref:refs/heads/main",
  "audiences": ["api://AzureADTokenExchange"]
}'
```

**2. Add GitHub Actions secrets** (Settings → Secrets and variables → Actions):

| Secret | Value |
|--------|-------|
| `AZURE_CLIENT_ID` | App registration client ID (`$APP_ID`) |
| `AZURE_TENANT_ID` | `$TENANT_ID` |
| `AZURE_SUBSCRIPTION_ID` | `$SUBSCRIPTION_ID` |

**3. Add GitHub Actions variables**:

| Variable | Value |
|----------|-------|
| `ACR_NAME` | e.g. `capacityplanningacr` |
| `ACR_LOGIN_SERVER` | e.g. `capacityplanningacr.azurecr.io` |
| `AZURE_RESOURCE_GROUP` | e.g. `rg-capacity-planning` |
| `ACA_ENVIRONMENT` | e.g. `cae-capacity-planning` |

**4. Set the `DATABASE_URL` secret on the backend Container App** (run once after provisioning):

```bash
az containerapp secret set \
  --name capacity-backend \
  --resource-group rg-capacity-planning \
  --secrets "database-url=postgresql+asyncpg://USER:PASS@HOST/DB?ssl=require"
```

Push to `main` to trigger the first deployment.

### Option C — Azure DevOps Pipeline

The pipeline in `azure-pipelines.yml` mirrors the GitHub Actions workflow but uses native Azure DevOps constructs: **service connections**, a **variable group**, and **deployment jobs** with an approval environment.

#### Pipeline overview

```
┌─────────────────────────────────────────────────────┐
│  Stage: Build (parallel jobs)                       │
│   ├── BuildBackend  → Docker@2 → ACR               │
│   └── BuildFrontend → Docker@2 → ACR               │
└──────────────────────┬──────────────────────────────┘
                       │ dependsOn: Build
┌──────────────────────▼──────────────────────────────┐
│  Stage: Deploy (deployment job)                     │
│   1. az containerapp update  (backend)              │
│   2. Get backend FQDN → pipeline variable           │
│   3. az containerapp update  (frontend + BACKEND_URL)│
│   4. Print final URLs                               │
└─────────────────────────────────────────────────────┘
```

#### One-time setup in Azure DevOps

**1. Create a Docker Registry service connection**

Pipelines → Project Settings → Service connections → New → **Docker Registry**:

| Field | Value |
|-------|-------|
| Registry type | Azure Container Registry |
| Connection name | `acr-connection` |
| Subscription | your subscription |
| ACR | select your registry |

**2. Create an Azure Resource Manager service connection**

Service connections → New → **Azure Resource Manager** → Service principal (automatic):

| Field | Value |
|-------|-------|
| Scope | Subscription |
| Resource group | `rg-capacity-planning` |
| Connection name | `azure-connection` |

**3. Create a variable group**

Pipelines → Library → Variable groups → **+ Variable group**:

| Group name | `capacity-planning-vars` |
|------------|--------------------------|

Add these variables:

| Variable | Example value |
|----------|--------------|
| `ACR_LOGIN_SERVER` | `capacityplanningacr.azurecr.io` |
| `RESOURCE_GROUP` | `rg-capacity-planning` |
| `ACA_ENVIRONMENT` | `cae-capacity-planning` |

**4. Create the pipeline**

Pipelines → New pipeline → Azure Repos Git (or GitHub) → select repo → **Existing Azure Pipelines YAML file** → path: `/azure-pipelines.yml`.

**5. (Optional) Add an approval gate**

Pipelines → Environments → **production** → Approvals and checks → **+ Approvals** → add approvers.
This pauses the Deploy stage until a team member approves.

**6. Run**

Push to `main` or click **Run pipeline** manually. The pipeline tags both images with the full commit SHA, deploys the backend first, reads its FQDN, then deploys the frontend with `BACKEND_URL` injected.

---

### Useful post-deployment commands

```bash
# Tail live logs from the backend
az containerapp logs show \
  --name capacity-backend \
  --resource-group rg-capacity-planning \
  --follow

# Scale backend to 0 replicas (cost saving when idle)
az containerapp update \
  --name capacity-backend \
  --resource-group rg-capacity-planning \
  --min-replicas 0

# Re-run database seed job
az containerapp job start \
  --name capacity-seed-job \
  --resource-group rg-capacity-planning

# Tear everything down
az group delete --name rg-capacity-planning --yes
```

### Cost estimate (West Europe, monthly)

| Resource | SKU | Est. cost |
|----------|-----|-----------|
| Container Apps — backend | 0.5 vCPU / 1 GiB, 1 replica | ~$15 |
| Container Apps — frontend | 0.25 vCPU / 0.5 GiB, 1 replica | ~$8 |
| PostgreSQL Flexible Server | Standard_B1ms, 32 GiB | ~$15 |
| Container Registry | Basic | ~$5 |
| Log Analytics | Pay-per-GB | ~$2 |
| **Total** | | **~$45 / month** |

> Scale backend `min-replicas` to `0` to pay only for actual usage (billed per request at ~$0.000016 per vCPU-second).
