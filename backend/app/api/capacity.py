from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from datetime import date

from ..database import get_db
from ..models import CapacityEntry
from ..schemas import MonthlyPayload, CapacityEntryOut

router = APIRouter(prefix="/api/capacity", tags=["capacity"])


@router.post("/bulk", response_model=list[CapacityEntryOut])
async def bulk_upsert(payload: MonthlyPayload, db: AsyncSession = Depends(get_db)):
    if not payload.entries:
        return []

    # Build upsert using raw SQL for ON CONFLICT DO UPDATE
    values = [
        {
            "month": entry.month,
            "employee_id": entry.employee_id,
            "project_id": entry.project_id,
            "hours": entry.hours,
        }
        for entry in payload.entries
    ]

    stmt = text(
        """
        INSERT INTO capacity_entries (month, employee_id, project_id, hours)
        VALUES (:month, :employee_id, :project_id, :hours)
        ON CONFLICT (month, employee_id, project_id)
        DO UPDATE SET hours = EXCLUDED.hours
        RETURNING id, month, employee_id, project_id, hours
        """
    )

    results = []
    for v in values:
        result = await db.execute(stmt, v)
        row = result.fetchone()
        if row:
            results.append(
                CapacityEntryOut(
                    id=row.id,
                    month=row.month,
                    employee_id=row.employee_id,
                    project_id=row.project_id,
                    hours=row.hours,
                )
            )

    await db.commit()
    return results


@router.get("", response_model=list[CapacityEntryOut])
async def get_capacity(month: str, db: AsyncSession = Depends(get_db)):
    try:
        # Accept YYYY-MM format
        if len(month) == 7:
            month_date = date.fromisoformat(f"{month}-01")
        else:
            month_date = date.fromisoformat(month)
            month_date = month_date.replace(day=1)
    except ValueError:
        raise HTTPException(status_code=422, detail="month must be YYYY-MM or YYYY-MM-DD")

    result = await db.execute(
        select(CapacityEntry).where(CapacityEntry.month == month_date)
    )
    return result.scalars().all()
