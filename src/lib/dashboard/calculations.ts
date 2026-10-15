function amountToCents(value: string): bigint {
  const normalized = value.replace(",", ".");
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) {
    throw new Error("Un montant du tableau de bord est invalide.");
  }

  return BigInt(match[1]) * BigInt(100) +
    BigInt((match[2] ?? "").padEnd(2, "0"));
}

function centsToAmount(value: bigint): string {
  const sign = value < BigInt(0) ? "-" : "";
  const absoluteValue = value < BigInt(0) ? -value : value;
  const whole = absoluteValue / BigInt(100);
  const fraction = (absoluteValue % BigInt(100)).toString().padStart(2, "0");
  return `${sign}${whole}.${fraction}`;
}

function assertNonNegativeCount(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} doit être un entier positif ou nul.`);
  }
}

export function sumAmounts(values: ReadonlyArray<string>): string {
  const total = values.reduce(
    (sum, value) => sum + amountToCents(value),
    BigInt(0),
  );
  return centsToAmount(total);
}

export function sumKilograms(values: ReadonlyArray<string>): string {
  const milliKilograms = values.reduce((total, value) => {
    const normalized = value.replace(",", ".");
    const match = /^(\d+)(?:\.(\d{1,3}))?$/.exec(normalized);
    if (!match) {
      throw new Error("Un poids du tableau de bord est invalide.");
    }
    return (
      total +
      BigInt(match[1]) * BigInt(1000) +
      BigInt((match[2] ?? "").padEnd(3, "0"))
    );
  }, BigInt(0));

  const whole = milliKilograms / BigInt(1000);
  const fraction = (milliKilograms % BigInt(1000))
    .toString()
    .padStart(3, "0");
  return `${whole}.${fraction}`;
}

export function calculateAverageProductionCostPerBroom(
  totalCost: string,
  broomsProduced: number,
): string | null {
  assertNonNegativeCount(broomsProduced, "Le nombre de balais fabriqués");
  if (broomsProduced === 0) {
    return null;
  }

  const totalCents = amountToCents(totalCost);
  const averageCents =
    (totalCents + BigInt(Math.floor(broomsProduced / 2))) /
    BigInt(broomsProduced);
  return centsToAmount(averageCents);
}

export function calculateEstimatedSalesMargin(
  revenue: string,
  broomsSold: number,
  historicalProductionCost: string,
  historicalBroomsProduced: number,
): string | null {
  assertNonNegativeCount(broomsSold, "Le nombre de balais vendus");
  assertNonNegativeCount(
    historicalBroomsProduced,
    "Le nombre de balais fabriqués",
  );
  if (historicalBroomsProduced === 0) {
    return null;
  }

  const costOfSoldBrooms =
    (amountToCents(historicalProductionCost) * BigInt(broomsSold) +
      BigInt(Math.floor(historicalBroomsProduced / 2))) /
    BigInt(historicalBroomsProduced);
  return centsToAmount(amountToCents(revenue) - costOfSoldBrooms);
}

export function calculateOutstandingReceivables(
  sales: ReadonlyArray<{ totalAmount: string; paidAmount: string }>,
): string {
  const amount = sales.reduce((total, sale) => {
    const balance =
      amountToCents(sale.totalAmount) - amountToCents(sale.paidAmount);
    if (balance < BigInt(0)) {
      throw new Error("Les règlements dépassent le montant d’une vente.");
    }
    return total + balance;
  }, BigInt(0));

  return centsToAmount(amount);
}
