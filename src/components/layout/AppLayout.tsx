import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { clearAccessToken } from "../../authSession";
import { useScheduleResult } from "../../context/ScheduleResultContext";

const nav = [
  { to: "/schedule", label: "Расписание" },
  { to: "/analytics", label: "Отчёт" },
  { to: "/orders", label: "Заказы" },
  { to: "/workers", label: "Рабочие" },
  { to: "/equipment", label: "Оборудование" },
  { to: "/tech-processes", label: "Техпроцессы" },
] as const;

function linkClass(isActive: boolean): string {
  return [
    "rounded-md px-3 py-2 text-sm font-medium transition",
    isActive
      ? "bg-slate-900 text-white shadow-sm"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  ].join(" ");
}

export default function AppLayout() {
  const navigate = useNavigate();
  const { setScheduleResult } = useScheduleResult();

  const handleLogout = () => {
    clearAccessToken();
    setScheduleResult(null);
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50/50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <NavLink
              to="/schedule"
              className="text-sm font-semibold text-slate-900 hover:text-slate-700"
            >
              Планирование производства
            </NavLink>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Выйти
            </button>
          </div>
          <nav
            className="flex flex-wrap gap-1 border-t border-slate-100 pt-3 sm:border-t-0 sm:pt-0"
            aria-label="Основная навигация"
          >
            {nav.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => linkClass(isActive)}
                end={to === "/schedule"}
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6">
        <Outlet />
      </div>

      <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        Сроки и периоды на экране показываются в едином формате даты и времени.
      </footer>
    </div>
  );
}
