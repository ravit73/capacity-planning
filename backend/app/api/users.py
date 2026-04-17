from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..models import User
from ..schemas import UserOut, UserRoleUpdate
from ..auth import get_current_user, require_roles

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=UserOut)
async def get_me(user: User = Depends(get_current_user)):
    return user


@router.get("", response_model=list[UserOut])
async def list_users(
    user: User = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).order_by(User.display_name))
    return result.scalars().all()


@router.put("/{user_id}/role", response_model=UserOut)
async def update_role(
    user_id: int,
    data: UserRoleUpdate,
    _: User = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    target = await db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    target.role = data.role
    await db.commit()
    await db.refresh(target)
    return target


@router.patch("/{user_id}/active", response_model=UserOut)
async def toggle_active(
    user_id: int,
    is_active: bool,
    _: User = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    target = await db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    target.is_active = is_active
    await db.commit()
    await db.refresh(target)
    return target
