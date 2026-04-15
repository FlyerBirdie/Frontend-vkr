import { ApiError } from "../api";

export function apiErrorAlertClass(e: ApiError): string {
  if (e.isNetwork) {
    return "border-red-200 bg-red-50 text-red-900";
  }
  if (e.isConflict) {
    return "border-rose-200 bg-rose-50 text-rose-950";
  }
  if (e.isValidation) {
    return "border-amber-200 bg-amber-50 text-amber-950";
  }
  return "border-slate-200 bg-slate-50 text-slate-800";
}

export function apiErrorTitle(e: ApiError): string {
  if (e.isNetwork) return "API недоступен";
  if (e.isConflict) return "Конфликт (409)";
  if (e.isValidation) return "Ошибка валидации (400/422)";
  if (e.status === 404) return "Не найдено (404)";
  return `Ошибка (${e.status})`;
}
