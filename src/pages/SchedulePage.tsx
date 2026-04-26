import { useCallback, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ApiError, runScheduling } from "../api";
import ScheduleGantt from "../components/ScheduleGantt";
import SchedulePlanByOrder from "../components/SchedulePlanByOrder";
import ScheduleSavedOperations from "../components/ScheduleSavedOperations";
import SummaryPanel from "../components/SummaryPanel";
import { useScheduleResult } from "../context/ScheduleResultContext";
import {
  dateToDatetimeLocalValue,
  datetimeLocalToIsoUtc,
  initialFormPeriodFromDefault,
  validatePeriodOrder,
  weekAheadFromNow,
} from "../planningPeriod";
import { downloadScheduleReportJson } from "../scheduleReportDownload";
import { formatInSamara, TIME_ZONE_UI_LABEL } from "../samaraTime";

function formatPeriodLabels(isoStart: string, isoEnd: string): { start: string; end: string } {
  const o = { dateStyle: "short" as const, timeStyle: "short" as const };
  return {
    start: formatInSamara(isoStart, o),
    end: formatInSamara(isoEnd, o),
  };
}

type ScheduleView = "gantt" | "by_order" | "operations";

function scheduleViewFromSearch(params: URLSearchParams): ScheduleView {
  const v = params.get("view");
  if (v === "by_order" || v === "operations") return v;
  return "gantt";
}

function classifyScheduleError(message: string): "validation" | "network" {
  if (
    message.includes("Ошибка запроса или данных") ||
    /\((400|422)\)/.test(message)
  ) {
    return "validation";
  }
  return "network";
}

