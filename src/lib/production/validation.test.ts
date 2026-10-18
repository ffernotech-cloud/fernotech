import { describe, expect, it } from "vitest";
import {
  createOfflineProductionSchema,
  createProductionSchema,
} from "@/lib/production/validation";

const validProduction = {
  productionDate: "2026-10-15",
  plasticType: "PET",
  materialUsedKg: "15",
  lossKg: "2.5",
  lossReason: "Chutes de découpe",
  materialCostPerKg: "500",
  lines: [
    {
      technicalSpecId: "11111111-1111-4111-8111-111111111111",
      quantityProduced: "10",
      bandsPreparedKg: "12.5",
      materialCost: "7500",
      laborCost: "5000",
      energyCost: "1000",
      accessoriesCost: "2500",
    },
  ],
};

const validOfflineProduction = {
  productionDate: "2026-10-15",
  plasticType: "PET",
  materialUsedKg: "15",
  bandsPreparedKg: "12.5",
  broomsProduced: "10",
  lossKg: "2.5",
  lossReason: "Chutes de découpe",
  materialCostPerKg: "500",
  laborCost: "5000",
  energyCost: "1000",
  accessoriesCost: "2500",
};

describe("validation des ordres de fabrication multi-produits", () => {
  it("accepte plusieurs lignes dont le bilan matière est équilibré", () => {
    expect(
      createProductionSchema.safeParse({
        ...validProduction,
        lines: [
          validProduction.lines[0],
          {
            ...validProduction.lines[0],
            technicalSpecId: "22222222-2222-4222-8222-222222222222",
            quantityProduced: "4",
            bandsPreparedKg: "0",
            materialCost: "0",
            laborCost: "0",
            energyCost: "0",
            accessoriesCost: "0",
          },
        ],
      }).success,
    ).toBe(true);
  });

  it("refuse une ligne dont la quantité est nulle ou non entière", () => {
    expect(
      createProductionSchema.safeParse({
        ...validProduction,
        lines: [
          { ...validProduction.lines[0], quantityProduced: "0" },
        ],
      }).success,
    ).toBe(false);
    expect(
      createProductionSchema.safeParse({
        ...validProduction,
        lines: [
          { ...validProduction.lines[0], quantityProduced: "1.5" },
        ],
      }).success,
    ).toBe(false);
  });

  it("exige un motif lorsque la production comporte des pertes", () => {
    expect(
      createProductionSchema.safeParse({
        ...validProduction,
        lossReason: "",
      }).success,
    ).toBe(false);
  });

  it("vérifie la ventilation du coût matière calculé par ligne", () => {
    expect(
      createProductionSchema.safeParse({
        ...validProduction,
        lines: [
          { ...validProduction.lines[0], materialCost: "6249.99" },
        ],
      }).success,
    ).toBe(false);
  });

  it("conserve la validation legacy des fabrications hors ligne mono-Balai", () => {
    expect(
      createOfflineProductionSchema.safeParse(validOfflineProduction).success,
    ).toBe(true);
    expect(
      createOfflineProductionSchema.safeParse({
        ...validOfflineProduction,
        bandsPreparedKg: "12.501",
      }).success,
    ).toBe(false);
  });
});
