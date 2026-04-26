import {
  dateToDatetimeLocalValueSamara,
  datetimeLocalToIsoUtcFromSamara,
  defaultPlanningPeriodSamara,
} from "./samaraTime";

/** Значение для input[type="datetime-local"] по UTC-instant (отображение в Europe/Samara). */
export const dateToDatetimeLocalValue = dateToDatetimeLocalValueSamara;

/** ISO UTC из datetime-local; ввод трактуется как момент в Europe/Samara (+04:00). */
export const datetimeLocalToIsoUtc = datetimeLocalToIsoUtcFromSamara;

/** Начальные поля формы: как backend default (14 суток от полуночи Самары), в datetime-local по Самаре. */
export function initialFormPeriodFromDefault(): { startLocal: string; endLocal: string } {
  const { period_start, period_end } = defaultPlanningPeriodSamara();
  return {
    startLocal: dateToDatetimeLocalValueSamara(new Date(period_start)),
    endLocal: dateToDatetimeLocalValueSamara(new Date(period_end)),
  };
}

/** Демо: интервал 7 суток вперёд от текущего момента (границы в UTC; в форме — время по Самаре). */
export function weekAheadFromNow(): { period_start: string; period_end: string } {
  const period_start = new Date();
  const period_end = new Date(period_start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    period_start: period_start.toISOString(),
    period_end: period_end.toISOString(),
  };
}

export function validatePeriodOrder(startIso: string, endIso: string): string | null {
  const a = new Date(startIso).getTime();
  const b = new Date(endIso).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return "Укажите корректные дату и время.";
  }
  if (b <= a) {
    return "Конец периода должен быть позже начала.";
  }
  return null;
}
