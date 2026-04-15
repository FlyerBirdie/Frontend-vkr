import { describe, expect, it } from "vitest";
import { datetimeLocalToIsoUtcFromSamara, defaultPlanningPeriodSamara } from "./samaraTime";

describe("samaraTime", () => {
  it("datetimeLocalToIsoUtcFromSamara: morning Samara → UTC", () => {
    expect(datetimeLocalToIsoUtcFromSamara("2026-06-01T08:30")).toBe("2026-06-01T04:30:00.000Z");
  });

  it("defaultPlanningPeriodSamara returns parseable ISO pair", () => {
    const p = defaultPlanningPeriodSamara();
    expect(p.period_start).toMatch(/T/);
    expect(p.period_end).toMatch(/T/);
    expect(new Date(p.period_end).getTime()).toBeGreaterThan(new Date(p.period_start).getTime());
  });
});
