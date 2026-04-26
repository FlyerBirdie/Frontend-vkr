import { ORDER_STATUS_VALUES, type OrderResponse, type OrderStatus } from "./types";

/** Старые значения фронта до выравнивания с API — только для отображения и фильтра. */
const LEGACY_STATUS_MAP: Record<string, OrderStatus> = {
  planned: "scheduled",
  in_production: "in_progress",
};

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && (ORDER_STATUS_VALUES as readonly string[]).includes(value);
}

/** Приводит значение с API (или устаревшее) к каноническому OrderStatus для UI и фильтров. */
export function canonicalOrderStatus(status: string | null | undefined): OrderStatus | "unknown" {
  if (status == null || status === "") return "unknown";
  if (isOrderStatus(status)) return status;
  const mapped = LEGACY_STATUS_MAP[status];
  return mapped ?? "unknown";
}

/** Ключ фильтра по списку: известный код или «неизвестно» (нет поля, пусто или неизвестная строка). */
export function orderStatusFilterKey(status: string | null | undefined): OrderStatus | "unknown" {
  return canonicalOrderStatus(status);
}

const LABELS: Record<OrderStatus, string> = {
  draft: "Черновик",
  scheduled: "В плане",
  in_progress: "В работе",
  completed: "Выполнен",
  cancelled: "Отменён",
};

const HINTS: Record<OrderStatus, string> = {
  draft: "Не участвует в расчёте расписания, пока не переведёте в «В плане».",
  scheduled: "Допущен к расчёту расписания в пределах планового периода и окна заказа.",
  in_progress: "Выполнение идёт; смена статуса влияет на участие в пересчёте расписания.",
  completed: "Закрыт; обычно не участвует в новом расчёте расписания.",
  cancelled: "Исключён из планирования.",
};

export function orderStatusLabel(status: OrderStatus): string {
  return LABELS[status];
}

export function orderStatusPlanningHint(status: OrderStatus): string {
  return HINTS[status];
}

export function orderStatusBadgeClass(status: OrderStatus | "unknown"): string {
  switch (status) {
    case "draft":
      return "border border-slate-200 bg-slate-100 text-slate-800";
    case "scheduled":
      return "border border-blue-200 bg-blue-50 text-blue-900";
    case "in_progress":
      return "border border-amber-200 bg-amber-50 text-amber-950";
    case "completed":
      return "border border-emerald-200 bg-emerald-50 text-emerald-900";
    case "cancelled":
      return "border border-red-200 bg-red-50 text-red-900";
    default:
      return "border border-zinc-200 bg-zinc-100 text-zinc-800";
  }
}

/** Текст бейджа: канонический статус → по-русски; неизвестный код — как есть. */
export function orderStatusBadgeText(o: Pick<OrderResponse, "status">): { key: OrderStatus | "unknown"; text: string } {
  const s = o.status;
  if (s == null || s === "") {
    return { key: "unknown", text: "Не указан" };
  }
  const key = canonicalOrderStatus(s);
  if (key !== "unknown") {
    return { key, text: LABELS[key] };
  }
  return { key: "unknown", text: s };
}
