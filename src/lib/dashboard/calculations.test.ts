import { describe, expect, it } from "vitest";
import {
  calculateAverageProductionCostPerBroom,
  calculateEstimatedSalesMargin,
  calculateOutstandingReceivables,
  calculateProductSummaries,
  kilogramsToTonnes,
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

  it("converts kilograms to tonnes accurately", () => {
    expect(kilogramsToTonnes("1000")).toBe("1.000");
    expect(kilogramsToTonnes("1500.500")).toBe("1.501");
    expect(kilogramsToTonnes(250)).toBe("0.250");
  });

  it("calculates multi-product summaries with unit costs and current stock", () => {
    const summaries = calculateProductSummaries([
      {
        product: {
          id: "p1",
          code: "BALAI",
          name: "Balai standard",
          unitLabel: "balai",
          isActive: true,
        },
        producedQuantity: 10,
        producedCost: "5000.00",
        soldQuantity: 4,
        revenue: "3000.00",
        currentStock: 6,
        historicalProductionCost: "4000.00",
        historicalProducedQuantity: 8,
      },
      {
        product: {
          id: "p2",
          code: "BROSSE",
          name: "Brosse à laver",
          unitLabel: "brosse",
          isActive: true,
        },
        producedQuantity: 2,
        producedCost: "800.00",
        soldQuantity: 1,
        revenue: "700.00",
        currentStock: 1,
        historicalProductionCost: "600.00",
        historicalProducedQuantity: 2,
      },
      {
        product: {
          id: "p3",
          code: "PAVE",
          name: "Pavé",
          unitLabel: "unité",
          isActive: false,
        },
        producedQuantity: 0,
        producedCost: "0.00",
        soldQuantity: 1,
        revenue: "100.00",
        currentStock: 0,
        historicalProductionCost: "0.00",
        historicalProducedQuantity: 0,
      },
    ]);

    expect(summaries[0].averageProductionCost).toBe("500.00");
    expect(summaries[0].estimatedMargin).toBe("1000.00");
    expect(summaries[0].currentStock).toBe(6);
    expect(summaries[1].averageProductionCost).toBe("400.00");
    expect(summaries[1].estimatedMargin).toBe("400.00");
    expect(summaries[2].averageProductionCost).toBeNull();
    expect(summaries[2].estimatedMargin).toBeNull();
  });
});
