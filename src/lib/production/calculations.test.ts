import { describe, expect, it } from "vitest";
import {
  calculateProductionCosts,
  calculateProductionLineTotalCost,
  calculateUnitProductionCost,
  productionBalanceIsValid,
  productionCostTotals,
  productionLinesBalanceIsValid,
  productionLossRate,
  productionMaterialStockIsSufficient,
} from "@/lib/production/calculations";

describe("calculs de production", () => {
  it("valide le bilan matière au gramme près", () => {
    expect(
      productionBalanceIsValid({
        materialUsedKg: "15",
        bandsPreparedKg: "12.5",
        lossKg: "2.5",
      }),
    ).toBe(true);
    expect(
      productionBalanceIsValid({
        materialUsedKg: "15",
        bandsPreparedKg: "12.501",
        lossKg: "2.5",
      }),
    ).toBe(false);
  });

  it("additionne les bandes et le bilan de toutes les lignes", () => {
    const lines = [
      { bandsPreparedKg: "8.125" },
      { bandsPreparedKg: "4.375" },
    ];
    expect(
      productionLinesBalanceIsValid({
        materialUsedKg: "15",
        lines,
        lossKg: "2.5",
      }),
    ).toBe(true);
  });

  it("bloque une production qui dépasse le stock calculé par mouvements", () => {
    const movements = [
      { movementType: "entree" as const, quantityKg: "15.000" },
      { movementType: "sortie" as const, quantityKg: "2.500" },
    ];

    expect(productionMaterialStockIsSufficient(movements, "12.5")).toBe(true);
    expect(productionMaterialStockIsSufficient(movements, "12.501")).toBe(
      false,
    );
  });

  it("calcule le coût matière, les autres coûts et le coût unitaire", () => {
    expect(
      calculateProductionCosts({
        materialUsedKg: "12.5",
        materialCostPerKg: "500",
        laborCost: "5000",
        energyCost: "1000",
        accessoriesCost: "2500",
        quantityProduced: 10,
      }),
    ).toEqual({
      materialCost: "6250.00",
      totalCost: "14750.00",
      costPerUnit: "1475.00",
    });
  });

  it("arrondit les coûts au centime sans erreurs de flottants", () => {
    expect(
      calculateProductionCosts({
        materialUsedKg: "0.001",
        materialCostPerKg: "125",
        laborCost: "0.01",
        energyCost: "0",
        accessoriesCost: "0",
        quantityProduced: 1,
      }),
    ).toEqual({
      materialCost: "0.13",
      totalCost: "0.14",
      costPerUnit: "0.14",
    });

  });

  it("additionne et calcule le coût unitaire par ligne de produit", () => {
    const lines = [
      {
        materialCost: "100.25",
        laborCost: "50",
        energyCost: "10",
        accessoriesCost: "25",
      },
      {
        materialCost: "200.25",
        laborCost: "75",
        energyCost: "20",
        accessoriesCost: "30",
      },
    ];
    expect(productionCostTotals(lines)).toEqual({
      materialCost: "300.50",
      laborCost: "125.00",
      energyCost: "30.00",
      accessoriesCost: "55.00",
    });
    expect(calculateProductionLineTotalCost(lines[0])).toBe("185.25");
    expect(calculateUnitProductionCost("185.25", 3)).toBe("61.75");
  });

  it("calcule le taux de perte", () => {
    expect(
      productionLossRate({ materialUsedKg: "15", lossKg: "2.5" }),
    ).toBeCloseTo(16.6667, 3);
  });
});
