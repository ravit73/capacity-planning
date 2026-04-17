import { useState } from "react";
import WeeklyEntry from "./components/WeeklyEntry";
import UtilisationChart from "./components/UtilisationChart";
import ManageTab from "./components/ManageTab";
import {
  useEmployees,
  useProjects,
  useDepartments,
  useCapacity,
} from "./hooks/useApi";

type Tab = "entry" | "utilisation" | "manage";

/** Return the Monday of the ISO week containing d. */
function toMonday(d: Date): Date {
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return monday;
}

function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addWeeks(isoDate: string, n: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + n * 7);
  return toISODate(d);
}

function formatWeekRange(monday: string): string {
  const start = new Date(monday);
  const end = new Date(monday);
  end.setDate(start.getDate() + 6);

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  const startStr = fmt(start);
  const endStr = fmt(end);
  const year = end.getFullYear();

  // Avoid duplicating the year if both ends are in the same year
  return `${startStr} – ${endStr} ${year}`;
}

function WeekSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(addWeeks(value, -1))}
        className="p-1 rounded hover:bg-gray-200 text-gray-600 transition-colors"
        aria-label="Previous week"
      >
        ←
      </button>
      <span className="font-semibold text-gray-800 min-w-[190px] text-center text-sm">
        {formatWeekRange(value)}
      </span>
      <button
        onClick={() => onChange(addWeeks(value, 1))}
        className="p-1 rounded hover:bg-gray-200 text-gray-600 transition-colors"
        aria-label="Next week"
      >
        →
      </button>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>("entry");
  const [week, setWeek] = useState<string>(() => toISODate(toMonday(new Date())));
  const [deptFilter, setDeptFilter] = useState<number | "all">("all");

  const { employees, loading: empLoading, createEmployee, deleteEmployee } = useEmployees();
  const { projects, loading: projLoading, createProject, deleteProject } = useProjects();
  const { departments } = useDepartments();
  const { entries } = useCapacity(week);

  const loading = empLoading || projLoading;

  const tabs: { id: Tab; label: string }[] = [
    { id: "entry", label: "Weekly Entry" },
    { id: "utilisation", label: "Utilisation" },
    { id: "manage", label: "Manage" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">CP</span>
            </div>
            <h1 className="text-lg font-bold text-gray-900">Capacity Planning</h1>
          </div>

          {(tab === "entry" || tab === "utilisation") && (
            <WeekSelector value={week} onChange={setWeek} />
          )}

          {(tab === "entry" || tab === "utilisation") && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">Dept:</label>
              <select
                value={deptFilter}
                onChange={(e) =>
                  setDeptFilter(e.target.value === "all" ? "all" : Number(e.target.value))
                }
                className="border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
              >
                <option value="all">All</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <nav className="flex gap-0 -mb-px">
            {tabs.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  tab === id
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {loading && <div className="text-center py-20 text-gray-400">Loading…</div>}
        {!loading && (
          <>
            {tab === "entry" && (
              <WeeklyEntry
                employees={employees}
                projects={projects}
                departmentFilter={deptFilter}
                week={week}
              />
            )}
            {tab === "utilisation" && (
              <UtilisationChart
                employees={employees}
                projects={projects}
                entries={entries}
                departmentFilter={deptFilter}
              />
            )}
            {tab === "manage" && (
              <ManageTab
                employees={employees}
                projects={projects}
                departments={departments}
                onCreateEmployee={createEmployee}
                onDeleteEmployee={deleteEmployee}
                onCreateProject={createProject}
                onDeleteProject={deleteProject}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
