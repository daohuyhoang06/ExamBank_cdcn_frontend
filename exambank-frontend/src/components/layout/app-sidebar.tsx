import { Link, useLocation } from "react-router-dom";

const navItems = [
  { label: "Danh sách đề", path: "/exams" },
  { label: "Hồ sơ", path: "/profile" },
  { label: "Xếp hạng", path: "/ranking" },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="hidden w-64 border-r border-slate-200 bg-white md:block">
      <div className="border-b border-slate-200 px-6 py-5">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
          ExamBank
        </p>
        <p className="mt-2 text-sm text-slate-500">Student Dashboard</p>
      </div>

      <nav className="flex flex-col gap-2 p-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`rounded-xl px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}