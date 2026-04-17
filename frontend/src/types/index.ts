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

export interface PublicHoliday {
  id: number;
  date: string; // ISO date string YYYY-MM-DD
  name: string;
  is_active: boolean;
}

export type UserRole = "admin" | "editor" | "reader";

export interface AppUser {
  id: number;
  azure_oid: string;
  email: string;
  display_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export const WEEKLY_CAPACITY = 40;
export const HOURS_PER_DAY = 8;
export const FULLY_PLANNED = 38;    // 95 % of weekly capacity
