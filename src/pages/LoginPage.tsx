import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ApiError, loginPlanner } from "../api";
import { getAccessToken, setAccessToken } from "../authSession";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (getAccessToken()) {
    return <Navigate to="/schedule" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await loginPlanner(username, password);
      if (!res.access_token?.trim()) {
        setError("Сервер не вернул access_token.");
        return;
      }
      setAccessToken(res.access_token.trim());
      const from = (location.state as { from?: string } | null)?.from;
      const safe =
        typeof from === "string" && from.startsWith("/") && !from.startsWith("/login") ? from : "/schedule";
      navigate(safe, { replace: true });
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.humanMessage || `Ошибка входа (${err.status})`
          : err instanceof Error
            ? err.message
            : "Не удалось войти";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50/80 px-4 py-10">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-center text-lg font-semibold text-slate-900">Вход планировщика</h1>
        <p className="mt-1 text-center text-xs text-slate-500">
          Учётные данные из настроек backend (например, переменные окружения демо-пользователя).
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="login-username" className="block text-xs font-medium text-slate-700">
              Логин
            </label>
            <input
              id="login-username"
              name="username"
              autoComplete="username"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-400 focus:ring-2"
              value={username}
              onChange={(ev) => setUsername(ev.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-xs font-medium text-slate-700">
              Пароль
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-400 focus:ring-2"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              required
            />
          </div>

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-slate-900 px-3 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? "Вход…" : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}
