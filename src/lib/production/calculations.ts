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
  broomsProduced: number;
};

export type ProductionCosts = {
  materialCost: string;
  totalCost: string;
  costPerBroom: string;
};

export function calculateProductionCosts({
  materialUsedKg,
  materialCostPerKg,
  laborCost,
  energyCost,
  accessoriesCost,
  broomsProduced,
}: ProductionCostInputs): ProductionCosts {
  if (!Number.isSafeInteger(broomsProduced) || broomsProduced <= 0) {
    throw new Error("Le nombre de balais doit être un entier positif.");
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
  const costPerBroomCents =
    (totalCostCents + BigInt(Math.floor(broomsProduced / 2))) /
    BigInt(broomsProduced);

  return {
    materialCost: scaledIntegerToDecimal(materialCostCents, 2),
    totalCost: scaledIntegerToDecimal(totalCostCents, 2),
    costPerBroom: scaledIntegerToDecimal(costPerBroomCents, 2),
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
