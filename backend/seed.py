"""
Seed script — run with: uv run python seed.py
"""
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import select
from app.models import Department, Employee, Project
from app.config import get_settings

DEPARTMENTS = ["Engineering", "Design", "Product", "Data"]

EMPLOYEES = [
    ("Anna Fischer", "Engineering"),
    ("Ben Koch", "Engineering"),
    ("Clara Maier", "Design"),
    ("David Wolf", "Engineering"),
    ("Eva Braun", "Product"),
    ("Felix Huber", "Data"),
    ("Gabi Schmid", "Design"),
    ("Hans Bauer", "Engineering"),
    ("Iris Müller", "Product"),
    ("Jan Richter", "Data"),
]

PROJECTS = [
    ("Phoenix CRM", "#ef4444"),
    ("DataVault", "#3b82f6"),
    ("MobileFirst", "#10b981"),
    ("InfraScale", "#f59e0b"),
    ("Analytics Hub", "#8b5cf6"),
    ("Internal", "#6b7280"),
    ("Leave", "#ec4899"),
]


async def seed():
    settings = get_settings()
    engine = create_async_engine(settings.database_url)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with factory() as session:
        # Departments
        dept_map: dict[str, Department] = {}
        for dept_name in DEPARTMENTS:
            result = await session.execute(
                select(Department).where(Department.name == dept_name)
            )
            dept = result.scalar_one_or_none()
            if not dept:
                dept = Department(name=dept_name)
                session.add(dept)
                await session.flush()
            dept_map[dept_name] = dept

        # Employees
        for emp_name, dept_name in EMPLOYEES:
            result = await session.execute(
                select(Employee).where(Employee.name == emp_name)
            )
            emp = result.scalar_one_or_none()
            if not emp:
                emp = Employee(name=emp_name, department_id=dept_map[dept_name].id)
                session.add(emp)

        # Projects
        for proj_name, color in PROJECTS:
            result = await session.execute(
                select(Project).where(Project.name == proj_name)
            )
            proj = result.scalar_one_or_none()
            if not proj:
                proj = Project(name=proj_name, color_hex=color)
                session.add(proj)

        await session.commit()
        print("Seed complete.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
