#!/usr/bin/env bash
set -e

echo "==> Starting PostgreSQL via Docker Compose..."
docker compose up -d db

echo "==> Waiting for Postgres to be ready..."
until docker compose exec db pg_isready -U postgres &>/dev/null; do
  sleep 1
done

echo "==> Running Alembic migrations..."
cd backend
uv run alembic upgrade head

echo "==> Seeding database..."
uv run python seed.py

echo "==> Starting FastAPI backend (port 8000)..."
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

echo "==> Starting Vite frontend (port 5173)..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "  Backend:  http://localhost:8000"
echo "  Frontend: http://localhost:5173"
echo "  API docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl-C to stop."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; docker compose stop db" INT TERM
wait
