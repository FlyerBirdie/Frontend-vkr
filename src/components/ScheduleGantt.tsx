import { Fragment, useMemo, useState } from "react";
import type { ScheduledOperation } from "../types";
import {
  buildUtcHourTicks,
  formatInSamara,
  isSamaraWallMidnightUtcTick,
  timelineRangeSamaraDayBounds,
} from "../samaraTime";

type Props = {
  operations: ScheduledOperation[];
};

type GroupBy = "worker" | "equipment";

/** Дискретные уровни «пикселей на час» шкалы (мин 18 — макс 96), включая прежнее значение по умолчанию 44. */
const PX_PER_HOUR_LEVELS = [18, 24, 30, 36, 42, 44, 48, 54, 60, 66, 72, 78, 84, 90, 96] as const;
const DEFAULT_PX_PER_HOUR_INDEX = PX_PER_HOUR_LEVELS.indexOf(44);

const ROW_HEIGHT = 52;
const RULER_HEIGHT = 40;

/** Липкая колонка подписей: фиксированная ширина для предсказуемого sticky. */
const LABEL_COL_MIN = "10.5rem";
const LABEL_COL_MAX = "14rem";

function parseUtc(iso: string): number {
  return new Date(iso).getTime();
}

function formatSamaraRange(startIso: string, endIso: string): string {
  const o = { dateStyle: "short" as const, timeStyle: "short" as const };
  return `${formatInSamara(startIso, o)} — ${formatInSamara(endIso, o)}`;
}

function buildTooltipText(op: ScheduledOperation, taskLabel: string): string {
  return [
    `Заказ: ${op.order_name}`,
    `Операция: ${taskLabel}`,
    `Интервал: ${formatSamaraRange(op.start_time, op.end_time)}`,
    `Рабочий: ${op.worker_name}`,
    `Оборудование: ${op.equipment_name}`,
  ].join("\n");
}

function taskBarClasses(taskName: string | null | undefined): string {
  const t = (taskName ?? "").toLowerCase();
  if (t.includes("резк") || t.includes("лазер")) {
    return "bg-blue-600 hover:bg-blue-500 border-blue-800/30";
  }
  if (t.includes("гибк") || t.includes("пресс")) {
    return "bg-emerald-600 hover:bg-emerald-500 border-emerald-800/30";
  }
  if (t.includes("свар")) {
    return "bg-amber-600 hover:bg-amber-500 border-amber-800/30";
  }
  if (t.includes("краск") || t.includes("маляр") || t.includes("покр")) {
    return "bg-violet-600 hover:bg-violet-500 border-violet-800/30";
  }
  return "bg-slate-600 hover:bg-slate-500 border-slate-800/30";
}

/** Стабильный внутренний ключ строки (не для показа пользователю). */
function rowGroupKey(op: ScheduledOperation, groupBy: GroupBy): string {
  return groupBy === "worker" ? `w-${op.worker_id}` : `e-${op.equipment_id}`;
}

/** Подпись строки: только имя из справочника, без внутренних id. */
function rowGroupLabel(op: ScheduledOperation, groupBy: GroupBy): string {
  if (groupBy === "worker") {
    return op.worker_name?.trim() || "Рабочий (без названия в справочнике)";
  }
  return op.equipment_name?.trim() || "Оборудование (без названия в справочнике)";
}

/** Стабильный ключ элемента списка / бара (числовой id или составной). */
function stableOperationKey(op: ScheduledOperation): string {
  if (typeof op.id === "number" && Number.isFinite(op.id)) {
    return `op-${op.id}`;
  }
  return `op-${op.order_id}-${op.task_id}-${op.sequence_number}-${op.start_time}`;
}

type GanttRow = {
  key: string;
  label: string;
  operations: ScheduledOperation[];
};

type GanttModel = {
  rangeStartMs: number;
  rangeEndMs: number;
  spanMs: number;
  timelineWidth: number;
  hourTicks: Date[];
  rows: GanttRow[];
};

