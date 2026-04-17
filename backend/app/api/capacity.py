from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from datetime import date, timedelta

from ..database import get_db
from ..models import CapacityEntry
from ..schemas import WeeklyPayload, CapacityEntryOut

router = APIRouter(prefix="/api/capacity", tags=["capacity"])


def to_monday(d: date) -> date:
    return d - timedelta(days=d.weekday())


@router.post("/bulk", response_model=list[CapacityEntryOut])
async def bulk_upsert(payload: WeeklyPayload, db: AsyncSession = Depends(get_db)):
    if not payload.entries:
        return []

    stmt = text(
        """
        INSERT INTO capacity_entries (week, employee_id, project_id, hours)
        VALUES (:week, :employee_id, :project_id, :hours)
        ON CONFLICT (week, employee_id, project_id)
        DO UPDATE SET hours = EXCLUDED.hours
        RETURNING id, week, employee_id, project_id, hours
        """
    )

    results = []
    for entry in payload.entries:
        result = await db.execute(
            stmt,
            {
                "week": entry.week,
                "employee_id": entry.employee_id,
                "project_id": entry.project_id,
                "hours": entry.hours,
            },
        )
        row = result.fetchone()
        if row:
            results.append(
                CapacityEntryOut(
                    id=row.id,
                    week=row.week,
                    employee_id=row.employee_id,
                    project_id=row.project_id,
                    hours=row.hours,
                )
            )

    await db.commit()
    return results


@router.get("", response_model=list[CapacityEntryOut])
async def get_capacity(week: str, db: AsyncSession = Depends(get_db)):
    """Accept week as YYYY-MM-DD; normalises to Monday of that week."""
    try:
        week_date = to_monday(date.fromisoformat(week))
    except ValueError:
        raise HTTPException(status_code=422, detail="week must be YYYY-MM-DD")

    result = await db.execute(
        select(CapacityEntry).where(CapacityEntry.week == week_date)
    )
    return result.scalars().all()
