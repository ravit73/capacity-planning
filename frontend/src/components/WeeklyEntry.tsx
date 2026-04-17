import { useState, useEffect, useMemo } from "react";
import {
  Employee,
  Project,
  PublicHoliday,
  CapacityEntryIn,
  WEEKLY_CAPACITY,
  HOURS_PER_DAY,
  UserRole,
} from "../types";
import { useCapacity } from "../hooks/useApi";

interface Props {
  employees: Employee[];
  projects: Project[];
  weekHolidays: PublicHoliday[];
  departmentFilter: number | "all";
  week: string; // Monday ISO date YYYY-MM-DD
  userRole: UserRole;
}

type HoursMap = Record<string, number>;

function cellKey(empId: number, projId: number) {
  return `${empId}_${projId}`;
}

function formatHolidayDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const colors = [
    "bg-blue-500","bg-indigo-500","bg-purple-500","bg-pink-500",
    "bg-red-500","bg-orange-500","bg-amber-500","bg-teal-500",
  ];
  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-semibold shrink-0 ${colors[name.charCodeAt(0) % colors.length]}`}>
      {initials}
    </span>
  );
}

export default function WeeklyEntry({ employees, projects, weekHolidays, departmentFilter, week, userRole }: Props) {
  const readonly = userRole === "reader";
  const { entries, loading, saving, error, saveWeek } = useCapacity(week);
  const [hours, setHours] = useState<HoursMap>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Adjusted capacity — each holiday deducts one working day
  const holidayHours = weekHolidays.length * HOURS_PER_DAY;
  const effectiveCapacity = WEEKLY_CAPACITY - holidayHours;
  const effectiveFullyPlanned = Math.max(0, effectiveCapacity - 2);

  useEffect(() => {
    const map: HoursMap = {};
    for (const e of entries) map[cellKey(e.employee_id, e.project_id)] = e.hours;
    setHours(map);
  }, [entries]);

  const filteredEmployees = useMemo(
    () => departmentFilter === "all"
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
      if (val === "" || isNaN(num)) { const next = { ...prev }; delete next[key]; return next; }
      return { ...prev, [key]: num };
    });
  };

  // Row total = project hours + fixed holiday hours
  const projectHours = (empId: number) =>
    projects.reduce((s, p) => s + (hours[cellKey(empId, p.id)] ?? 0), 0);
  const rowTotal = (empId: number) => projectHours(empId) + holidayHours;

  const colTotal = (projId: number) =>
    filteredEmployees.reduce((s, e) => s + (hours[cellKey(e.id, projId)] ?? 0), 0);

  const grandTotal = filteredEmployees.reduce((s, e) => s + rowTotal(e.id), 0);
  const overCapacity = filteredEmployees.filter((e) => projectHours(e.id) > effectiveCapacity).length;

  function getRowColorClass(total: number): string {
    const projectOnly = total - holidayHours;
    if (projectOnly > effectiveCapacity) return "text-red-600 font-bold";
    if (projectOnly >= effectiveFullyPlanned) return "text-green-600 font-bold";
    return "text-amber-500 font-semibold";
  }

  function getRowBgClass(total: number): string {
    const projectOnly = total - holidayHours;
    if (projectOnly > effectiveCapacity) return "bg-red-50";
    if (projectOnly >= effectiveFullyPlanned) return "bg-green-50";
    return "";
  }

  const fillSample = () => {
    const samples: HoursMap = {};
    for (const emp of filteredEmployees) {
      let remaining = effectiveFullyPlanned;
      for (const proj of [...projects].sort(() => Math.random() - 0.5)) {
        if (remaining <= 0) break;
        const h = Math.min(remaining, Math.round(Math.random() * 10 + 2));
        samples[cellKey(emp.id, proj.id)] = h;
        remaining -= h;
      }
    }
    setHours((prev) => ({ ...prev, ...samples }));
  };

  const handleSave = async () => {
    const entriesToSave: CapacityEntryIn[] = [];
    for (const emp of employees) {
      for (const proj of projects) {
        const h = hours[cellKey(emp.id, proj.id)];
        if (h !== undefined && h > 0)
          entriesToSave.push({ week, employee_id: emp.id, project_id: proj.id, hours: h });
      }
    }
    try {
      await saveWeek({ entries: entriesToSave });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch { /* error shown below */ }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">Loading…</div>;

  const fmt = (n: number) => n.toFixed(n % 1 === 0 ? 0 : 1);

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Employees" value={filteredEmployees.length} />
        <StatCard label="Total Hours" value={fmt(grandTotal)} />
        <StatCard
          label="Available / week"
          value={`${effectiveCapacity}h`}
          highlight={weekHolidays.length > 0 ? "amber" : undefined}
          note={weekHolidays.length > 0 ? `${weekHolidays.length} holiday${weekHolidays.length > 1 ? "s" : ""}` : undefined}
        />
        <StatCard
          label="Over Capacity"
          value={overCapacity}
          highlight={overCapacity > 0 ? "red" : "green"}
        />
      </div>

      {/* Holiday notice banner */}
      {weekHolidays.length > 0 && (
        <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <span className="text-base">🗓</span>
          <span className="font-medium">Public holiday{weekHolidays.length > 1 ? "s" : ""} this week:</span>
          {weekHolidays.map((h) => (
            <span key={h.id} className="bg-red-100 px-2 py-0.5 rounded font-medium">
              {h.name} ({formatHolidayDate(h.date)})
            </span>
          ))}
          <span className="ml-auto text-red-500">Available capacity reduced to {effectiveCapacity}h</span>
        </div>
      )}

      {/* Action buttons — hidden for readers */}
      {!readonly && (
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={fillSample} className="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md hover:bg-indigo-100 transition-colors">
            Fill sample data
          </button>
          <button onClick={() => setHours({})} className="px-3 py-1.5 text-sm bg-gray-50 text-gray-700 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors">
            Clear
          </button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors ml-auto">
            {saving ? "Saving…" : "Save week"}
          </button>
        </div>
      )}
      {readonly && (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-xs text-gray-500">
          View-only — you have the <span className="font-semibold text-gray-600 mx-1">reader</span> role
        </div>
      )}

      {saveSuccess && (
        <div className="p-2 bg-green-50 border border-green-200 rounded text-green-700 text-sm">Saved successfully!</div>
      )}
      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
      )}

      {/* Matrix */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200">
              <th className="sticky left-0 z-10 bg-gray-100 text-left px-3 py-2 font-semibold text-gray-700 min-w-[180px]">
                Employee
              </th>
              {/* Project columns */}
              {projects.map((p) => (
                <th key={p.id} className="px-2 py-2 text-center font-medium text-gray-600 min-w-[90px] whitespace-nowrap">
                  <span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{ backgroundColor: p.color_hex }} />
                  {p.name}
                </th>
              ))}
              {/* Public holiday columns */}
              {weekHolidays.map((h) => (
                <th key={h.id} className="px-2 py-2 text-center min-w-[100px] bg-red-50 border-l border-red-200">
                  <div className="text-red-700 font-medium text-xs leading-tight">
                    <div>🗓 {h.name}</div>
                    <div className="text-red-400 font-normal">{formatHolidayDate(h.date)}</div>
                  </div>
                </th>
              ))}
              <th className="px-3 py-2 text-center font-semibold text-gray-700 min-w-[70px]">Total</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((emp, idx) => {
              const total = rowTotal(emp.id);
              return (
                <tr key={emp.id} className={`border-b border-gray-100 ${getRowBgClass(total)} ${idx % 2 === 0 ? "" : "bg-gray-50/50"}`}>
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
                        max="80"
                        step="0.5"
                        value={getValue(emp.id, proj.id)}
                        onChange={(e) => !readonly && handleChange(emp.id, proj.id, e.target.value)}
                        readOnly={readonly}
                        className={`w-16 text-center border rounded px-1 py-0.5 text-sm focus:outline-none ${
                          readonly
                            ? "border-gray-100 bg-gray-50 text-gray-500 cursor-default"
                            : "border-gray-200 bg-white focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400"
                        }`}
                        placeholder="0"
                      />
                    </td>
                  ))}
                  {/* Holiday cells — read-only */}
                  {weekHolidays.map((h) => (
                    <td key={h.id} className="px-1 py-1 text-center bg-red-50 border-l border-red-100">
                      <div className="w-16 mx-auto text-center border border-red-200 rounded px-1 py-0.5 text-sm bg-red-100 text-red-600 font-medium select-none cursor-not-allowed">
                        {HOURS_PER_DAY}h
                      </div>
                    </td>
                  ))}
                  <td className={`px-3 py-1.5 text-center text-sm ${getRowColorClass(total)}`}>
                    {total > 0 ? fmt(total) : "–"}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 border-t-2 border-gray-300 font-semibold">
              <td className="sticky left-0 bg-gray-100 px-3 py-2 text-gray-700">Total</td>
              {projects.map((p) => {
                const ct = colTotal(p.id);
                return (
                  <td key={p.id} className="px-2 py-2 text-center text-gray-700">
                    {ct > 0 ? fmt(ct) : "–"}
                  </td>
                );
              })}
              {weekHolidays.map((h) => (
                <td key={h.id} className="px-2 py-2 text-center text-red-500 bg-red-50 border-l border-red-100">
                  {fmt(filteredEmployees.length * HOURS_PER_DAY)}h
                </td>
              ))}
              <td className="px-3 py-2 text-center text-gray-900">
                {grandTotal > 0 ? fmt(grandTotal) : "–"}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {filteredEmployees.length === 0 && (
        <div className="text-center py-12 text-gray-400">No employees found for the selected department.</div>
      )}
    </div>
  );
}

function StatCard({
  label, value, highlight, note,
}: {
  label: string;
  value: string | number;
  highlight?: "red" | "green" | "amber";
  note?: string;
}) {
  const textColor =
    highlight === "red" ? "text-red-600"
    : highlight === "green" ? "text-green-600"
    : highlight === "amber" ? "text-amber-500"
    : "text-indigo-700";
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
      <div className={`text-2xl font-bold ${textColor}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
      {note && <div className="text-xs text-amber-500 mt-0.5">{note}</div>}
    </div>
  );
}
