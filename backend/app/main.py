from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import capacity, employees, projects, holidays, users
from .config import get_settings

app = FastAPI(title="Capacity Planning API", version="0.1.0")

settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(capacity.router)
app.include_router(employees.router)
app.include_router(projects.router)
app.include_router(holidays.router)
app.include_router(users.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
