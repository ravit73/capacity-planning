import { useState } from "react";
import { Employee, Project, Department, PublicHoliday } from "../types";

interface Props {
  employees: Employee[];
  projects: Project[];
  departments: Department[];
  holidays: PublicHoliday[];
  onCreateEmployee: (name: string, deptId: number) => Promise<void>;
  onDeleteEmployee: (id: number) => Promise<void>;
  onCreateProject: (name: string, colorHex: string) => Promise<void>;
  onDeleteProject: (id: number) => Promise<void>;
  onCreateHoliday: (date: string, name: string) => Promise<void>;
  onDeleteHoliday: (id: number) => Promise<void>;
}

const PRESET_COLORS = [
  "#ef4444","#f97316","#f59e0b","#10b981","#3b82f6",
  "#6366f1","#8b5cf6","#ec4899","#14b8a6","#6b7280",
];

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

function DeptBadge({ name }: { name: string }) {
  const colors: Record<string, string> = {
    Engineering: "bg-blue-100 text-blue-700",
    Design: "bg-pink-100 text-pink-700",
    Product: "bg-purple-100 text-purple-700",
    Data: "bg-teal-100 text-teal-700",
  };
  const cls = colors[name] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${cls}`}>
      {name}
    </span>
  );
}

export default function ManageTab({
  employees,
  projects,
  departments,
  holidays,
  onCreateEmployee,
  onDeleteEmployee,
  onCreateProject,
  onDeleteProject,
  onCreateHoliday,
  onDeleteHoliday,
}: Props) {
  const [empName, setEmpName] = useState("");
  const [empDept, setEmpDept] = useState<number>(departments[0]?.id ?? 0);
  const [empLoading, setEmpLoading] = useState(false);
  const [empError, setEmpError] = useState<string | null>(null);

  const [projName, setProjName] = useState("");
  const [projColor, setProjColor] = useState(PRESET_COLORS[4]);
  const [projLoading, setProjLoading] = useState(false);
  const [projError, setProjError] = useState<string | null>(null);

  const [holDate, setHolDate] = useState("");
  const [holName, setHolName] = useState("");
  const [holLoading, setHolLoading] = useState(false);
  const [holError, setHolError] = useState<string | null>(null);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim()) return;
    const deptId = empDept || departments[0]?.id;
    if (!deptId) return;
    setEmpLoading(true);
    setEmpError(null);
    try {
      await onCreateEmployee(empName.trim(), deptId);
      setEmpName("");
    } catch (err) {
      setEmpError(String(err));
    } finally {
      setEmpLoading(false);
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName.trim()) return;
    setProjLoading(true);
    setProjError(null);
    try {
      await onCreateProject(projName.trim(), projColor);
      setProjName("");
    } catch (err) {
      setProjError(String(err));
    } finally {
      setProjLoading(false);
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holDate || !holName.trim()) return;
    setHolLoading(true);
    setHolError(null);
    try {
      await onCreateHoliday(holDate, holName.trim());
      setHolDate("");
      setHolName("");
    } catch (err) {
      setHolError(String(err));
    } finally {
      setHolLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Employees */}
      <section className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h2 className="font-semibold text-gray-700">Employees</h2>
        </div>

        <ul className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
          {employees.map((emp) => (
            <li key={emp.id} className="flex items-center gap-3 px-4 py-2.5">
              <Avatar name={emp.name} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-900 truncate">{emp.name}</div>
              </div>
              <DeptBadge name={emp.department.name} />
              <button
                onClick={() => onDeleteEmployee(emp.id)}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50"
                title="Remove employee"
              >
                Remove
              </button>
            </li>
          ))}
          {employees.length === 0 && (
            <li className="px-4 py-6 text-center text-gray-400 text-sm">No employees yet.</li>
          )}
        </ul>

        <form onSubmit={handleAddEmployee} className="border-t border-gray-200 p-4 space-y-2">
          <div className="text-sm font-medium text-gray-600 mb-2">Add employee</div>
          <div className="flex gap-2">
            <input
              type="text"
              value={empName}
              onChange={(e) => setEmpName(e.target.value)}
              placeholder="Full name"
              className="flex-1 border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            <select
              value={empDept}
              onChange={(e) => setEmpDept(Number(e.target.value))}
              className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          {empError && <p className="text-xs text-red-500">{empError}</p>}
          <button
            type="submit"
            disabled={empLoading || !empName.trim()}
            className="w-full py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {empLoading ? "Adding…" : "Add Employee"}
          </button>
        </form>
      </section>

      {/* Projects */}
      <section className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h2 className="font-semibold text-gray-700">Projects</h2>
        </div>

        <ul className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
          {projects.map((proj) => (
            <li key={proj.id} className="flex items-center gap-3 px-4 py-2.5">
              <span
                className="w-4 h-4 rounded shrink-0"
                style={{ backgroundColor: proj.color_hex }}
              />
              <span className="flex-1 text-sm font-medium text-gray-900 truncate">
                {proj.name}
              </span>
              <button
                onClick={() => onDeleteProject(proj.id)}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50"
                title="Remove project"
              >
                Remove
              </button>
            </li>
          ))}
          {projects.length === 0 && (
            <li className="px-4 py-6 text-center text-gray-400 text-sm">No projects yet.</li>
          )}
        </ul>

        <form onSubmit={handleAddProject} className="border-t border-gray-200 p-4 space-y-2">
          <div className="text-sm font-medium text-gray-600 mb-2">Add project</div>
          <div className="flex gap-2">
            <input
              type="text"
              value={projName}
              onChange={(e) => setProjName(e.target.value)}
              placeholder="Project name"
              className="flex-1 border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {PRESET_COLORS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setProjColor(c)}
                className={`w-6 h-6 rounded-full border-2 transition-all ${
                  projColor === c ? "border-gray-700 scale-110" : "border-transparent"
                }`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
            <input
              type="color"
              value={projColor}
              onChange={(e) => setProjColor(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border border-gray-200"
              title="Custom color"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span
              className="w-3.5 h-3.5 rounded"
              style={{ backgroundColor: projColor }}
            />
            Selected: {projColor}
          </div>
          {projError && <p className="text-xs text-red-500">{projError}</p>}
          <button
            type="submit"
            disabled={projLoading || !projName.trim()}
            className="w-full py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {projLoading ? "Adding…" : "Add Project"}
          </button>
        </form>
      </section>

      {/* Public Holidays — spans full width */}
      <section className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden lg:col-span-2">
        <div className="px-4 py-3 border-b border-gray-200 bg-red-50 flex items-center gap-2">
          <span>🗓</span>
          <h2 className="font-semibold text-gray-700">Public Holidays</h2>
          <span className="text-xs text-gray-400 ml-1">— shown as read-only columns in the weekly planner</span>
        </div>

        <ul className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
          {[...holidays].sort((a, b) => a.date.localeCompare(b.date)).map((h) => (
            <li key={h.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400 shrink-0" />
              <span className="text-sm font-medium text-gray-900 w-36 shrink-0">
                {new Date(h.date).toLocaleDateString("en-GB", {
                  weekday: "short", day: "numeric", month: "short", year: "numeric",
                })}
              </span>
              <span className="flex-1 text-sm text-gray-700">{h.name}</span>
              <button
                onClick={() => onDeleteHoliday(h.id)}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50"
              >
                Remove
              </button>
            </li>
          ))}
          {holidays.length === 0 && (
            <li className="px-4 py-6 text-center text-gray-400 text-sm">No public holidays configured.</li>
          )}
        </ul>

        <form onSubmit={handleAddHoliday} className="border-t border-gray-200 p-4 space-y-2">
          <div className="text-sm font-medium text-gray-600 mb-2">Add public holiday</div>
          <div className="flex gap-2 flex-wrap">
            <input
              type="date"
              value={holDate}
              onChange={(e) => setHolDate(e.target.value)}
              className="border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-400"
              required
            />
            <input
              type="text"
              value={holName}
              onChange={(e) => setHolName(e.target.value)}
              placeholder="Holiday name (e.g. Christmas Day)"
              className="flex-1 min-w-[200px] border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-400"
            />
            <button
              type="submit"
              disabled={holLoading || !holDate || !holName.trim()}
              className="px-4 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {holLoading ? "Adding…" : "Add Holiday"}
            </button>
          </div>
          {holError && <p className="text-xs text-red-500">{holError}</p>}
        </form>
      </section>
    </div>
  );
}
