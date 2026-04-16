# Capacity Planning

A full-stack web application for collecting and visualising monthly employee capacity data across projects.

## Features

- **Monthly Entry** — spreadsheet-style matrix (employees × projects) with hours inputs, row/column totals, colour-coded utilisation, and one-click save
- **Utilisation Charts** — horizontal bar charts showing employee utilisation vs. 168 h capacity and hours per project
- **Manage** — add and soft-delete employees and projects in real time
- Department filter and month selector shared across all tabs

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python 3.11, FastAPI, Pydantic v2, SQLAlchemy 2 (async), Alembic |
| Database | PostgreSQL 16 |
| Package manager | [uv](https://docs.astral.sh/uv/) |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Container runtime | Docker / nginx |

## Project Structure

```
capacity-planning/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app + CORS
│   │   ├── config.py          # Settings (reads .env)
│   │   ├── database.py        # Async engine & session factory
│   │   ├── models.py          # SQLAlchemy ORM models
│   │   ├── schemas.py         # Pydantic v2 request/response schemas
│   │   └── api/
│   │       ├── capacity.py    # POST /bulk, GET /?month=
│   │       ├── employees.py   # CRUD + /departments
│   │       └── projects.py    # CRUD
│   ├── alembic/               # Database migrations
│   │   └── versions/
│   │       └── 0001_initial_schema.py
│   ├── Dockerfile             # Production image (uv + uvicorn)
│   ├── seed.py                # Seed script — employees & projects
│   └── pyproject.toml         # uv dependencies
├── frontend/
│   ├── src/
│   │   ├── App.tsx            # Root: tabs, month selector, dept filter
│   │   ├── components/
│   │   │   ├── MonthlyEntry.tsx       # Tab 1: matrix form
│   │   │   ├── UtilisationChart.tsx   # Tab 2: bar charts
│   │   │   └── ManageTab.tsx          # Tab 3: add/remove
│   │   ├── hooks/useApi.ts    # API fetch hooks
│   │   └── types/index.ts     # TypeScript types + capacity constants
│   ├── Dockerfile             # Multi-stage: Node build → nginx runtime
│   ├── nginx.conf             # SPA serving + /api proxy template
│   └── vite.config.ts         # Dev proxy: /api → localhost:8000
├── infra/
│   └── provision.sh           # One-shot Azure CLI provisioning script
├── .github/
│   └── workflows/
│       └── deploy.yml         # GitHub Actions CI/CD pipeline
├── azure-pipelines.yml        # Azure DevOps CI/CD pipeline
├── docker-compose.yml         # Local PostgreSQL service
└── start.sh                   # One-shot local dev startup script
```

## Data Model

```
Department  ──<  Employee  ──<  CapacityEntry  >──  Project
                                 (month, hours)
```

- **CapacityEntry** has a unique constraint on `(month, employee_id, project_id)` — bulk upsert is fully idempotent.
- All deletes are **soft** (`is_active = False`); records are never hard-deleted.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/capacity/bulk` | Upsert a list of capacity entries for a month |
| `GET` | `/api/capacity?month=YYYY-MM` | Fetch all entries for a month |
| `GET` | `/api/employees` | List active employees (with department) |
| `POST` | `/api/employees` | Create employee |
| `DELETE` | `/api/employees/{id}` | Soft-delete employee |
| `GET` | `/api/employees/departments` | List all departments |
| `GET` | `/api/projects` | List active projects |
| `POST` | `/api/projects` | Create project |
| `DELETE` | `/api/projects/{id}` | Soft-delete project |

Interactive docs: **http://localhost:8000/docs**

## Capacity Thresholds

| Condition | Hours | UI colour |
|-----------|-------|-----------|
| Over capacity | > 168 h | Red |
| Fully planned | 160 – 168 h | Green |
| Under-planned | < 160 h | Amber |

---

## Local Development

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) — for local PostgreSQL
- [uv](https://docs.astral.sh/uv/getting-started/installation/) — Python package manager
- [Node.js](https://nodejs.org/) 18+

### Quick start (all-in-one)

```bash
./start.sh
```

This script:
1. Starts PostgreSQL via Docker Compose
2. Runs Alembic migrations
3. Seeds the database (10 employees, 7 projects)
4. Starts the FastAPI backend on **http://localhost:8000**
5. Starts the Vite dev server on **http://localhost:5173**

### Manual setup

**1. Database**
```bash
docker compose up -d db
```

**2. Backend**
```bash
cd backend
echo "DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/capacity_planning" > .env
uv sync                        # install dependencies
uv run alembic upgrade head    # run migrations
uv run python seed.py          # seed initial data
uv run uvicorn app.main:app --reload --port 8000
```

**3. Frontend**
```bash
cd frontend
npm install
npm run dev   # http://localhost:5173
```

The Vite dev server proxies `/api/*` requests to `http://localhost:8000`.

---

## Seed Data

`backend/seed.py` is idempotent — safe to run multiple times.

**Employees**

| Name | Department |
|------|------------|
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

**Projects**: Phoenix CRM · DataVault · MobileFirst · InfraScale · Analytics Hub · Internal · Leave

---

## Deploying to Azure Container Apps

### Architecture

```
Internet
   │
   ▼
┌───────────────────────────────────────┐
│  Azure Container Apps Environment     │
│                                       │
│  ┌─────────────────────────────────┐  │
│  │  capacity-frontend (nginx :80)  │  │  Serves React SPA
│  │                                 │  │  Proxies /api → backend
│  └────────────────┬────────────────┘  │
│                   │ internal HTTPS    │
│  ┌────────────────▼────────────────┐  │
│  │  capacity-backend (uvicorn :8000)│  │  FastAPI + Alembic migrations
│  └────────────────┬────────────────┘  │
└───────────────────┼───────────────────┘
                    │ SSL (required)
┌───────────────────▼───────────────────┐
│  Azure Database for PostgreSQL        │
│  Flexible Server (Standard_B1ms)      │
└───────────────────────────────────────┘
```

**Azure resources provisioned:**

| Resource | Purpose |
|----------|---------|
| Resource Group | Logical container for all resources |
| Azure Container Registry (ACR) | Stores Docker images |
| Container Apps Environment | Shared networking & observability layer |
| Container App — `capacity-backend` | FastAPI server, port 8000 |
| Container App — `capacity-frontend` | nginx, port 80; proxies `/api` to backend |
| PostgreSQL Flexible Server | Managed relational database |
| Log Analytics Workspace | Container logs & metrics |
| Container Apps Job — `capacity-seed-job` | One-shot database seeder |

---

### Option A — One-shot provisioning script

> Requires: [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) ≥ 2.57

```bash
# Install the Container Apps CLI extension (once)
az extension add --name containerapp --upgrade

az login

# Optional: set a strong Postgres password (auto-generated if omitted)
export PG_PASSWORD="my-strong-password"

./infra/provision.sh
```

**What the script does:**
1. Creates the resource group
2. Creates Azure Container Registry
3. Creates PostgreSQL Flexible Server (~3 min)
4. Creates the Container Apps Environment + Log Analytics workspace
5. Builds and pushes both images via `az acr build` (no local Docker needed)
6. Deploys the backend Container App (`DATABASE_URL` stored as a secret)
7. Deploys the frontend Container App (`BACKEND_URL` injected from the backend FQDN)
8. Runs the seed job as a Container Apps Job

**Customise** the variables at the top of `infra/provision.sh` before running:

```bash
LOCATION="westeurope"               # Azure region
RG="rg-capacity-planning"           # Resource group name
ACR_NAME="capacityplanningacr"      # Globally unique, lowercase, no hyphens
PG_SERVER="psql-capacity-planning"  # Globally unique
```

---

### Option B — GitHub Actions CI/CD

File: `.github/workflows/deploy.yml`

**Pipeline flow:**

```
push to main
     │
     ▼
┌─────────────────────────────────────────┐
│  Job: build (parallel)                  │
│   ├── Build + push capacity-backend     │
│   └── Build + push capacity-frontend    │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────┐
│  Job: deploy                             │
│   1. Deploy backend container app        │
│   2. Read backend FQDN                   │
│   3. Deploy frontend (BACKEND_URL set)   │
│   4. Print live URLs                     │
└──────────────────────────────────────────┘
```

Images are tagged with the full Git commit SHA for traceability.

#### Setup steps

**1. Create a service principal (Workload Identity Federation — no stored secrets)**

```bash
APP_ID=$(az ad app create --display-name "capacity-planning-gh-actions" --query appId -o tsv)
az ad sp create --id "$APP_ID"

SUBSCRIPTION_ID=$(az account show --query id -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)

az role assignment create \
  --assignee "$APP_ID" \
  --role Contributor \
  --scope "/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/rg-capacity-planning"

az ad app federated-credential create --id "$APP_ID" --parameters '{
  "name": "gh-actions",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:YOUR_ORG/capacity-planning:ref:refs/heads/main",
  "audiences": ["api://AzureADTokenExchange"]
}'
```

**2. Add GitHub Actions secrets** (Settings → Secrets and variables → Actions → Secrets):

| Secret | Value |
|--------|-------|
| `AZURE_CLIENT_ID` | `$APP_ID` |
| `AZURE_TENANT_ID` | `$TENANT_ID` |
| `AZURE_SUBSCRIPTION_ID` | `$SUBSCRIPTION_ID` |

**3. Add GitHub Actions variables** (Settings → Secrets and variables → Actions → Variables):

| Variable | Example value |
|----------|---------------|
| `ACR_NAME` | `capacityplanningacr` |
| `ACR_LOGIN_SERVER` | `capacityplanningacr.azurecr.io` |
| `AZURE_RESOURCE_GROUP` | `rg-capacity-planning` |
| `ACA_ENVIRONMENT` | `cae-capacity-planning` |

**4. Set the database secret on the backend Container App** (once, after provisioning):

```bash
az containerapp secret set \
  --name capacity-backend \
  --resource-group rg-capacity-planning \
  --secrets "database-url=postgresql+asyncpg://USER:PASS@HOST/DB?ssl=require"
```

Push to `main` to trigger the first deployment.

---

### Option C — Azure DevOps Pipeline

File: `azure-pipelines.yml`

**Pipeline flow:**

```
push to main
     │
     ▼
┌──────────────────────────────────────────┐
│  Stage: Build (parallel jobs)            │
│   ├── BuildBackend  → Docker@2 → ACR    │
│   └── BuildFrontend → Docker@2 → ACR    │
└──────────────────┬───────────────────────┘
                   │ dependsOn: Build
                   ▼
┌──────────────────────────────────────────┐
│  Stage: Deploy (deployment job)          │
│   1. az containerapp update — backend    │
│   2. Read backend FQDN (output variable) │
│   3. az containerapp update — frontend   │
│   4. Print live URLs                     │
└──────────────────────────────────────────┘
```

Images are tagged with `$(Build.SourceVersion)` (full commit SHA).

#### One-time setup in Azure DevOps

**1. Docker Registry service connection**

Project Settings → Service connections → New → **Docker Registry (Azure Container Registry)**:

| Field | Value |
|-------|-------|
| Connection name | `acr-connection` |
| Subscription | your Azure subscription |
| Azure container registry | select your ACR |

**2. Azure Resource Manager service connection**

Service connections → New → **Azure Resource Manager** → Service principal (automatic):

| Field | Value |
|-------|-------|
| Scope | Subscription |
| Resource group | `rg-capacity-planning` |
| Connection name | `azure-connection` |

**3. Variable group**

Pipelines → Library → **+ Variable group** → name: `capacity-planning-vars`

| Variable | Example value |
|----------|---------------|
| `ACR_LOGIN_SERVER` | `capacityplanningacr.azurecr.io` |
| `RESOURCE_GROUP` | `rg-capacity-planning` |
| `ACA_ENVIRONMENT` | `cae-capacity-planning` |

**4. Create the pipeline**

Pipelines → New pipeline → select repo → **Existing Azure Pipelines YAML file** → `/azure-pipelines.yml`

**5. (Optional) Approval gate**

Pipelines → Environments → **production** → Approvals and checks → **+ Approvals**.
The Deploy stage pauses until an approver confirms before touching production.

**6. Trigger**

Push to `main` or click **Run pipeline** manually.

---

### Deployment option comparison

| | Option A (script) | Option B (GitHub Actions) | Option C (Azure DevOps) |
|---|---|---|---|
| Best for | First-time provisioning | GitHub-hosted repos | Azure DevOps projects |
| Trigger | Manual | Push to `main` | Push to `main` |
| Auth | `az login` | Workload Identity Federation | Service connections |
| Approval gates | — | Environments (optional) | Environments + checks |
| Image tagging | `latest` | Commit SHA + `latest` | Commit SHA + `latest` |

---

### Post-deployment commands

```bash
# Stream live backend logs
az containerapp logs show \
  --name capacity-backend \
  --resource-group rg-capacity-planning \
  --follow

# Scale to zero when idle (pay only for requests)
az containerapp update \
  --name capacity-backend \
  --resource-group rg-capacity-planning \
  --min-replicas 0

# Re-run the database seed job
az containerapp job start \
  --name capacity-seed-job \
  --resource-group rg-capacity-planning

# Tear down all resources
az group delete --name rg-capacity-planning --yes
```

### Cost estimate (West Europe, monthly)

| Resource | SKU | Est. cost |
|----------|-----|-----------|
| Container App — backend | 0.5 vCPU / 1 GiB, 1 replica | ~$15 |
| Container App — frontend | 0.25 vCPU / 0.5 GiB, 1 replica | ~$8 |
| PostgreSQL Flexible Server | Standard_B1ms, 32 GiB | ~$15 |
| Container Registry | Basic | ~$5 |
| Log Analytics | Pay-per-GB | ~$2 |
| **Total** | | **~$45 / month** |

> Set `--min-replicas 0` on both Container Apps to scale to zero when idle and pay only for active requests (~$0.000016 per vCPU-second).
