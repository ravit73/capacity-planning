from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models import Employee, Department
from ..schemas import EmployeeCreate, EmployeeOut, DepartmentOut

router = APIRouter(prefix="/api/employees", tags=["employees"])


@router.get("", response_model=list[EmployeeOut])
async def list_employees(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Employee)
        .options(selectinload(Employee.department))
        .where(Employee.is_active == True)
        .order_by(Employee.name)
    )
    return result.scalars().all()


@router.post("", response_model=EmployeeOut, status_code=201)
async def create_employee(data: EmployeeCreate, db: AsyncSession = Depends(get_db)):
    dept = await db.get(Department, data.department_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    employee = Employee(name=data.name, department_id=data.department_id)
    db.add(employee)
    await db.commit()
    await db.refresh(employee)

    # reload with department
    result = await db.execute(
        select(Employee)
        .options(selectinload(Employee.department))
        .where(Employee.id == employee.id)
    )
    return result.scalar_one()


@router.delete("/{employee_id}", status_code=204)
async def delete_employee(employee_id: int, db: AsyncSession = Depends(get_db)):
    employee = await db.get(Employee, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    employee.is_active = False
    await db.commit()


@router.get("/departments", response_model=list[DepartmentOut])
async def list_departments(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Department).order_by(Department.name))
    return result.scalars().all()
