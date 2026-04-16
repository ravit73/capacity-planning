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
  month: string;
  employee_id: number;
  project_id: number;
  hours: number;
}

export interface CapacityEntryIn {
  month: string;
  employee_id: number;
  project_id: number;
  hours: number;
}

export interface MonthlyPayload {
  entries: CapacityEntryIn[];
}

export const MONTHLY_CAPACITY = 168;
export const FULLY_PLANNED = 160;
