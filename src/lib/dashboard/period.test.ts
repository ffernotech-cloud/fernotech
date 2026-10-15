import { describe, expect, it } from "vitest";
import { resolveDashboardPeriod } from "./period";

describe("resolveDashboardPeriod", () => {
  it("defaults to the current month in the business timezone", () => {
    expect(
      resolveDashboardPeriod({}, new Date("2026-02-28T22:30:00.000Z")),
    ).toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
      error: null,
    });
  });

  it("accepts valid inclusive date ranges", () => {
    expect(
      resolveDashboardPeriod({
        from: "2026-02-03",
        to: "2026-02-28",
      }),
    ).toEqual({ from: "2026-02-03", to: "2026-02-28", error: null });
  });

  it("shows an error and falls back to the current month for invalid dates", () => {
    expect(
      resolveDashboardPeriod(
        { from: "2026-02-30", to: "2026-03-01" },
        new Date("2026-03-03T12:00:00.000Z"),
      ),
    ).toMatchObject({
      from: "2026-03-01",
      to: "2026-03-03",
      error: expect.any(String),
    });
  });

  it("rejects an end date before the start date", () => {
    expect(
      resolveDashboardPeriod({
        from: "2026-03-02",
        to: "2026-03-01",
      }).error,
    ).toBe("La date de début doit précéder ou égaler la date de fin.");
  });
});
