import { useCallback, useEffect, useState } from "react";
import { ApiError, listOperations } from "../api";
import { apiErrorAlertClass, apiErrorTitle } from "../crud/apiErrorUi";
import type { ScheduledOperation } from "../types";

export default function OperationsPage() {
  const [rows, setRows] = useState<ScheduledOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [filterInput, setFilterInput] = useState("");

  const refresh = useCallback(async (orderId: number | null) => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listOperations(orderId));
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(500, String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh(null);
  }, [refresh]);

  const applyFilter = () => {
    const trimmed = filterInput.trim();
    const oid = trimmed === "" ? null : Number(trimmed);
    if (trimmed !== "" && !Number.isFinite(oid)) {
      setError(new ApiError(422, "Введите числовой order_id или оставьте поле пустым."));
      return;
    }
    void refresh(oid);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Операции в БД (read-only)</h1>
          <p className="mt-1 text-sm text-slate-600">
            GET <code className="rounded bg-slate-100 px-1">/api/operations</code> — последнее сохранённое
            расписание.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-medium text-slate-700">
            Фильтр order_id
            <input
              type="text"
              inputMode="numeric"
              className="ml-2 w-28 rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              value={filterInput}
              onChange={(e) => setFilterInput(e.target.value)}
              placeholder="все"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setError(null);
              applyFilter();
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Применить
          </button>
          <button
            type="button"
            onClick={() => {
              setFilterInput("");
              void refresh(null);
            }}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Сбросить фильтр
          </button>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className={`rounded-lg border px-4 py-3 text-sm ${apiErrorAlertClass(error)}`}
        >
          <span className="font-medium">{apiErrorTitle(error)}.</span> {error.humanMessage}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <p className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
          В таблице — сырые строки из API (UTC). Для сопоставления с планированием см. диаграммы на «Расписание»
          (ось Europe/Samara).
        </p>
        {loading ? (
          <p className="p-5 text-sm text-slate-500">Загрузка…</p>
        ) : rows.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">Нет операций.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-2 py-2 font-medium">ID</th>
                  <th className="px-2 py-2 font-medium">Заказ</th>
                  <th className="px-2 py-2 font-medium">Операция</th>
                  <th className="px-2 py-2 font-medium">Рабочий</th>
                  <th className="px-2 py-2 font-medium">Оборудование</th>
                  <th className="px-2 py-2 font-medium">Начало (UTC)</th>
                  <th className="px-2 py-2 font-medium">Конец (UTC)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((op) => (
                  <tr key={op.id} className="text-slate-800">
                    <td className="px-2 py-2 tabular-nums text-slate-600">{op.id}</td>
                    <td className="px-2 py-2">
                      {op.order_name}{" "}
                      <span className="text-xs text-slate-500">#{op.order_id}</span>
                    </td>
                    <td className="px-2 py-2">{op.task_name ?? "—"}</td>
                    <td className="px-2 py-2 text-xs">{op.worker_name}</td>
                    <td className="px-2 py-2 text-xs">{op.equipment_name}</td>
                    <td className="px-2 py-2 font-mono text-[11px] text-slate-600">{op.start_time}</td>
                    <td className="px-2 py-2 font-mono text-[11px] text-slate-600">{op.end_time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
