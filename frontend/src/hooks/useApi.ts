import { useState, useEffect, useCallback } from "react";
import {
  Employee,
  Project,
  CapacityEntry,
  MonthlyPayload,
  Department,
} from "../types";

const BASE = "/api";

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
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

  useEffect(() => {
    refresh();
  }, [refresh]);

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

  useEffect(() => {
    refresh();
  }, [refresh]);

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

export function useCapacity(month: string) {
  const [entries, setEntries] = useState<CapacityEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch<CapacityEntry[]>(`/capacity?month=${month}`);
      setEntries(data);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveMonth = async (payload: MonthlyPayload) => {
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

  return { entries, loading, saving, error, refresh, saveMonth };
}
