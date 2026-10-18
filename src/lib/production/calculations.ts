import type { availableMaterialKg } from "@/lib/sorting/calculations";

type MaterialMovement = Parameters<typeof availableMaterialKg>[0][number];

export type ProductionBalance = {
  materialUsedKg: string;
  bandsPreparedKg: string;
  lossKg: string;
};

function decimalToScaledInteger(value: string, scale: number): bigint {
  const [whole, fraction = ""] = value.replace(",", ".").split(".");
  return (
    BigInt(whole) * BigInt(10 ** scale) +
    BigInt(fraction.padEnd(scale, "0"))
  );
}

function scaledIntegerToDecimal(value: bigint, scale: number): string {
  const whole = value / BigInt(10 ** scale);
  const fraction = (value % BigInt(10 ** scale))
    .toString()
    .padStart(scale, "0");
  return `${whole}.${fraction}`;
}

export function sumProductionBandsKg(
  lines: ReadonlyArray<{ bandsPreparedKg: string }>,
): string {
  const totalMilliKg = lines.reduce(
    (sum, line) => sum + decimalToScaledInteger(line.bandsPreparedKg, 3),
    BigInt(0),
  );
  return scaledIntegerToDecimal(totalMilliKg, 3);
}

export function productionBalanceIsValid({
  materialUsedKg,
  bandsPreparedKg,
  lossKg,
}: ProductionBalance): boolean {
  return (
    decimalToScaledInteger(materialUsedKg, 3) ===
    decimalToScaledInteger(bandsPreparedKg, 3) +
      decimalToScaledInteger(lossKg, 3)
  );
}

export function productionLinesBalanceIsValid({
  materialUsedKg,
  lines,
  lossKg,
}: {
  materialUsedKg: string;
  lines: ReadonlyArray<{ bandsPreparedKg: string }>;
  lossKg: string;
}): boolean {
  const bandsMilliKg = lines.reduce(
    (sum, line) => sum + decimalToScaledInteger(line.bandsPreparedKg, 3),
    BigInt(0),
  );
  return (
    decimalToScaledInteger(materialUsedKg, 3) ===
    bandsMilliKg + decimalToScaledInteger(lossKg, 3)
  );
}

export function productionMaterialStockIsSufficient(
  movements: ReadonlyArray<MaterialMovement>,
  materialUsedKg: string,
): boolean {
  const balance = movements.reduce((total, movement) => {
    const quantity = decimalToScaledInteger(movement.quantityKg, 3);
    return movement.movementType === "sortie"
      ? total - quantity
      : total + quantity;
  }, BigInt(0));

  return balance >= decimalToScaledInteger(materialUsedKg, 3);
}

export type ProductionCostInputs = {
  materialUsedKg: string;
  materialCostPerKg: string;
  laborCost: string;
  energyCost: string;
  accessoriesCost: string;
  quantityProduced: number;
};

export type ProductionCosts = {
  materialCost: string;
  totalCost: string;
  costPerUnit: string;
};

export type ProductionCostAllocation = {
  materialCost: string;
  laborCost: string;
  energyCost: string;
  accessoriesCost: string;
};

export function productionCostTotals(
  lines: ReadonlyArray<ProductionCostAllocation>,
): ProductionCostAllocation {
  const categories = [
    "materialCost",
    "laborCost",
    "energyCost",
    "accessoriesCost",
  ] as const;
  return Object.fromEntries(
    categories.map((category) => [
      category,
      scaledIntegerToDecimal(
        lines.reduce(
          (sum, line) => sum + decimalToScaledInteger(line[category], 2),
          BigInt(0),
        ),
        2,
      ),
    ]),
  ) as ProductionCostAllocation;
}

export function productionCostAllocationMatches(
  totals: ProductionCostAllocation,
  lines: ReadonlyArray<ProductionCostAllocation>,
): boolean {
  const categories = [
    "materialCost",
    "laborCost",
    "energyCost",
    "accessoriesCost",
  ] as const;
  return categories.every((category) => {
    const allocatedCents = lines.reduce(
      (sum, line) => sum + decimalToScaledInteger(line[category], 2),
      BigInt(0),
    );
    return allocatedCents === decimalToScaledInteger(totals[category], 2);
  });
}

export function calculateProductionLineTotalCost(
  costs: ProductionCostAllocation,
): string {
  const totalCents =
    decimalToScaledInteger(costs.materialCost, 2) +
    decimalToScaledInteger(costs.laborCost, 2) +
    decimalToScaledInteger(costs.energyCost, 2) +
    decimalToScaledInteger(costs.accessoriesCost, 2);
  return scaledIntegerToDecimal(totalCents, 2);
}

export function calculateUnitProductionCost(
  totalCost: string,
  quantityProduced: number,
): string {
  if (!Number.isSafeInteger(quantityProduced) || quantityProduced <= 0) {
    throw new Error("La quantité produite doit être un entier positif.");
  }
  const totalCostCents = decimalToScaledInteger(totalCost, 2);
  const unitCostCents =
    (totalCostCents + BigInt(Math.floor(quantityProduced / 2))) /
    BigInt(quantityProduced);
  return scaledIntegerToDecimal(unitCostCents, 2);
}

export function calculateProductionCosts({
  materialUsedKg,
  materialCostPerKg,
  laborCost,
  energyCost,
  accessoriesCost,
  quantityProduced,
}: ProductionCostInputs): ProductionCosts {
  if (!Number.isSafeInteger(quantityProduced) || quantityProduced <= 0) {
    throw new Error("La quantité fabriquée doit être un entier positif.");
  }

  const materialCostCents =
    (decimalToScaledInteger(materialUsedKg, 3) *
      decimalToScaledInteger(materialCostPerKg, 2) +
      BigInt(500)) /
    BigInt(1000);
  const otherCostsCents =
    decimalToScaledInteger(laborCost, 2) +
    decimalToScaledInteger(energyCost, 2) +
    decimalToScaledInteger(accessoriesCost, 2);
  const totalCostCents = materialCostCents + otherCostsCents;
  return {
    materialCost: scaledIntegerToDecimal(materialCostCents, 2),
    totalCost: scaledIntegerToDecimal(totalCostCents, 2),
    costPerUnit: calculateUnitProductionCost(
      scaledIntegerToDecimal(totalCostCents, 2),
      quantityProduced,
    ),
  };
}

export function productionLossRate({
  materialUsedKg,
  lossKg,
}: Pick<ProductionBalance, "materialUsedKg" | "lossKg">): number {
  const usedMilliKg = decimalToScaledInteger(materialUsedKg, 3);
  if (usedMilliKg <= BigInt(0)) {
    return 0;
  }

  return (
    (Number(decimalToScaledInteger(lossKg, 3)) / Number(usedMilliKg)) *
    100
  );
}
