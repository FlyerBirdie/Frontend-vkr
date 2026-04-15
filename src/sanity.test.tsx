import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { formatFastApiDetail, parseFastApiErrorMessageFromJsonBody } from "./fastApiError";
import { validatePeriodOrder } from "./planningPeriod";

describe("MVP helpers", () => {
  it("parses FastAPI JSON body: validation detail[] and planning_validation_failed", () => {
    const validation422 = JSON.stringify({
      detail: [
        {
          type: "value_error",
          loc: ["body", "period_end"],
          msg: "period_end должен быть позже period_start.",
        },
      ],
    });
    expect(parseFastApiErrorMessageFromJsonBody(validation422)).toContain("period_end");
    expect(parseFastApiErrorMessageFromJsonBody(validation422)).toContain("period_start");

    const planningFailed = JSON.stringify({
      detail: {
        error: "planning_validation_failed",
        errors: [
          {
            level: "error",
            code: "TASK_X",
            message: "Нет подходящего исполнителя",
          },
        ],
        report_summary: "Проверка данных не пройдена",
      },
    });
    const human = parseFastApiErrorMessageFromJsonBody(planningFailed);
    expect(human).toContain("Проверка данных не пройдена");
    expect(human).toContain("Нет подходящего исполнителя");

    const conflictBody = JSON.stringify({
      detail: { code: "WORKER_IN_USE", message: "Нельзя удалить рабочего" },
    });
    expect(parseFastApiErrorMessageFromJsonBody(conflictBody)).toContain("Нельзя удалить");
    expect(formatFastApiDetail({ code: "X", message: "Y" })).toContain("Y");
  });

  it("validates period order; @testing-library/react is wired", () => {
    expect(
      validatePeriodOrder("2025-06-02T00:00:00.000Z", "2025-06-01T00:00:00.000Z"),
    ).toMatch(/позже/);

    render(
      <span role="status" aria-label="test-label">
        ok
      </span>,
    );
    expect(screen.getByRole("status", { name: "test-label" }).textContent).toBe("ok");
  });
});
