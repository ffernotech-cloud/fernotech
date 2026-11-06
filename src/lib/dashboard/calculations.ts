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

export function kilogramsToTonnes(kilograms: string | number): string {
  const normalized =
    typeof kilograms === "string"
      ? kilograms.replace(",", ".")
      : String(kilograms);
  const match = /^(\d+)(?:\.(\d+))?$/.exec(normalized);
  if (!match) {
    throw new Error("Un poids en kilogrammes est invalide.");
  }
  const wholeKg = BigInt(match[1]);
  const fractionStr = (match[2] ?? "").padEnd(3, "0").slice(0, 3);
  const grams = BigInt(fractionStr);
  const subGram = (match[2] ?? "").slice(3);
  const roundGram =
    subGram.length > 0 && Number(subGram[0]) >= 5 ? BigInt(1) : BigInt(0);
  const totalGrams = grams + roundGram;
  const roundedKg =
    wholeKg + (totalGrams >= BigInt(500) ? BigInt(1) : BigInt(0));
  const wholeTonnes = roundedKg / BigInt(1000);
  const fractionTonnes = (roundedKg % BigInt(1000)).toString().padStart(3, "0");
  return `${wholeTonnes}.${fractionTonnes}`;
}

export function calculateAverageUnitProductionCost(
  totalCost: string,
  quantityProduced: number,
): string | null {
  assertNonNegativeCount(quantityProduced, "La quantité fabriquée");
  if (quantityProduced === 0) {
    return null;
  }

  const totalCents = amountToCents(totalCost);
  const averageCents =
    (totalCents + BigInt(Math.floor(quantityProduced / 2))) /
    BigInt(quantityProduced);
  return centsToAmount(averageCents);
}

export function calculateAverageProductionCostPerBroom(
  totalCost: string,
  broomsProduced: number,
): string | null {
  return calculateAverageUnitProductionCost(totalCost, broomsProduced);
}

export type ProductSummaryInput = {
  product: {
    id: string;
    code: string;
    name: string;
    unitLabel: string;
    isActive: boolean;
  };
  producedQuantity: number;
  producedCost: string;
  soldQuantity: number;
  revenue: string;
  currentStock: number;
  historicalProductionCost: string;
  historicalProducedQuantity: number;
};

export type ProductDashboardSummary = {
  productId: string;
  productCode: string;
  productName: string;
  unitLabel: string;
  isActive: boolean;
  quantityProduced: number;
  productionCost: string;
  averageProductionCost: string | null;
  quantitySold: number;
  revenue: string;
  estimatedMargin: string | null;
  currentStock: number;
};

export function calculateProductSummaries(
  inputs: ReadonlyArray<ProductSummaryInput>,
): ProductDashboardSummary[] {
  return inputs.map((item) => ({
    productId: item.product.id,
    productCode: item.product.code,
    productName: item.product.name,
    unitLabel: item.product.unitLabel,
    isActive: item.product.isActive,
    quantityProduced: item.producedQuantity,
    productionCost: item.producedCost,
    averageProductionCost: calculateAverageUnitProductionCost(
      item.producedCost,
      item.producedQuantity,
    ),
    quantitySold: item.soldQuantity,
    revenue: item.revenue,
    estimatedMargin: calculateEstimatedSalesMargin(
      item.revenue,
      item.soldQuantity,
      item.historicalProductionCost,
      item.historicalProducedQuantity,
    ),
    currentStock: item.currentStock,
  }));
}

export function calculateEstimatedSalesMargin(
  revenue: string,
  unitsSold: number,
  historicalProductionCost: string,
  historicalUnitsProduced: number,
): string | null {
  assertNonNegativeCount(unitsSold, "La quantité vendue");
  assertNonNegativeCount(
    historicalUnitsProduced,
    "La quantité historiquement fabriquée",
  );
  if (historicalUnitsProduced === 0) {
    return null;
  }

  const estimatedCostOfSoldUnits =
    (amountToCents(historicalProductionCost) * BigInt(unitsSold) +
      BigInt(Math.floor(historicalUnitsProduced / 2))) /
    BigInt(historicalUnitsProduced);
  return centsToAmount(amountToCents(revenue) - estimatedCostOfSoldUnits);
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
