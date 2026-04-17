from sqlalchemy import Column, Integer, String, Boolean, Float, Date, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from .database import Base


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)

    employees = relationship("Employee", back_populates="department")


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    department = relationship("Department", back_populates="employees")
    capacity_entries = relationship("CapacityEntry", back_populates="employee")


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    color_hex = Column(String(7), nullable=False, default="#6366f1")
    is_active = Column(Boolean, default=True, nullable=False)

    capacity_entries = relationship("CapacityEntry", back_populates="project")


class CapacityEntry(Base):
    __tablename__ = "capacity_entries"

    id = Column(Integer, primary_key=True, index=True)
    week = Column(Date, nullable=False)  # always the Monday of the week
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    hours = Column(Float, nullable=False)

    employee = relationship("Employee", back_populates="capacity_entries")
    project = relationship("Project", back_populates="capacity_entries")

    __table_args__ = (
        UniqueConstraint("week", "employee_id", "project_id", name="uq_capacity_entry"),
    )
