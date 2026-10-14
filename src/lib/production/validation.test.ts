import { describe, expect, it } from "vitest";
import { createProductionSchema } from "@/lib/production/validation";

const validProduction = {
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

describe("validation des ordres de fabrication", () => {
  it("accepte un bilan matière équilibré", () => {
    expect(createProductionSchema.safeParse(validProduction).success).toBe(
      true,
    );
  });

  it("refuse un nombre de balais nul ou non entier", () => {
    expect(
      createProductionSchema.safeParse({
        ...validProduction,
        broomsProduced: "0",
      }).success,
    ).toBe(false);
    expect(
      createProductionSchema.safeParse({
        ...validProduction,
        broomsProduced: "1.5",
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
});
