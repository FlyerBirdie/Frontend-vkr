/** Служебные строки от бэкенда — не показываем как содержательный текст отчёта. */
export function isScheduleReportStubText(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return true;
  if (t.includes("заглушк")) return true;
  if (/\bstub\b/i.test(text)) return true;
  return false;
}

export function filterStubReportLines(lines: readonly string[]): string[] {
  return lines.filter((line) => !isScheduleReportStubText(line));
}