export default function ScheduleGantt({ operations }: Props) {
  const [groupBy, setGroupBy] = useState<GroupBy>("worker");
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_PX_PER_HOUR_INDEX);
  const pxPerHour = PX_PER_HOUR_LEVELS[zoomIndex] ?? PX_PER_HOUR_LEVELS[DEFAULT_PX_PER_HOUR_INDEX];
  const zoomPercent = Math.round((pxPerHour / 44) * 100);

  const model = useMemo((): GanttModel | null => {
    if (!operations.length) return null;

    let minMs = Infinity;
    let maxMs = -Infinity;
    for (const op of operations) {
      const s = parseUtc(op.start_time);
      const e = parseUtc(op.end_time);
      if (Number.isFinite(s)) minMs = Math.min(minMs, s);
      if (Number.isFinite(e)) maxMs = Math.max(maxMs, e);
    }
    if (!Number.isFinite(minMs) || !Number.isFinite(maxMs) || maxMs <= minMs) {
      return null;
    }

    const { rangeStartMs, rangeEndMs } = timelineRangeSamaraDayBounds(minMs, maxMs);
    const spanMs = rangeEndMs - rangeStartMs;
    const spanHours = spanMs / 3_600_000;
    const timelineWidth = Math.max(spanHours * pxPerHour, 320);

    const byKey = new Map<string, ScheduledOperation[]>();
    for (const op of operations) {
      const k = rowGroupKey(op, groupBy);
      const list = byKey.get(k) ?? [];
      list.push(op);
      byKey.set(k, list);
    }

    const rows: GanttRow[] = [];
    for (const [key, ops] of byKey) {
      ops.sort((x, y) => parseUtc(x.start_time) - parseUtc(y.start_time));
      const op0 = ops[0]!;
      rows.push({
        key,
        label: rowGroupLabel(op0, groupBy),
        operations: ops,
      });
    }
    rows.sort((a, b) => {
      const c = a.label.localeCompare(b.label, "ru");
      if (c !== 0) return c;
      return a.key.localeCompare(b.key);
    });

    const hourTicks = buildUtcHourTicks(rangeStartMs, rangeEndMs);

    return {
      rangeStartMs,
      rangeEndMs,
      spanMs,
      timelineWidth,
      hourTicks,
      rows,
    };
  }, [operations, groupBy, pxPerHour]);

  if (!operations.length) {
    return (
      <section className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
        Запустите планирование — здесь появится диаграмма загрузки по времени.
      </section>
    );
  }

  if (!model) {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        Не удалось построить шкалу времени: проверьте корректность времени операций в расписании.
      </section>
    );
  }

  const { rangeStartMs, spanMs, timelineWidth, hourTicks, rows } = model;

  const headerResource =
    groupBy === "worker" ? "Рабочий" : "Оборудование";

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Расписание операций</h2>
            <p className="mt-0.5 max-w-3xl text-xs text-slate-500">
              Цвета по типу операции: резка — синий, гибка — зелёный, сварка — янтарный, покраска — фиолетовый.
              Во всплывающей подсказке — время и название операции.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-1.5 sm:items-end">
            <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
              Группировка строк
            </span>
            <div
              className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 shadow-sm"
              role="group"
              aria-label="Режим группировки диаграммы"
            >
              <button
                type="button"
                onClick={() => setGroupBy("worker")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  groupBy === "worker"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                По рабочим
              </button>
              <button
                type="button"
                onClick={() => setGroupBy("equipment")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  groupBy === "equipment"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                По оборудованию
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50/80 px-4 py-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p
          className="text-xs text-slate-600"
          id="schedule-gantt-zoom-label"
          aria-live="polite"
        >
          Масштаб:{" "}
          <span className="font-medium text-slate-800">
            {pxPerHour} px/ч
          </span>{" "}
          <span className="text-slate-500">({zoomPercent}% от базового)</span>
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div
            className="inline-flex shrink-0 rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm"
            role="group"
            aria-label="Масштаб временной шкалы диаграммы"
          >
            <button
              type="button"
              onClick={() => setZoomIndex((i) => Math.max(0, i - 1))}
              disabled={zoomIndex <= 0}
              className="rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-700 transition enabled:hover:bg-slate-50 enabled:hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Уменьшить масштаб диаграммы"
            >
              Уменьшить
            </button>
            <button
              type="button"
              onClick={() => setZoomIndex((i) => Math.min(PX_PER_HOUR_LEVELS.length - 1, i + 1))}
              disabled={zoomIndex >= PX_PER_HOUR_LEVELS.length - 1}
              className="rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-700 transition enabled:hover:bg-slate-50 enabled:hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Увеличить масштаб диаграммы"
            >
              Увеличить
            </button>
            <button
              type="button"
              onClick={() => setZoomIndex(DEFAULT_PX_PER_HOUR_INDEX)}
              className="rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
              aria-label="Сбросить масштаб диаграммы к значению по умолчанию"
            >
              Сброс
            </button>
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-xs">
            <label htmlFor="schedule-gantt-zoom-slider" className="sr-only">
              Ползунок масштаба временной шкалы
            </label>
            <input
              id="schedule-gantt-zoom-slider"
              type="range"
              min={0}
              max={PX_PER_HOUR_LEVELS.length - 1}
              step={1}
              value={zoomIndex}
              onChange={(e) => setZoomIndex(Number(e.target.value))}
              className="h-2 w-full min-w-[8rem] cursor-pointer accent-slate-700"
              aria-valuemin={0}
              aria-valuemax={PX_PER_HOUR_LEVELS.length - 1}
              aria-valuenow={zoomIndex}
              aria-valuetext={`${pxPerHour} пикселей на час, ${zoomPercent} процентов от базового`}
              aria-labelledby="schedule-gantt-zoom-label"
            />
          </div>
        </div>
      </div>

      <div className="max-h-[min(70vh,720px)] overflow-x-auto overflow-y-auto">
        <div
          className="inline-grid min-w-full"
          style={{
            gridTemplateColumns: `minmax(${LABEL_COL_MIN},${LABEL_COL_MAX}) ${timelineWidth}px`,
          }}
        >
          <div
            className="sticky left-0 z-30 border-b border-r border-slate-200 bg-slate-50 px-3 py-2 shadow-[4px_0_12px_-4px_rgba(15,23,42,0.12)]"
            style={{ height: RULER_HEIGHT }}
          >
            <span className="text-xs font-medium text-slate-500">{headerResource}</span>
          </div>
          <div
            className="relative border-b border-slate-200 bg-slate-50"
            style={{ height: RULER_HEIGHT, width: timelineWidth, minWidth: timelineWidth }}
          >
            {hourTicks.map((t) => {
              const x = ((t.getTime() - rangeStartMs) / spanMs) * 100;
              const isDayStart = isSamaraWallMidnightUtcTick(t.getTime());
              return (
                <div
                  key={t.getTime()}
                  className={`absolute top-0 border-l border-slate-200 ${isDayStart ? "border-slate-300" : "border-slate-100"}`}
                  style={{ left: `${x}%`, height: "100%" }}
                >
                  <span
                    className={`absolute left-1 top-1 select-none whitespace-nowrap text-[10px] leading-none ${isDayStart ? "font-semibold text-slate-700" : "text-slate-400"}`}
                  >
                    {isDayStart
                      ? formatInSamara(t, { weekday: "short", day: "numeric", month: "short" })
                      : formatInSamara(t, { hour: "2-digit", minute: "2-digit", hour12: false })}
                  </span>
                </div>
              );
            })}
          </div>

          {rows.map((row) => (
            <Fragment key={row.key}>
              <div
                className="sticky left-0 z-20 border-b border-r border-slate-200 bg-white px-3 py-2 shadow-[4px_0_12px_-4px_rgba(15,23,42,0.1)]"
                style={{ minHeight: ROW_HEIGHT }}
              >
                <span className="line-clamp-2 text-xs font-medium leading-snug text-slate-700">
                  {row.label}
                </span>
              </div>
              <div
                className="relative border-b border-slate-100 bg-white"
                style={{
                  height: ROW_HEIGHT,
                  width: timelineWidth,
                  minWidth: timelineWidth,
                }}
              >
                {hourTicks.map((t) => {
                  const x = ((t.getTime() - rangeStartMs) / spanMs) * 100;
                  const isDayStart = isSamaraWallMidnightUtcTick(t.getTime());
                  return (
                    <div
                      key={t.getTime()}
                      className={`pointer-events-none absolute bottom-0 top-0 border-l ${isDayStart ? "border-slate-200" : "border-slate-50"}`}
                      style={{ left: `${x}%` }}
                    />
                  );
                })}
                {row.operations.map((op) => {
                  const s = parseUtc(op.start_time);
                  const e = parseUtc(op.end_time);
                  const left = ((s - rangeStartMs) / spanMs) * 100;
                  const widthPct = Math.max(((e - s) / spanMs) * 100, 0.35);
                  const taskLabel = op.task_name?.trim() || "—";
                  const tip = buildTooltipText(op, taskLabel);

                  const showText = widthPct >= 4;
                  const showTwoLines = widthPct >= 10;
                  /** Широкий бар — показываем всплывающую карточку; на узких достаточно нативного title. */
                  const showHoverCard = widthPct >= 14;

                  return (
                    <div
                      key={stableOperationKey(op)}
                      className="group absolute top-1/2 z-10 -translate-y-1/2 px-0.5"
                      style={{ left: `${left}%`, width: `${widthPct}%`, minWidth: 4 }}
                    >
                      <div
                        className={`relative flex h-9 cursor-default flex-col justify-center overflow-hidden rounded border text-white shadow-sm ${taskBarClasses(op.task_name)}`}
                        title={tip}
                      >
                        {showText ? (
                          <>
                            <div className="truncate px-1.5 text-[10px] font-semibold leading-tight">
                              {op.order_name}
                            </div>
                            {showTwoLines ? (
                              <div className="truncate px-1.5 text-[9px] leading-tight text-white/90">
                                {taskLabel}
                              </div>
                            ) : null}
                          </>
                        ) : (
                          <span className="sr-only">{tip}</span>
                        )}
                        {showHoverCard ? (
                          <div className="pointer-events-none absolute left-0 top-full z-30 mt-1 hidden min-w-[200px] max-w-[min(18rem,85vw)] rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-left text-[11px] font-normal leading-snug text-slate-50 shadow-xl group-hover:block">
                            <div className="whitespace-pre-wrap">{tip}</div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
