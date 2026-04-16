from pydantic import BaseModel, field_validator
from datetime import date


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
    month: date
    employee_id: int
    project_id: int
    hours: float

    @field_validator("month")
    @classmethod
    def normalize_to_first_of_month(cls, v: date) -> date:
        return v.replace(day=1)


class MonthlyPayload(BaseModel):
    entries: list[CapacityEntryIn]


class CapacityEntryOut(BaseModel):
    id: int
    month: date
    employee_id: int
    project_id: int
    hours: float

    model_config = {"from_attributes": True}
