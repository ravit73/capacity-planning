import { useState, useEffect, useCallback } from "react";
import {
  Employee,
  Project,
  CapacityEntry,
  WeeklyPayload,
  Department,
  PublicHoliday,
} from "../types";

const BASE = "/api";

// Token provider registered by AuthProvider so all API calls include Bearer token
type TokenProvider = () => Promise<string | null>;
let _tokenProvider: TokenProvider | null = null;

export function setTokenProvider(fn: TokenProvider): void {
  _tokenProvider = fn;
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (_tokenProvider) {
    const token = await _tokenProvider();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${url}`, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string> ?? {}) },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch<Employee[]>("/employees");
      setEmployees(data);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const createEmployee = async (name: string, department_id: number) => {
    await apiFetch("/employees", {
      method: "POST",
      body: JSON.stringify({ name, department_id }),
    });
    await refresh();
  };

  const deleteEmployee = async (id: number) => {
    await apiFetch(`/employees/${id}`, { method: "DELETE" });
    await refresh();
  };

  return { employees, loading, error, refresh, createEmployee, deleteEmployee };
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch<Project[]>("/projects");
      setProjects(data);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const createProject = async (name: string, color_hex: string) => {
    await apiFetch("/projects", {
      method: "POST",
      body: JSON.stringify({ name, color_hex }),
    });
    await refresh();
  };

  const deleteProject = async (id: number) => {
    await apiFetch(`/projects/${id}`, { method: "DELETE" });
    await refresh();
  };

  return { projects, loading, error, refresh, createProject, deleteProject };
}

export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    apiFetch<Department[]>("/employees/departments").then(setDepartments).catch(() => {});
  }, []);

  return { departments };
}

/** week — ISO date string of any day in the target week (normalised to Monday server-side) */
export function useCapacity(week: string) {
  const [entries, setEntries] = useState<CapacityEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch<CapacityEntry[]>(`/capacity?week=${week}`);
      setEntries(data);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [week]);

  useEffect(() => { refresh(); }, [refresh]);

  const saveWeek = async (payload: WeeklyPayload) => {
    setSaving(true);
    try {
      const saved = await apiFetch<CapacityEntry[]>("/capacity/bulk", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setEntries(saved);
      setError(null);
    } catch (e) {
      setError(String(e));
      throw e;
    } finally {
      setSaving(false);
    }
  };

  return { entries, loading, saving, error, refresh, saveWeek };
}

export function useHolidays() {
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch<PublicHoliday[]>("/holidays");
      setHolidays(data);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const createHoliday = async (date: string, name: string) => {
    await apiFetch("/holidays", {
      method: "POST",
      body: JSON.stringify({ date, name }),
    });
    await refresh();
  };

  const deleteHoliday = async (id: number) => {
    await apiFetch(`/holidays/${id}`, { method: "DELETE" });
    await refresh();
  };

  return { holidays, loading, createHoliday, deleteHoliday, refresh };
}
