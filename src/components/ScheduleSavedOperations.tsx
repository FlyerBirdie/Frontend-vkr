import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, listOperations } from "../api";
import { apiErrorAlertClass, apiErrorTitle } from "../crud/apiErrorUi";
import { formatInSamara, TIME_ZONE_UI_LABEL } from "../samaraTime";
import type { ScheduledOperation } from "../types";

const PAGE_SIZES = [10, 25, 50] as const;

function formatOpTime(iso: string): string {
  try {
    return formatInSamara(iso, { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function stableRowKey(op: ScheduledOperation, rowIndex: number): string {
  if (typeof op.id === "number" && Number.isFinite(op.id)) {
    return `op-${op.id}`;
  }
  return `op-${op.order_id}-${op.task_id}-${op.sequence_number}-${op.start_time}-${rowIndex}`;
}

export default function ScheduleSavedOperations() {
  const [rows, setRows] = useState<ScheduledOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [nameQuery, setNameQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(25);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listOperations(null));
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(500, String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = nameQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((op) => (op.order_name ?? "").toLowerCase().includes(q));
  }, [rows, nameQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages, filtered.length, pageSize]);

  const pageSlice = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <p className="text-xs text-slate-600">
          Сохранённые операции (только просмотр). Время — как в интерфейсе ({TIME_ZONE_UI_LABEL}).
        </p>
        <label className="block text-xs font-medium text-slate-700">
          Поиск по названию заказа
          <input
            type="search"
            className="mt-1 w-full min-w-[12rem] rounded-md border border-slate-200 px-2 py-1.5 text-sm sm:w-56"
            value={nameQuery}
            onChange={(e) => {
              setNameQuery(e.target.value);
              setPage(1);
            }}
            placeholder="все заказы"
          />
        </label>
      </div>

      {error ? (
        <div
          role="alert"
          className={`mx-4 my-3 rounded-lg border px-4 py-3 text-sm ${apiErrorAlertClass(error)}`}
        >
          <span className="font-medium">{apiErrorTitle(error)}.</span> {error.humanMessage}
        </div>
      ) : null}

      {loading ? (
        <p className="p-5 text-sm text-slate-500">Загрузка…</p>
      ) : filtered.length === 0 ? (
        <p className="p-5 text-sm text-slate-500">
          {rows.length === 0 ? "Нет операций." : "Нет строк, подходящих под поиск."}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Заказ</th>
                  <th className="px-3 py-2 font-medium">Операция</th>
                  <th className="px-3 py-2 font-medium">Рабочий</th>
                  <th className="px-3 py-2 font-medium">Оборудование</th>
                  <th className="px-3 py-2 font-medium">Начало</th>
                  <th className="px-3 py-2 font-medium">Конец</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageSlice.map((op, i) => (
                  <tr key={stableRowKey(op, (page - 1) * pageSize + i)} className="text-slate-800">
                    <td className="px-3 py-2 font-medium">{op.order_name}</td>
                    <td className="px-3 py-2">{op.task_name ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">{op.worker_name}</td>
                    <td className="px-3 py-2 text-xs">{op.equipment_name}</td>
                    <td className="px-3 py-2 tabular-nums text-slate-600">{formatOpTime(op.start_time)}</td>
                    <td className="px-3 py-2 tabular-nums text-slate-600">{formatOpTime(op.end_time)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-600 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span>
                Страница {page} из {totalPages} · строк: {filtered.length}
              </span>
              <label className="inline-flex items-center gap-1.5">
                <span className="text-slate-500">На странице</span>
                <select
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value) as (typeof PAGE_SIZES)[number]);
                    setPage(1);
                  }}
                >
                  {PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Назад
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Вперёд
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
