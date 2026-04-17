from pydantic import BaseModel, field_validator
from datetime import date, datetime, timedelta


def to_monday(d: date) -> date:
    """Return the Monday of the ISO week containing d."""
    return d - timedelta(days=d.weekday())


# Department
class DepartmentOut(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


# Employee
class EmployeeCreate(BaseModel):
    name: str
    department_id: int


class EmployeeOut(BaseModel):
    id: int
    name: str
    department_id: int
    is_active: bool
    department: DepartmentOut

    model_config = {"from_attributes": True}


# Project
class ProjectCreate(BaseModel):
    name: str
    color_hex: str = "#6366f1"


class ProjectOut(BaseModel):
    id: int
    name: str
    color_hex: str
    is_active: bool

    model_config = {"from_attributes": True}


# Capacity
class CapacityEntryIn(BaseModel):
    week: date
    employee_id: int
    project_id: int
    hours: float

    @field_validator("week")
    @classmethod
    def normalize_to_monday(cls, v: date) -> date:
        return to_monday(v)


class WeeklyPayload(BaseModel):
    entries: list[CapacityEntryIn]


class CapacityEntryOut(BaseModel):
    id: int
    week: date
    employee_id: int
    project_id: int
    hours: float

    model_config = {"from_attributes": True}


# Public Holiday
class PublicHolidayCreate(BaseModel):
    date: date
    name: str


class PublicHolidayOut(BaseModel):
    id: int
    date: date
    name: str
    is_active: bool

    model_config = {"from_attributes": True}


# User
class UserOut(BaseModel):
    id: int
    azure_oid: str | None
    email: str
    display_name: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


def _validate_role_value(v: str) -> str:
    if v not in ("admin", "editor", "reader"):
        raise ValueError("role must be admin, editor, or reader")
    return v


class UserCreate(BaseModel):
    email: str
    display_name: str = ""
    role: str = "reader"

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        return _validate_role_value(v)


class UserRoleUpdate(BaseModel):
    role: str

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        return _validate_role_value(v)
