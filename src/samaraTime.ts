/**
 * Единый часовой пояс интерфейса и трактовки datetime-local: Europe/Samara (UTC+4, без DST).
 * Согласовано с backend (`default_planning_period`, `work_calendar`: пн–пт, 08:00–17:00, перерыв 12–13 по
 * этой зоне). В MVP оборудование на фронте не разводится по другому календарю — как на backend.
 */

export const TIME_ZONE = "Europe/Samara";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function intPart(type: string, parts: Intl.DateTimeFormatPart[]): number {
  const v = parts.find((p) => p.type === type)?.value;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

/** Календарная дата (год/месяц/день) в Europe/Samara для момента `d` (UTC instant). */
export function samaraCalendarYmd(d: Date): { y: number; m: number; day: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(d);
  return {
    y: intPart("year", parts),
    m: intPart("month", parts),
    day: intPart("day", parts),
  };
}

/** Начало календарных суток в Самаре (00:00) как UTC-instant (мс). */
export function startOfSamaraDayUtcMs(d: Date | number): number {
  const dt = typeof d === "number" ? new Date(d) : d;
  const { y, m, day } = samaraCalendarYmd(dt);
  if (![y, m, day].every(Number.isFinite)) {
    throw new Error("startOfSamaraDayUtcMs: некорректная дата");
  }
  return new Date(`${y}-${pad2(m)}-${pad2(day)}T00:00:00+04:00`).getTime();
}

/** Конец календарных суток в Самаре (23:59:59.999) как UTC-instant (мс). */
export function endOfSamaraDayUtcMs(d: Date | number): number {
  const dt = typeof d === "number" ? new Date(d) : d;
  const { y, m, day } = samaraCalendarYmd(dt);
  if (![y, m, day].every(Number.isFinite)) {
    throw new Error("endOfSamaraDayUtcMs: некорректная дата");
  }
  return new Date(`${y}-${pad2(m)}-${pad2(day)}T23:59:59.999+04:00`).getTime();
}

/** Границы шкалы: от начала самарского дня min до конца самарского дня max. */
export function timelineRangeSamaraDayBounds(minMs: number, maxMs: number): {
  rangeStartMs: number;
  rangeEndMs: number;
} {
  const rangeStartMs = startOfSamaraDayUtcMs(minMs);
  let rangeEndMs = endOfSamaraDayUtcMs(maxMs);
  if (rangeEndMs <= rangeStartMs) {
    rangeEndMs = endOfSamaraDayUtcMs(minMs + 86400000);
  }
  return { rangeStartMs, rangeEndMs };
}

/** Значение для input[type="datetime-local"] по UTC-instant (отображение в Самаре). */
export function dateToDatetimeLocalValueSamara(d: Date): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/**
 * Строка datetime-local трактуется как момент в Europe/Samara → ISO UTC (как ожидает API).
 * Без суффикса зоны подставляется +04:00 (Самара).
 */
export function datetimeLocalToIsoUtcFromSamara(local: string): string {
  const trimmed = local.trim();
  if (!trimmed.includes("T")) {
    throw new Error("Некорректная дата");
  }
  const hasZone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(trimmed);
  const base =
    trimmed.length === 16 ? `${trimmed}:00` : trimmed.length >= 19 ? trimmed.slice(0, 19) : trimmed;
  const withOffset = hasZone ? base : `${base}+04:00`;
  const d = new Date(withOffset);
  if (Number.isNaN(d.getTime())) {
    throw new Error("Некорректная дата");
  }
  return d.toISOString();
}

/**
 * Период по умолчанию как на backend `default_planning_period`:
 * с полуночи текущих календарных суток в Europe/Samara на 14 календарных суток вперёд; в JSON — UTC (Z).
 */
export function defaultPlanningPeriodSamara(): { period_start: string; period_end: string } {
  const now = new Date();
  const { y, m, day } = samaraCalendarYmd(now);
  if (![y, m, day].every(Number.isFinite)) {
    throw new Error("defaultPlanningPeriodSamara: некорректные компоненты даты");
  }
  const localStartStr = `${y}-${pad2(m)}-${pad2(day)}T00:00:00+04:00`;
  const startUtc = new Date(localStartStr);
  const endUtc = new Date(startUtc.getTime() + 14 * 86400000);
  return {
    period_start: startUtc.toISOString(),
    period_end: endUtc.toISOString(),
  };
}

export function formatInSamara(
  iso: string | Date,
  options: Intl.DateTimeFormatOptions = { dateStyle: "short", timeStyle: "short" },
): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString("ru-RU", { timeZone: TIME_ZONE, ...options });
}

export function formatInSamaraShort(iso: string | Date): string {
  return formatInSamara(iso, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatIsoUtcShort(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString("ru-RU", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Метка «полночь по стенке Самары» для часового тика (UTC instant). */
export function isSamaraWallMidnightUtcTick(tMs: number): boolean {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date(tMs));
  const h = parts.find((p) => p.type === "hour")?.value;
  const m = parts.find((p) => p.type === "minute")?.value;
  return h === "00" && m === "00";
}

export function buildUtcHourTicks(rangeStartMs: number, rangeEndMs: number): Date[] {
  const ticks: Date[] = [];
  for (let t = rangeStartMs; t <= rangeEndMs; t += 3600000) {
    ticks.push(new Date(t));
  }
  return ticks;
}
