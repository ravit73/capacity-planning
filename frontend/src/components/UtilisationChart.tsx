import { useMemo } from "react";
import { Employee, Project, CapacityEntry, WEEKLY_CAPACITY } from "../types";

interface Props {
  employees: Employee[];
  projects: Project[];
  entries: CapacityEntry[];
  departmentFilter: number | "all";
}

function barColor(pct: number): string {
  if (pct > 100) return "bg-red-500";
  if (pct >= 95) return "bg-green-500";
  return "bg-amber-400";
}

function textColor(pct: number): string {
  if (pct > 100) return "text-red-600";
  if (pct >= 95) return "text-green-600";
  return "text-amber-500";
}

export default function UtilisationChart({
  employees,
  projects,
  entries,
  departmentFilter,
}: Props) {
  const filteredEmployees = useMemo(
    () =>
      departmentFilter === "all"
        ? employees
        : employees.filter((e) => e.department_id === departmentFilter),
    [employees, departmentFilter]
  );

  // hours per employee
  const empHours = useMemo(() => {
    const map: Record<number, number> = {};
    for (const e of filteredEmployees) map[e.id] = 0;
    for (const entry of entries) {
      if (map[entry.employee_id] !== undefined) {
        map[entry.employee_id] = (map[entry.employee_id] ?? 0) + entry.hours;
      }
    }
    return map;
  }, [entries, filteredEmployees]);

  // hours per project (all employees)
  const projHours = useMemo(() => {
    const map: Record<number, number> = {};
    for (const p of projects) map[p.id] = 0;
    for (const entry of entries) {
      if (map[entry.project_id] !== undefined) {
        map[entry.project_id] = (map[entry.project_id] ?? 0) + entry.hours;
      }
    }
    return map;
  }, [entries, projects]);

  const maxProjHours = Math.max(1, ...Object.values(projHours));

  const sortedEmployees = useMemo(
    () => [...filteredEmployees].sort((a, b) => (empHours[b.id] ?? 0) - (empHours[a.id] ?? 0)),
    [filteredEmployees, empHours]
  );

  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => (projHours[b.id] ?? 0) - (projHours[a.id] ?? 0)),
    [projects, projHours]
  );

  if (filteredEmployees.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        No employees for the selected department.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Employee utilisation */}
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-3">
          Employee Utilisation vs {WEEKLY_CAPACITY}h weekly capacity
        </h2>
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 space-y-3">
          {sortedEmployees.map((emp) => {
            const h = empHours[emp.id] ?? 0;
            const pct = (h / WEEKLY_CAPACITY) * 100;
            const barW = Math.min(pct, 120); // cap visual at 120% for overflow indicator
            return (
              <div key={emp.id} className="flex items-center gap-3">
                <div className="w-36 text-sm text-right text-gray-600 truncate shrink-0">
                  {emp.name}
                </div>
                <div className="flex-1 bg-gray-100 rounded-full h-5 relative overflow-hidden">
                  {/* capacity marker at 100% */}
                  <div
                    className="absolute top-0 bottom-0 w-px bg-gray-400 z-10"
                    style={{ left: `${(100 / 120) * 100}%` }}
                  />
                  <div
                    className={`h-full rounded-full transition-all ${barColor(pct)}`}
                    style={{ width: `${(barW / 120) * 100}%` }}
                  />
                </div>
                <div className={`w-20 text-sm font-semibold text-right ${textColor(pct)}`}>
                  {h.toFixed(h % 1 === 0 ? 0 : 1)}h
                  <span className="text-xs font-normal ml-1">({pct.toFixed(0)}%)</span>
                </div>
              </div>
            );
          })}

          {/* Legend */}
          <div className="flex items-center gap-4 pt-2 border-t border-gray-100 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-green-500 inline-block" />
              ≥95% (fully planned)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" />
              &lt;95%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-red-500 inline-block" />
              &gt;100% (over capacity)
            </span>
            <span className="flex items-center gap-1 ml-auto">
              <span className="text-gray-400">| = {WEEKLY_CAPACITY}h threshold</span>
            </span>
          </div>
        </div>
      </section>

      {/* Project hours */}
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-3">
          Hours per Project
        </h2>
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 space-y-3">
          {sortedProjects.map((proj) => {
            const h = projHours[proj.id] ?? 0;
            const pct = maxProjHours > 0 ? (h / maxProjHours) * 100 : 0;
            return (
              <div key={proj.id} className="flex items-center gap-3">
                <div className="w-36 text-sm text-right text-gray-600 truncate shrink-0 flex items-center justify-end gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: proj.color_hex }}
                  />
                  {proj.name}
                </div>
                <div className="flex-1 bg-gray-100 rounded-full h-5">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: proj.color_hex,
                    }}
                  />
                </div>
                <div className="w-20 text-sm font-semibold text-right text-gray-700">
                  {h.toFixed(h % 1 === 0 ? 0 : 1)}h
                </div>
              </div>
            );
          })}
          {sortedProjects.every((p) => (projHours[p.id] ?? 0) === 0) && (
            <p className="text-center text-gray-400 py-4">No data for this month.</p>
          )}
        </div>
      </section>
    </div>
  );
}
