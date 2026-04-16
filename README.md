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
├── docker-compose.yml       # PostgreSQL service
└── start.sh                 # One-shot dev startup script
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
