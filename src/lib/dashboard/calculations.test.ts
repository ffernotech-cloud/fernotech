import { describe, expect, it } from "vitest";
import {
  calculateAverageProductionCostPerBroom,
  calculateEstimatedSalesMargin,
  calculateOutstandingReceivables,
  sumAmounts,
  sumKilograms,
} from "./calculations";

describe("dashboard calculations", () => {
  it("sums monetary values without floating-point rounding", () => {
    expect(sumAmounts(["1200.10", "0.20", "0.70"])).toBe("1201.00");
  });

  it("sums kilogram values to the nearest gram", () => {
    expect(sumKilograms(["12.500", "0.001", "1"])).toBe("13.501");
  });

  it("calculates the weighted average production cost per broom", () => {
    expect(calculateAverageProductionCostPerBroom("1250.00", 4)).toBe(
      "312.50",
    );
    expect(calculateAverageProductionCostPerBroom("0.00", 0)).toBeNull();
  });

  it("estimates margin using the historical production unit cost", () => {
    expect(
      calculateEstimatedSalesMargin("1000.00", 3, "1200.00", 4),
    ).toBe("100.00");
    expect(
      calculateEstimatedSalesMargin("1000.00", 3, "0.00", 0),
    ).toBeNull();
  });

  it("sums outstanding balances across all sales", () => {
    expect(
      calculateOutstandingReceivables([
        { totalAmount: "1200.00", paidAmount: "500.00" },
        { totalAmount: "800.00", paidAmount: "0.00" },
      ]),
    ).toBe("1500.00");
  });

  it("rejects payments exceeding a sale total", () => {
    expect(() =>
      calculateOutstandingReceivables([
        { totalAmount: "100.00", paidAmount: "100.01" },
      ]),
    ).toThrow("Les règlements dépassent le montant d’une vente.");
  });
});
