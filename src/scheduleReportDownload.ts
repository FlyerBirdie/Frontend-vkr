import { TIME_ZONE } from "./samaraTime";
import type { ScheduleResponse } from "./types";

/** Имя файла по «стеночным» дате/времени Europe/Samara (как в остальном UI планирования). */
export function buildScheduleReportFilename(d = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `schedule_report_${get("year")}${get("month")}${get("day")}_${get("hour")}${get("minute")}.json`;
}

/** UTF-8 JSON: нормализованный объект ответа POST /api/schedule (как в состоянии клиента). */
export function downloadScheduleReportJson(schedule: ScheduleResponse): void {
  const json = `${JSON.stringify(schedule, null, 2)}\n`;
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = buildScheduleReportFilename();
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
