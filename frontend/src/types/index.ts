export interface Department {
  id: number;
  name: string;
}

export interface Employee {
  id: number;
  name: string;
  department_id: number;
  is_active: boolean;
  department: Department;
}

export interface Project {
  id: number;
  name: string;
  color_hex: string;
  is_active: boolean;
}

export interface CapacityEntry {
  id: number;
  week: string;      // ISO date string — always the Monday of the week
  employee_id: number;
  project_id: number;
  hours: number;
}

export interface CapacityEntryIn {
  week: string;
  employee_id: number;
  project_id: number;
  hours: number;
}

export interface WeeklyPayload {
  entries: CapacityEntryIn[];
}

export const WEEKLY_CAPACITY = 40;
export const FULLY_PLANNED = 38;    // 95 % of weekly capacity
