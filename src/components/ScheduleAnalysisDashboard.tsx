import { filterStubReportLines } from "../scheduleReportStubs";
import type { ScheduleReportMetrics, ScheduleResponse } from "../types";
import MetricsUtilizationBarCharts from "./MetricsUtilizationBarCharts";

type Props = {
  schedule: ScheduleResponse | null;
};

function MetricsBlock({ title, metrics }: { title: string; metrics: ScheduleReportMetrics }) {
  const recommendations = filterStubReportLines(metrics.recommendations ?? []);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
        <p className="mt-1 text-[11px] text-slate-500">
          Фонд периода: <span className="tabular-nums">{metrics.available_minutes_per_resource}</span> минут на
          ресурс (как в расчёте). Столбцы — доля загрузки в процентах (топ {8}).
        </p>
      </div>

      <MetricsUtilizationBarCharts workers={metrics.workers} equipment={metrics.equipment} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-4">
          <h4 className="text-xs font-semibold text-amber-900">Узкие места — высокая загрузка</h4>
          <ul className="mt-2 space-y-1.5 text-sm text-amber-950">
            {(metrics.bottlenecks_highest_load ?? []).length === 0 ? (
              <li className="text-xs text-amber-800/80">Нет данных.</li>
            ) : (
              metrics.bottlenecks_highest_load.map((b) => (
                <li key={`${b.resource_kind}-${b.id}-load`} className="leading-snug">
                  <span className="font-medium">{b.name}</span>
                  <span className="text-xs text-amber-800">
                    {" "}
                    ({b.resource_kind === "worker" ? "рабочий" : "оборуд."}) —{" "}
                    <span className="tabular-nums">{b.utilization_percent.toFixed(1)}%</span>
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
        <div className="rounded-lg border border-sky-100 bg-sky-50/50 p-4">
          <h4 className="text-xs font-semibold text-sky-900">Простои — низкая загрузка</h4>
          <ul className="mt-2 space-y-1.5 text-sm text-sky-950">
            {(metrics.bottlenecks_highest_idle ?? []).length === 0 ? (
              <li className="text-xs text-sky-800/80">Нет данных.</li>
            ) : (
              metrics.bottlenecks_highest_idle.map((b) => (
                <li key={`${b.resource_kind}-${b.id}-idle`} className="leading-snug">
                  <span className="font-medium">{b.name}</span>
                  <span className="text-xs text-sky-800">
                    {" "}
                    ({b.resource_kind === "worker" ? "рабочий" : "оборуд."}) —{" "}
                    <span className="tabular-nums">{b.utilization_percent.toFixed(1)}%</span> занятости
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      {recommendations.length ? (
        <div className="rounded-lg border border-violet-100 bg-violet-50/40 p-4">
          <h4 className="text-xs font-semibold text-violet-900">Рекомендации</h4>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-violet-950">
            {recommendations.map((r, i) => (
              <li key={i} className="leading-snug">
                {r}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export default function ScheduleAnalysisDashboard({ schedule }: Props) {
  const metrics = schedule?.metrics;

  if (!schedule) {
    return (
      <section className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        Запустите планирование — здесь появится сводка: загрузка ресурсов, узкие места и рекомендации из расчёта.
      </section>
    );
  }

  if (!metrics) {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        В результате расчёта нет сводки по загрузке — обновите приложение или обратитесь к администратору.
      </section>
    );
  }

  const agg = metrics.aggregate;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-800">Отчёт по загрузке ресурсов</h2>
      <p className="mt-0.5 text-xs text-slate-500">
        По данным последнего расчёта: средняя загрузка, сводка по пулу ресурсов, диаграммы по сотрудникам и
        оборудованию, узкие места.
      </p>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
          <dt className="text-[11px] text-slate-500">Средняя U, рабочие</dt>
          <dd className="text-lg font-semibold tabular-nums text-slate-900">
            {agg.workers_mean_utilization_percent.toFixed(1)}%
          </dd>
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
          <dt className="text-[11px] text-slate-500">Средняя U, оборудование</dt>
          <dd className="text-lg font-semibold tabular-nums text-slate-900">
            {agg.equipment_mean_utilization_percent.toFixed(1)}%
          </dd>
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
          <dt className="text-[11px] text-slate-500">Пул персонала, загрузка</dt>
          <dd className="text-lg font-semibold tabular-nums text-slate-900">
            {agg.pool_worker_load_percent.toFixed(1)}%
          </dd>
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
          <dt className="text-[11px] text-slate-500">Пул оборудования, загрузка</dt>
          <dd className="text-lg font-semibold tabular-nums text-slate-900">
            {agg.pool_equipment_load_percent.toFixed(1)}%
          </dd>
        </div>
      </dl>

      <div className="mt-6 border-t border-slate-100 pt-5">
        <MetricsBlock title="Детализация по ресурсам" metrics={metrics} />
      </div>
    </section>
  );
}
