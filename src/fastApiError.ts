import type { ScheduleIssueItem } from "./types";

/**
 * Человекочитаемое сообщение из поля `detail` ответа FastAPI (строка, массив ошибок валидации, кастомный объект).
 */
export function formatFastApiDetail(detail: unknown, maxItems = 8): string {
  if (detail === undefined || detail === null) return "";
  if (typeof detail === "string") return detail.trim();

  if (Array.isArray(detail)) {
    return detail
      .slice(0, maxItems)
      .map((item) => {
        if (item && typeof item === "object" && "msg" in item) {
          const o = item as { loc?: unknown[]; msg?: string };
          const loc = Array.isArray(o.loc)
            ? o.loc
                .map((x) => (x === "body" ? "" : String(x)))
                .filter(Boolean)
                .join(" → ")
            : "";
          const msg = o.msg ?? "";
          return loc ? `${loc}: ${msg}` : msg;
        }
        return JSON.stringify(item);
      })
      .filter(Boolean)
      .join("; ");
  }

  if (typeof detail === "object") {
    const d = detail as Record<string, unknown>;
    if (d.error === "planning_validation_failed" && Array.isArray(d.errors)) {
      const msgs = (d.errors as ScheduleIssueItem[])
        .slice(0, maxItems)
        .map((e) => e.message)
        .filter(Boolean);
      let out = msgs.join("; ");
      if (typeof d.report_summary === "string" && d.report_summary.trim()) {
        const summary = d.report_summary.trim();
        out = out ? `${summary} — ${out}` : summary;
      }
      return out || "Ошибка проверки данных перед планированием.";
    }
    if (Array.isArray(d.errors)) {
      return formatFastApiDetail(d.errors, maxItems);
    }
    /** 404/409 и кастомные ошибки: `{ code, message }` внутри `detail`. */
    if (typeof d.message === "string" && typeof d.code === "string") {
      return `${d.message} [${d.code}]`;
    }
    if (typeof d.msg === "string") return d.msg;
    if (typeof d.message === "string") return d.message;
  }

  return String(detail);
}

/** Разбор тела HTTP-ошибки (JSON с `detail` или сырой текст). */
export function parseFastApiErrorMessageFromJsonBody(text: string): string {
  if (!text.trim()) {
    return "нет тела ответа";
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return text.trim().slice(0, 500);
  }
  const root = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  const detail = root && "detail" in root ? root.detail : parsed;
  const msg = formatFastApiDetail(detail);
  if (msg) return msg;
  return text.trim().slice(0, 400);
}
