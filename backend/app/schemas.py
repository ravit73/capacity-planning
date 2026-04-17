from pydantic import BaseModel, field_validator
from datetime import date, timedelta


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
