from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import date, timedelta

from ..database import get_db
from ..models import PublicHoliday
from ..schemas import PublicHolidayCreate, PublicHolidayOut

router = APIRouter(prefix="/api/holidays", tags=["holidays"])


@router.get("", response_model=list[PublicHolidayOut])
async def list_holidays(week: str | None = None, db: AsyncSession = Depends(get_db)):
    """Return all active public holidays.
    If ?week=YYYY-MM-DD is provided, return only holidays within that Mon–Fri range."""
    stmt = select(PublicHoliday).where(PublicHoliday.is_active == True)

    if week:
        try:
            monday = date.fromisoformat(week)
            monday = monday - timedelta(days=monday.weekday())
            friday = monday + timedelta(days=4)
            stmt = stmt.where(PublicHoliday.date >= monday).where(PublicHoliday.date <= friday)
        except ValueError:
            raise HTTPException(status_code=422, detail="week must be YYYY-MM-DD")

    result = await db.execute(stmt.order_by(PublicHoliday.date))
    return result.scalars().all()


@router.post("", response_model=PublicHolidayOut, status_code=201)
async def create_holiday(data: PublicHolidayCreate, db: AsyncSession = Depends(get_db)):
    holiday = PublicHoliday(date=data.date, name=data.name)
    db.add(holiday)
    await db.commit()
    await db.refresh(holiday)
    return holiday


@router.delete("/{holiday_id}", status_code=204)
async def delete_holiday(holiday_id: int, db: AsyncSession = Depends(get_db)):
    holiday = await db.get(PublicHoliday, holiday_id)
    if not holiday:
        raise HTTPException(status_code=404, detail="Holiday not found")
    holiday.is_active = False
    await db.commit()
