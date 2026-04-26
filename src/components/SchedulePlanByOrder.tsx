import { Fragment, useMemo } from "react";
import type { ScheduledOperation } from "../types";
import {
  buildUtcHourTicks,
  formatInSamara,
  formatInSamaraShort,
  isSamaraWallMidnightUtcTick,
  timelineRangeSamaraDayBounds,
  TIME_ZONE_UI_LABEL,
} from "../samaraTime";

type Props = {
  operations: ScheduledOperation[];
};

const PX_PER_HOUR = 36;
const ROW_HEIGHT = 56;
const RULER_HEIGHT = 36;
const LABEL_COL = "minmax(11rem,15rem)";

function parseUtc(iso: string): number {
  return new Date(iso).getTime();
}

function taskBarClasses(taskName: string | null | undefined): string {
  const t = (taskName ?? "").toLowerCase();
  if (t.includes("резк") || t.includes("лазер")) {
    return "bg-blue-600 border-blue-800/30";
  }
  if (t.includes("гибк") || t.includes("пресс")) {
    return "bg-emerald-600 border-emerald-800/30";
  }
  if (t.includes("свар")) {
    return "bg-amber-600 border-amber-800/30";
  }
  if (t.includes("краск") || t.includes("маляр") || t.includes("покр")) {
    return "bg-violet-600 border-violet-800/30";
  }
  return "bg-slate-600 border-slate-800/30";
}

type OrderRow = {
  orderId: number;
  orderName: string;
  ops: ScheduledOperation[];
  minStart: number;
  maxEnd: number;
};

export default function SchedulePlanByOrder({ operations }: Props) {
  const model = useMemo(() => {
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
    const timelineWidth = Math.max(spanHours * PX_PER_HOUR, 280);

    const byOrder = new Map<number, ScheduledOperation[]>();
    for (const op of operations) {
      const list = byOrder.get(op.order_id) ?? [];
      list.push(op);
      byOrder.set(op.order_id, list);
    }

    const rows: OrderRow[] = [];
    for (const [, ops] of byOrder) {
      ops.sort((a, b) => a.sequence_number - b.sequence_number);
      const orderId = ops[0]!.order_id;
      const orderName = ops[0]!.order_name;
      let rMin = Infinity;
      let rMax = -Infinity;
      for (const o of ops) {
        const s = parseUtc(o.start_time);
        const e = parseUtc(o.end_time);
        if (Number.isFinite(s)) rMin = Math.min(rMin, s);
        if (Number.isFinite(e)) rMax = Math.max(rMax, e);
      }
      rows.push({
        orderId,
        orderName,
        ops,
        minStart: rMin,
        maxEnd: rMax,
      });
    }
    rows.sort((a, b) => a.minStart - b.minStart || a.orderName.localeCompare(b.orderName, "ru"));

    const hourTicks = buildUtcHourTicks(rangeStartMs, rangeEndMs);

    return {
      rangeStartMs,
      spanMs,
      timelineWidth,
      hourTicks,
      rows,
    };
  }, [operations]);

  if (!operations.length) {
    return (
      <section className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        Нет операций — сначала выполните планирование. Здесь будет цепочка операций по каждому заказу на общей
        шкале ({TIME_ZONE_UI_LABEL}; дополняет Гантт по ресурсам).
      </section>
    );
  }

  if (!model) {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        Не удалось построить план по заказам: проверьте корректность времени в данных расписания.
      </section>
    );
  }

  const { rangeStartMs, spanMs, timelineWidth, hourTicks, rows } = model;

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-800">План по заказам</h2>
        <p className="mt-0.5 max-w-3xl text-xs text-slate-500">
          Одна строка — один заказ; блоки — операции техпроцесса по порядку шагов. Ось — {TIME_ZONE_UI_LABEL}. Удобно
          видеть сквозной маршрут изделия и паузы между операциями.
        </p>
      </div>

      <div className="max-h-[min(65vh,640px)] overflow-x-auto overflow-y-auto">
        <div
          className="inline-grid min-w-full"
          style={{
            gridTemplateColumns: `${LABEL_COL} ${timelineWidth}px`,
          }}
        >
          <div
            className="sticky left-0 z-30 border-b border-r border-slate-200 bg-slate-50 px-3 py-2 shadow-[4px_0_12px_-4px_rgba(15,23,42,0.12)]"
            style={{ height: RULER_HEIGHT }}
          >
            <span className="text-xs font-medium text-slate-500">Заказ</span>
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
                  className={`absolute top-0 border-l ${isDayStart ? "border-slate-300" : "border-slate-100"}`}
                  style={{ left: `${x}%`, height: "100%" }}
                >
                  <span
                    className={`absolute left-1 top-1 select-none whitespace-nowrap text-[10px] ${isDayStart ? "font-semibold text-slate-700" : "text-slate-400"}`}
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
            <Fragment key={row.orderId}>
              <div
                className="sticky left-0 z-20 border-b border-r border-slate-200 bg-white px-3 py-2 shadow-[4px_0_12px_-4px_rgba(15,23,42,0.1)]"
                style={{ minHeight: ROW_HEIGHT }}
              >
                <div className="text-xs font-semibold leading-snug text-slate-800">{row.orderName}</div>
              </div>
              <div
                className="relative border-b border-slate-100 bg-white"
                style={{
                  minHeight: ROW_HEIGHT,
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
                {row.ops.map((op) => {
                  const s = parseUtc(op.start_time);
                  const e = parseUtc(op.end_time);
                  const left = ((s - rangeStartMs) / spanMs) * 100;
                  const widthPct = Math.max(((e - s) / spanMs) * 100, 0.4);
                  const label = op.task_name?.trim() || `Шаг ${op.sequence_number}`;
                  const tip = [
                    `${label}`,
                    `${formatInSamaraShort(op.start_time)} — ${formatInSamaraShort(op.end_time)} (${TIME_ZONE_UI_LABEL})`,
                    `${op.worker_name} · ${op.equipment_name}`,
                  ].join("\n");

                  return (
                    <div
                      key={`${op.order_id}-${op.task_id}-${op.start_time}`}
                      className="absolute top-1/2 z-10 -translate-y-1/2 px-0.5"
                      style={{ left: `${left}%`, width: `${widthPct}%`, minWidth: 4 }}
                    >
                      <div
                        className={`flex h-9 flex-col justify-center overflow-hidden rounded border text-left text-white shadow-sm ${taskBarClasses(op.task_name)}`}
                        title={tip}
                      >
                        {widthPct >= 5 ? (
                          <>
                            <span className="truncate px-1.5 text-[9px] font-semibold leading-tight">
                              №{op.sequence_number}
                            </span>
                            {widthPct >= 9 ? (
                              <span className="truncate px-1.5 text-[8px] leading-tight text-white/90">{label}</span>
                            ) : null}
                          </>
                        ) : (
                          <span className="sr-only">{tip}</span>
                        )}
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