export default function SchedulePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const scheduleView = scheduleViewFromSearch(searchParams);

  const setScheduleView = useCallback(
    (id: ScheduleView) => {
      if (id === "gantt") {
        setSearchParams({}, { replace: true });
      } else {
        setSearchParams({ view: id }, { replace: true });
      }
    },
    [setSearchParams],
  );

  const { schedule, setScheduleResult } = useScheduleResult();

  const init = initialFormPeriodFromDefault();
  const [periodStartLocal, setPeriodStartLocal] = useState(init.startLocal);
  const [periodEndLocal, setPeriodEndLocal] = useState(init.endLocal);
  const [clientPeriodError, setClientPeriodError] = useState<string | null>(null);

  const [scheduling, setScheduling] = useState(false);
  const [scheduleNetworkError, setScheduleNetworkError] = useState<string | null>(null);
  const [scheduleValidationError, setScheduleValidationError] = useState<string | null>(null);

  const periodDisplay = useMemo(() => {
    if (!schedule?.period_start || !schedule?.period_end) return null;
    return formatPeriodLabels(schedule.period_start, schedule.period_end);
  }, [schedule]);

  const dismissErrors = useCallback(() => {
    setScheduleNetworkError(null);
    setScheduleValidationError(null);
    setClientPeriodError(null);
  }, []);

  const handleResetWeekDemo = () => {
    const { period_start, period_end } = weekAheadFromNow();
    setPeriodStartLocal(dateToDatetimeLocalValue(new Date(period_start)));
    setPeriodEndLocal(dateToDatetimeLocalValue(new Date(period_end)));
    setClientPeriodError(null);
    setScheduleValidationError(null);
    setScheduleNetworkError(null);
  };

  const handleRunScheduling = async () => {
    setClientPeriodError(null);
    setScheduleNetworkError(null);
    setScheduleValidationError(null);

    let startIso: string;
    let endIso: string;
    try {
      startIso = datetimeLocalToIsoUtc(periodStartLocal);
      endIso = datetimeLocalToIsoUtc(periodEndLocal);
    } catch {
      setClientPeriodError("Некорректные дата или время в полях периода.");
      return;
    }

    const v = validatePeriodOrder(startIso, endIso);
    if (v) {
      setClientPeriodError(v);
      return;
    }

    setScheduling(true);
    try {
      const result = await runScheduling({ period_start: startIso, period_end: endIso });
      setScheduleResult(result);
    } catch (e) {
      setScheduleResult(null);
      const msg =
        e instanceof ApiError
          ? (e.status === 422 || e.status === 400
              ? `Ошибка запроса или данных (${e.status}): ${e.humanMessage}`
              : `Планирование не выполнено (${e.status}): ${e.humanMessage}`)
          : e instanceof Error
            ? e.message
            : "Ошибка планирования";
      if (classifyScheduleError(msg) === "validation") {
        setScheduleValidationError(msg);
      } else {
        setScheduleNetworkError(msg);
      }
    } finally {
      setScheduling(false);
    }
  };

  const isEmptyResult =
    schedule !== null &&
    schedule.operations.length === 0 &&
    (schedule.included_orders?.length ?? 0) === 0;

  const hasBannerError =
    Boolean(scheduleNetworkError) || Boolean(scheduleValidationError);

  return (
    <div className="flex flex-col gap-6">
      <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">Расписание</h1>
        <div className="mt-4 w-full max-w-xl rounded-xl border border-slate-200 bg-slate-50/80 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Плановый период{" "}
            <span className="font-normal normal-case text-slate-400">({TIME_ZONE_UI_LABEL})</span>
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-slate-600">
              <span className="mb-1 block font-medium text-slate-700">Начало</span>
              <input
                type="datetime-local"
                value={periodStartLocal}
                onChange={(e) => {
                  setPeriodStartLocal(e.target.value);
                  setClientPeriodError(null);
                }}
                className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300/60"
              />
            </label>
            <label className="block text-xs text-slate-600">
              <span className="mb-1 block font-medium text-slate-700">Конец</span>
              <input
                type="datetime-local"
                value={periodEndLocal}
                onChange={(e) => {
                  setPeriodEndLocal(e.target.value);
                  setClientPeriodError(null);
                }}
                className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300/60"
              />
            </label>
          </div>
          {clientPeriodError ? (
            <p className="mt-2 text-sm text-amber-800" role="alert">
              {clientPeriodError}
            </p>
          ) : (
            <p className="mt-2 text-[11px] text-slate-500">
              Поля задают период в часовом поясе интерфейса ({TIME_ZONE_UI_LABEL}). Конец позже начала.
            </p>
          )}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              type="button"
              onClick={() => void handleRunScheduling()}
              disabled={scheduling}
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {scheduling ? (
                <>
                  <span
                    className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                    aria-hidden
                  />
                  Планирование…
                </>
              ) : (
                "Запустить планирование"
              )}
            </button>
            <button
              type="button"
              onClick={handleResetWeekDemo}
              disabled={scheduling}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              Сбросить: неделя вперёд
            </button>
            <button
              type="button"
              disabled={!schedule || scheduling}
              onClick={() => {
                if (schedule) downloadScheduleReportJson(schedule);
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Скачать отчёт в файл
            </button>
          </div>
        </div>
      </header>

      {hasBannerError && (
        <div className="space-y-px">
          {scheduleValidationError && (
            <div
              className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
              role="alert"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-medium">Ошибка проверки данных</p>
                  <p className="mt-0.5 whitespace-pre-wrap">{scheduleValidationError}</p>
                </div>
                <button
                  type="button"
                  onClick={dismissErrors}
                  className="shrink-0 self-start rounded-md border border-amber-200 bg-white px-2 py-0.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
                >
                  Скрыть
                </button>
              </div>
            </div>
          )}
          {scheduleNetworkError && (
            <div
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
              role="alert"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-medium">Ошибка сети или сервера</p>
                  <p className="mt-0.5">{scheduleNetworkError}</p>
                </div>
                <button
                  type="button"
                  onClick={dismissErrors}
                  className="shrink-0 self-start rounded-md border border-red-200 bg-white px-2 py-0.5 text-xs font-medium text-red-800 hover:bg-red-100"
                >
                  Скрыть
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <SummaryPanel
        schedule={schedule}
        isLoading={scheduling}
        periodDisplay={periodDisplay}
        isEmptyResult={isEmptyResult}
      />

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div
            className="inline-flex w-full max-w-2xl flex-col gap-1.5 rounded-xl border border-slate-200 bg-white p-1 shadow-sm sm:w-auto sm:flex-row sm:items-center sm:justify-between sm:pr-2"
            role="tablist"
            aria-label="Вид представления расписания"
          >
            <span className="hidden px-2 text-[10px] font-medium uppercase tracking-wide text-slate-400 sm:inline">
              Вид
            </span>
            <div className="flex flex-1 flex-wrap rounded-lg bg-slate-50 p-0.5">
              {(
                [
                  { id: "gantt" as const, label: "Гантт (ресурсы)" },
                  { id: "by_order" as const, label: "План по заказам" },
                  { id: "operations" as const, label: "Операции" },
                ] as const
              ).map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={scheduleView === id}
                  onClick={() => setScheduleView(id)}
                  className={`rounded-md px-3 py-2 text-center text-xs font-medium transition sm:px-3 ${
                    scheduleView === id
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            disabled={!schedule}
            onClick={() => void navigate("/analytics")}
            className="w-full shrink-0 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            Открыть отчёт
          </button>
        </div>

        {scheduleView === "gantt" ? (
          <ScheduleGantt operations={schedule?.operations ?? []} />
        ) : null}
        {scheduleView === "by_order" ? (
          <SchedulePlanByOrder operations={schedule?.operations ?? []} />
        ) : null}
        {scheduleView === "operations" ? <ScheduleSavedOperations /> : null}
      </div>
    </div>
  );
}
