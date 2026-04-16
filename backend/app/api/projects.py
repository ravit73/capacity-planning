from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..models import Project
from ..schemas import ProjectCreate, ProjectOut

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=list[ProjectOut])
async def list_projects(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Project).where(Project.is_active == True).order_by(Project.name)
    )
    return result.scalars().all()


@router.post("", response_model=ProjectOut, status_code=201)
async def create_project(data: ProjectCreate, db: AsyncSession = Depends(get_db)):
    project = Project(name=data.name, color_hex=data.color_hex)
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=204)
async def delete_project(project_id: int, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    project.is_active = False
    await db.commit()
