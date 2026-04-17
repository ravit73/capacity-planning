# Capacity Planning

A full-stack web application for collecting and visualising weekly employee capacity data across projects, with public holiday support and Microsoft Entra ID (Azure AD) authentication.

## Features

- **Microsoft Login** — sign in with your organisation's Microsoft account; no separate user registration
- **Role-based access control** — three roles: `admin` (full access), `editor` (capacity entry), `reader` (view only)
- **Weekly Entry** — spreadsheet-style matrix (employees × projects) with hours inputs, row/column totals, colour-coded utilisation, and one-click save
- **Public Holidays** — holiday days shown as read-only red columns in the matrix; available capacity automatically reduced (8 h per holiday day)
- **Utilisation Charts** — horizontal bar charts showing employee utilisation vs. available weekly capacity and hours per project
- **Manage** — add/remove employees, projects, public holidays, and users in real time (admin only)
- Working week defined as **Monday – Friday (40 h)**; week selector displays e.g. "21 Apr – 25 Apr 2026"
- Department filter and week selector shared across all tabs

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python 3.11, FastAPI, Pydantic v2, SQLAlchemy 2 (async), Alembic |
| Auth (backend) | PyJWT, Microsoft Entra ID JWKS validation |
| Database | PostgreSQL 16 |
| Package manager | [uv](https://docs.astral.sh/uv/) |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Auth (frontend) | MSAL React (`@azure/msal-browser`, `@azure/msal-react`) |
| Container runtime | Docker / nginx |

## Project Structure

```
capacity-planning/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app + CORS (configurable origins)
│   │   ├── config.py          # Settings (reads .env): DB, Azure AD, auth flag
│   │   ├── database.py        # Async engine & session factory
│   │   ├── models.py          # SQLAlchemy ORM models (incl. User)
│   │   ├── schemas.py         # Pydantic v2 request/response schemas
│   │   ├── auth.py            # JWT validation, get_current_user, require_roles
│   │   └── api/
│   │       ├── capacity.py    # POST /bulk, GET /?week=
│   │       ├── employees.py   # CRUD + /departments
│   │       ├── projects.py    # CRUD
│   │       ├── holidays.py    # CRUD public holidays
│   │       └── users.py       # GET /me, list users, update role
│   ├── alembic/               # Database migrations
│   │   └── versions/
│   │       ├── 0001_initial_schema.py
│   │       ├── 0002_rename_month_to_week.py
│   │       ├── 0003_add_public_holidays.py
│   │       ├── 0004_add_users.py
│   │       └── 0005_users_azure_oid_nullable.py
│   ├── Dockerfile             # Production image (uv + uvicorn)
│   ├── seed.py                # Seed script — employees & projects
│   ├── .env.example           # Required environment variables
│   └── pyproject.toml         # uv dependencies
├── frontend/
│   ├── src/
│   │   ├── main.tsx           # Entry point — wraps app in AuthProvider
│   │   ├── App.tsx            # Root: tabs, week selector, dept filter, auth state
│   │   ├── auth/
│   │   │   ├── authConfig.ts  # MSAL configuration (clientId, tenantId, scopes)
│   │   │   ├── AuthContext.ts # React context + useAuth hook
│   │   │   └── AuthProvider.tsx # MsalProvider wrapper (or dev mock)
│   │   ├── components/
│   │   │   ├── WeeklyEntry.tsx        # Tab 1: matrix + role-based controls
│   │   │   ├── UtilisationChart.tsx   # Tab 2: bar charts
│   │   │   ├── ManageTab.tsx          # Tab 3: employees, projects, holidays, users
│   │   │   └── LoginPage.tsx          # Microsoft sign-in screen
│   │   ├── hooks/useApi.ts    # API fetch hooks with Bearer token injection
│   │   └── types/index.ts     # TypeScript types + capacity constants + AppUser
│   ├── Dockerfile             # Multi-stage: Node build → nginx runtime
│   ├── nginx.conf             # SPA serving + /api proxy template
│   ├── .env.example           # Required Vite environment variables
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

PublicHoliday  (date, name)

User  (azure_oid, email, display_name, role)
```

- **CapacityEntry.week** is always stored as the **Monday** of the ISO week (normalised server-side).
- **PublicHoliday** stores a specific calendar date and name. When one or more holidays fall within the selected Mon–Fri week, each deducts 8 h from the available capacity and appears as a read-only column in the matrix.
- **User** stores pre-provisioned accounts. `azure_oid` is nullable — it is bound permanently on the user's first login. The first login ever (empty `users` table) **bootstraps one admin** automatically. All subsequent logins are rejected unless the email is already in the table.
- Unique constraint on `(week, employee_id, project_id)` — bulk upsert is fully idempotent.
- All deletes are **soft** (`is_active = False`); records are never hard-deleted.

## Authentication & Roles

Authentication uses **Microsoft Entra ID** (formerly Azure AD). The backend validates Bearer tokens against the tenant's JWKS endpoint; the frontend uses MSAL to acquire tokens silently.

### Roles

| Role | Weekly Entry | Utilisation | Manage tab | User management |
|------|-------------|-------------|------------|-----------------|
| `reader` | View only (disabled inputs) | ✓ | Hidden | — |
| `editor` | Full edit + save | ✓ | Hidden | — |
| `admin` | Full edit + save | ✓ | Full access | Change roles |

### How user access works

Access is **allowlist-based**:

1. An admin pre-provisions a user by adding their email address and role to the `users` table.
2. When that person signs in with Microsoft, the app matches their email, binds their Microsoft identity (`azure_oid`), and grants access.
3. Any Microsoft account whose email is **not** in the `users` table is denied with a 403 error.

The **first person to ever log in** (empty `users` table) is automatically made `admin` — this bootstraps the system.

### Adding users (UI)

1. Log in as an `admin`.
2. Go to the **Manage** tab.
3. Scroll to the **Users** section.
4. Enter the user's **email address** (must match their Microsoft account), an optional **display name**, and select a **role**.
5. Click **Add User**.

The user can now sign in with their Microsoft account. Their display name is updated from their Microsoft profile on first login.

### Changing a user's role

In the **Manage → Users** section, use the role dropdown next to any user to change their role immediately.

### Removing a user

Click **Remove** next to the user in **Manage → Users**. This deactivates the account (soft delete); the user will receive a 403 on their next request.

### Managing users via API

```bash
# List all users
curl -H "Authorization: Bearer <token>" https://your-app/api/users

# Pre-provision a new user
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "display_name": "Alice", "role": "editor"}' \
  https://your-app/api/users

# Change a user's role
curl -X PUT \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"role": "editor"}' \
  https://your-app/api/users/2/role

# Deactivate a user
curl -X DELETE \
  -H "Authorization: Bearer <token>" \
  https://your-app/api/users/2
```

## API Endpoints

All endpoints require a valid `Authorization: Bearer <token>` header. Write operations additionally require the minimum role shown.

| Method | Path | Min. role | Description |
|--------|------|-----------|-------------|
| `GET` | `/api/users/me` | any | Current user info and role |
| `GET` | `/api/users` | admin | List all users |
| `POST` | `/api/users` | admin | Pre-provision a user by email |
| `PUT` | `/api/users/{id}/role` | admin | Update a user's role |
| `DELETE` | `/api/users/{id}` | admin | Deactivate a user (soft delete) |
| `POST` | `/api/capacity/bulk` | editor | Upsert capacity entries for a week |
| `GET` | `/api/capacity?week=YYYY-MM-DD` | any | Fetch all entries for the week |
| `GET` | `/api/employees` | any | List active employees (with department) |
| `POST` | `/api/employees` | admin | Create employee |
| `DELETE` | `/api/employees/{id}` | admin | Soft-delete employee |
| `GET` | `/api/employees/departments` | any | List all departments |
| `GET` | `/api/projects` | any | List active projects |
| `POST` | `/api/projects` | admin | Create project |
| `DELETE` | `/api/projects/{id}` | admin | Soft-delete project |
| `GET` | `/api/holidays` | any | List all active public holidays |
| `GET` | `/api/holidays?week=YYYY-MM-DD` | any | List holidays within that Mon–Fri week |
| `POST` | `/api/holidays` | admin | Create public holiday |
| `DELETE` | `/api/holidays/{id}` | admin | Soft-delete public holiday |

Interactive docs: **http://localhost:8000/docs**

## Capacity Thresholds

Working week = **Monday – Friday (40 h)**. When public holidays fall in the week, the available capacity is reduced by **8 h per holiday day**.

| Condition | Project hours | UI colour |
|-----------|--------------|-----------|
| Over capacity | > available hours | Red |
| Fully planned | ≥ available − 2 h | Green |
| Under-planned | < available − 2 h | Amber |

Examples:

| Holidays in week | Available | Fully planned at |
|-----------------|-----------|-----------------|
| 0 | 40 h | ≥ 38 h |
| 1 | 32 h | ≥ 30 h |
| 2 | 24 h | ≥ 22 h |

---

## Public Holidays

Public holidays are managed in **Manage tab → Public Holidays** section (admin only).

### Adding a holiday
1. Go to **Manage** tab
2. In the **Public Holidays** section, pick a date and enter a name (e.g. "Christmas Day")
3. Click **Add Holiday**

### Effect on the planner
When a public holiday falls within the selected Mon–Fri week:
- A **red notice banner** appears above the matrix listing the holiday names and dates
- A **red read-only column** (8 h, cannot be edited) is added to the matrix for each holiday
- The **"Available / week"** stat card shows the reduced capacity
- Row colour-coding compares **project hours only** against the reduced capacity
- The **Weekly Entry tab** shows a red badge with the holiday count
- The **Utilisation Chart** adjusts the capacity bar and label accordingly

---

## Local Development

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) — for local PostgreSQL
- [uv](https://docs.astral.sh/uv/getting-started/installation/) — Python package manager
- [Node.js](https://nodejs.org/) 18+

### Quick start (auth disabled — no Azure AD needed)

```bash
./start.sh
```

This script:
1. Starts PostgreSQL via Docker Compose
2. Runs Alembic migrations
3. Seeds the database (10 employees, 7 projects)
4. Starts the FastAPI backend on **http://localhost:8000**
5. Starts the Vite dev server on **http://localhost:5173**

When `AUTH_ENABLED=false` (backend) and `VITE_AUTH_ENABLED=false` (frontend), all requests are treated as a dev admin — no Microsoft login required.

### Manual setup

**1. Database**
```bash
docker compose up -d db
```

**2. Backend**
```bash
cd backend
cp .env.example .env
# Edit .env — at minimum set DATABASE_URL
# For local dev without Azure AD: AUTH_ENABLED=false
uv sync                        # install dependencies
uv run alembic upgrade head    # run migrations
uv run python seed.py          # seed initial data
uv run uvicorn app.main:app --reload --port 8000
```

**3. Frontend**
```bash
cd frontend
cp .env.example .env
# For local dev without Azure AD: VITE_AUTH_ENABLED=false
npm install
npm run dev   # http://localhost:5173
```

The Vite dev server proxies `/api/*` requests to `http://localhost:8000`.

### Enabling real Microsoft authentication locally

1. [Register an app in Azure AD](#azure-ad-app-registration)
2. Set in `backend/.env`:
   ```
   AUTH_ENABLED=true
   AZURE_TENANT_ID=<your-tenant-id>
   AZURE_CLIENT_ID=<your-client-id>
   ```
3. Set in `frontend/.env`:
   ```
   VITE_AUTH_ENABLED=true
   VITE_AZURE_TENANT_ID=<your-tenant-id>
   VITE_AZURE_CLIENT_ID=<your-client-id>
   ```

---

## Azure AD App Registration

One app registration covers both the frontend SPA and the backend API.

1. **Azure Portal → Azure Active Directory → App registrations → New registration**
   - Name: `capacity-planning`
   - Supported account types: *Accounts in this organisational directory only*
   - Redirect URI: `Single-page application (SPA)` → `http://localhost:5173`

2. **Expose an API** → Add a scope:
   - Scope name: `access_as_user`
   - Who can consent: Admins and users

3. **API permissions** → Add a permission → My APIs → select your app → `access_as_user`

4. Note the **Application (client) ID** and **Directory (tenant) ID** — use these in both `.env` files.

5. For production, add the deployed frontend URL as an additional Redirect URI.

---

## Seed Data

`backend/seed.py` is idempotent — safe to run multiple times. Public holidays are not seeded (they vary by country/region).

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

After provisioning, set the Azure AD environment variables on the backend Container App:

```bash
az containerapp secret set \
  --name capacity-backend \
  --resource-group rg-capacity-planning \
  --secrets \
    "database-url=postgresql+asyncpg://..." \
    "azure-tenant-id=<tenant-id>" \
    "azure-client-id=<client-id>"

az containerapp update \
  --name capacity-backend \
  --resource-group rg-capacity-planning \
  --set-env-vars \
    AZURE_TENANT_ID=secretref:azure-tenant-id \
    AZURE_CLIENT_ID=secretref:azure-client-id
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

**4. Set the database and Azure AD secrets on the backend Container App** (once, after provisioning):

```bash
az containerapp secret set \
  --name capacity-backend \
  --resource-group rg-capacity-planning \
  --secrets \
    "database-url=postgresql+asyncpg://USER:PASS@HOST/DB?ssl=require" \
    "azure-tenant-id=<your-tenant-id>" \
    "azure-client-id=<your-client-id>"
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
