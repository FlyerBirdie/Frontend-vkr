import { Link } from "react-router-dom";
import { isScheduleReportStubText } from "../scheduleReportStubs";
import { TIME_ZONE_UI_LABEL } from "../samaraTime";
import type { ScheduleResponse } from "../types";

export type SummaryPanelProps = {
  schedule: ScheduleResponse | null;
  /** Идёт запрос планирования */
  isLoading: boolean;
  /** Период расчёта для отображения (уже в читаемом виде) */
  periodDisplay: { start: string; end: string } | null;
  /** Успешный ответ без операций и без включённых заказов */
  isEmptyResult: boolean;
};

function coerceProfit(v: number | string | undefined): number | null {
  if (v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function includedCount(schedule: ScheduleResponse): number {
  if (Array.isArray(schedule.included_orders)) {
    return schedule.included_orders.length;
  }
  return new Set(schedule.operations.map((o) => o.order_id)).size;
}

function excludedList(schedule: ScheduleResponse) {
  return Array.isArray(schedule.excluded_orders) ? schedule.excluded_orders : [];
}

export default function SummaryPanel({
  schedule,
  isLoading,
  periodDisplay,
  isEmptyResult,
}: SummaryPanelProps) {
  const count = schedule?.operations.length ?? 0;
  const profit = schedule ? coerceProfit(schedule.total_profit) : null;
  const inc = schedule ? includedCount(schedule) : null;
  const excludedCount = schedule ? excludedList(schedule).length : null;

  return (
    <section
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      aria-busy={isLoading}
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Итог планирования
      </h2>

      {isLoading ? (
        <div className="mt-4 space-y-3" aria-live="polite">
          <div className="h-4 w-2/3 max-w-md animate-pulse rounded bg-slate-200" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
          <p className="text-xs text-slate-500">Выполняется расчёт расписания…</p>
        </div>
      ) : (
        <>
          <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm text-slate-700">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Плановый период (как в расчёте)
            </span>
            {periodDisplay ? (
              <p className="mt-1 tabular-nums">
                <span className="text-slate-600">с </span>
                {periodDisplay.start}
                <span className="text-slate-600"> по </span>
                {periodDisplay.end}
                <span className="mt-1 block text-xs font-normal text-slate-500">
                  Даты в том же виде, что и в расчёте ({TIME_ZONE_UI_LABEL}).
                </span>
              </p>
            ) : (
              <p className="mt-1 text-slate-500">Запустите планирование — здесь будет выбранный период расчёта.</p>
            )}
          </div>

          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs text-slate-500">Суммарная прибыль</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                {profit === null ? (
                  <span className="text-slate-400">—</span>
                ) : (
                  <>
                    {profit.toLocaleString("ru-RU", { maximumFractionDigits: 0 })}{" "}
                    <span className="text-base font-normal text-slate-500">₽</span>
                  </>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Включено заказов</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                {schedule ? inc : <span className="text-slate-400">—</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Исключено заказов</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                {schedule ? excludedCount : <span className="text-slate-400">—</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Операций в расписании</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                {schedule ? count : <span className="text-slate-400">—</span>}
              </dd>
            </div>
          </dl>

          {schedule ? (
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Подробная загрузка ресурсов — в разделе{" "}
              <Link
                to="/analytics"
                className="font-medium text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-900 hover:decoration-slate-500"
              >
                Отчёт по загрузке
              </Link>
              .
            </p>
          ) : null}

          {schedule?.report_summary?.trim() && !isScheduleReportStubText(schedule.report_summary) ? (
            <p className="mt-4 rounded-md border border-slate-100 bg-slate-50/90 px-3 py-2 text-sm text-slate-700">
              {schedule.report_summary.trim()}
            </p>
          ) : null}

          {isEmptyResult && (
            <div
              className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
              role="status"
            >
              Расписание пустое: нет операций и нет полностью включённых заказов — проверьте данные и период.
            </div>
          )}

          {schedule && excludedList(schedule).length > 0 && (
            <div className="mt-6 border-t border-slate-100 pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Исключённые заказы
              </h3>
              <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[24rem] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Заказ</th>
                      <th className="px-3 py-2 font-medium">Код</th>
                      <th className="px-3 py-2 font-medium">Причина</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {excludedList(schedule).map((row, i) => (
                      <tr key={`${row.order_id}-${row.code}-${i}`} className="text-slate-800">
                        <td className="px-3 py-2 font-medium">{row.order_name}</td>
                        <td className="px-3 py-2">
                          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{row.code}</code>
                        </td>
                        <td className="px-3 py-2 text-slate-700">{row.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
