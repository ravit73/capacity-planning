import { useState, useEffect, useMemo } from "react";
import { Employee, Project, CapacityEntryIn, MONTHLY_CAPACITY, FULLY_PLANNED } from "../types";
import { useCapacity } from "../hooks/useApi";

interface Props {
  employees: Employee[];
  projects: Project[];
  departmentFilter: number | "all";
  month: string;
}

type HoursMap = Record<string, number>; // key: `${empId}_${projId}`

function cellKey(empId: number, projId: number) {
  return `${empId}_${projId}`;
}

function getRowColor(total: number): string {
  if (total > MONTHLY_CAPACITY) return "text-red-600 font-bold";
  if (total >= FULLY_PLANNED) return "text-green-600 font-bold";
  return "text-amber-500 font-semibold";
}

function getRowBg(total: number): string {
  if (total > MONTHLY_CAPACITY) return "bg-red-50";
  if (total >= FULLY_PLANNED) return "bg-green-50";
  return "";
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const colors = [
    "bg-blue-500","bg-indigo-500","bg-purple-500","bg-pink-500",
    "bg-red-500","bg-orange-500","bg-amber-500","bg-teal-500",
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-semibold shrink-0 ${colors[idx]}`}>
      {initials}
    </span>
  );
}

export default function MonthlyEntry({ employees, projects, departmentFilter, month }: Props) {
  const { entries, loading, saving, error, saveMonth } = useCapacity(month);
  const [hours, setHours] = useState<HoursMap>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync loaded entries into local state
  useEffect(() => {
    const map: HoursMap = {};
    for (const e of entries) {
      map[cellKey(e.employee_id, e.project_id)] = e.hours;
    }
    setHours(map);
  }, [entries]);

  const filteredEmployees = useMemo(() =>
    departmentFilter === "all"
      ? employees
      : employees.filter((e) => e.department_id === departmentFilter),
    [employees, departmentFilter]
  );

  const getValue = (empId: number, projId: number): string => {
    const v = hours[cellKey(empId, projId)];
    return v !== undefined && v > 0 ? String(v) : "";
  };

  const handleChange = (empId: number, projId: number, val: string) => {
    const key = cellKey(empId, projId);
    const num = parseFloat(val);
    setHours((prev) => {
      if (val === "" || isNaN(num)) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: num };
    });
  };

  const rowTotal = (empId: number): number =>
    projects.reduce((s, p) => s + (hours[cellKey(empId, p.id)] ?? 0), 0);

  const colTotal = (projId: number): number =>
    filteredEmployees.reduce((s, e) => s + (hours[cellKey(e.id, projId)] ?? 0), 0);

  const grandTotal = filteredEmployees.reduce((s, e) => s + rowTotal(e.id), 0);

  // Stats
  const overCapacity = filteredEmployees.filter((e) => rowTotal(e.id) > MONTHLY_CAPACITY).length;
  const avgUtil = filteredEmployees.length
    ? (filteredEmployees.reduce((s, e) => s + rowTotal(e.id), 0) /
        (filteredEmployees.length * MONTHLY_CAPACITY)) *
      100
    : 0;

  const fillSample = () => {
    const samples: HoursMap = {};
    for (const emp of filteredEmployees) {
      let remaining = 160;
      const shuffled = [...projects].sort(() => Math.random() - 0.5);
      for (const proj of shuffled) {
        if (remaining <= 0) break;
        const h = Math.min(remaining, Math.round(Math.random() * 60 + 10));
        samples[cellKey(emp.id, proj.id)] = h;
        remaining -= h;
      }
    }
    setHours((prev) => ({ ...prev, ...samples }));
  };

  const clearAll = () => setHours({});

  const handleSave = async () => {
    const entriesToSave: CapacityEntryIn[] = [];
    for (const emp of employees) {
      for (const proj of projects) {
        const h = hours[cellKey(emp.id, proj.id)];
        if (h !== undefined && h > 0) {
          entriesToSave.push({
            month: `${month}-01`,
            employee_id: emp.id,
            project_id: proj.id,
            hours: h,
          });
        }
      }
    }
    try {
      await saveMonth({ entries: entriesToSave });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      // error shown below
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Employees" value={filteredEmployees.length} />
        <StatCard label="Total Hours" value={grandTotal.toFixed(0)} />
        <StatCard label="Avg Utilisation" value={`${avgUtil.toFixed(1)}%`} />
        <StatCard
          label="Over Capacity"
          value={overCapacity}
          highlight={overCapacity > 0 ? "red" : "green"}
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={fillSample}
          className="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md hover:bg-indigo-100 transition-colors"
        >
          Fill sample data
        </button>
        <button
          onClick={clearAll}
          className="px-3 py-1.5 text-sm bg-gray-50 text-gray-700 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
        >
          Clear
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors ml-auto"
        >
          {saving ? "Saving…" : "Save month"}
        </button>
      </div>

      {saveSuccess && (
        <div className="p-2 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
          Saved successfully!
        </div>
      )}
      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Matrix table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200">
              <th className="sticky left-0 z-10 bg-gray-100 text-left px-3 py-2 font-semibold text-gray-700 min-w-[180px]">
                Employee
              </th>
              {projects.map((p) => (
                <th key={p.id} className="px-2 py-2 text-center font-medium text-gray-600 min-w-[90px] whitespace-nowrap">
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-1 align-middle"
                    style={{ backgroundColor: p.color_hex }}
                  />
                  {p.name}
                </th>
              ))}
              <th className="px-3 py-2 text-center font-semibold text-gray-700 min-w-[70px] whitespace-nowrap">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((emp, idx) => {
              const total = rowTotal(emp.id);
              return (
                <tr
                  key={emp.id}
                  className={`border-b border-gray-100 ${getRowBg(total)} ${idx % 2 === 0 ? "" : "bg-gray-50/50"}`}
                >
                  <td className="sticky left-0 z-10 bg-inherit px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <Avatar name={emp.name} />
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">{emp.name}</div>
                        <div className="text-xs text-gray-400">{emp.department.name}</div>
                      </div>
                    </div>
                  </td>
                  {projects.map((proj) => (
                    <td key={proj.id} className="px-1 py-1 text-center">
                      <input
                        type="number"
                        min="0"
                        max="744"
                        step="0.5"
                        value={getValue(emp.id, proj.id)}
                        onChange={(e) => handleChange(emp.id, proj.id, e.target.value)}
                        className="w-16 text-center border border-gray-200 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 bg-white"
                        placeholder="0"
                      />
                    </td>
                  ))}
                  <td className={`px-3 py-1.5 text-center text-sm font-semibold ${getRowColor(total)}`}>
                    {total > 0 ? total.toFixed(total % 1 === 0 ? 0 : 1) : "–"}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 border-t-2 border-gray-300 font-semibold">
              <td className="sticky left-0 bg-gray-100 px-3 py-2 text-gray-700">
                Total
              </td>
              {projects.map((p) => {
                const ct = colTotal(p.id);
                return (
                  <td key={p.id} className="px-2 py-2 text-center text-gray-700">
                    {ct > 0 ? ct.toFixed(ct % 1 === 0 ? 0 : 1) : "–"}
                  </td>
                );
              })}
              <td className="px-3 py-2 text-center text-gray-900">
                {grandTotal > 0 ? grandTotal.toFixed(grandTotal % 1 === 0 ? 0 : 1) : "–"}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {filteredEmployees.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          No employees found for the selected department.
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: "red" | "green";
}) {
  const textColor =
    highlight === "red"
      ? "text-red-600"
      : highlight === "green"
      ? "text-green-600"
      : "text-indigo-700";
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
      <div className={`text-2xl font-bold ${textColor}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}
