from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import capacity, employees, projects

app = FastAPI(title="Capacity Planning API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(capacity.router)
app.include_router(employees.router)
app.include_router(projects.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
