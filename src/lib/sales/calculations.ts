export type FinishedMovement = {
  movementType: "entree" | "sortie";
  quantity: number;
};

export type ProductFinishedMovement = FinishedMovement & {
  productId: string;
};

export type ProductQuantity = {
  productId: string;
  quantity: number;
};

export function availableFinishedProductStock(
  movements: ReadonlyArray<FinishedMovement>,
): number {
  const balance = movements.reduce(
    (total, movement) =>
      total +
      (movement.movementType === "entree"
        ? movement.quantity
        : -movement.quantity),
    0,
  );

  if (!Number.isSafeInteger(balance)) {
    throw new Error("Le solde du stock de produits finis est invalide.");
  }

  return balance;
}

export function finishedStockIsSufficient(
  movements: ReadonlyArray<FinishedMovement>,
  quantity: number,
): boolean {
  return (
    Number.isSafeInteger(quantity) &&
    quantity > 0 &&
    availableFinishedProductStock(movements) >= quantity
  );
}

export function finishedProductStockById(
  movements: ReadonlyArray<ProductFinishedMovement>,
): Map<string, number> {
  const balances = new Map<string, number>();
  for (const movement of movements) {
    const balance =
      (balances.get(movement.productId) ?? 0) +
      (movement.movementType === "entree"
        ? movement.quantity
        : -movement.quantity);
    if (!Number.isSafeInteger(balance)) {
      throw new Error("Le solde du stock de produits finis est invalide.");
    }
    balances.set(movement.productId, balance);
  }
  return balances;
}

export function finishedProductsAreSufficient(
  movements: ReadonlyArray<ProductFinishedMovement>,
  requiredProducts: ReadonlyArray<ProductQuantity>,
): boolean {
  const balances = finishedProductStockById(movements);
  return requiredProducts.every(
    ({ productId, quantity }) =>
      Number.isSafeInteger(quantity) &&
      quantity > 0 &&
      (balances.get(productId) ?? 0) >= quantity,
  );
}

export function outstandingReceivable(
  totalAmount: string,
  payments: ReadonlyArray<string>,
): string {
  const remaining = amountToCents(totalAmount) -
    payments.reduce(
      (sum, value) => sum + amountToCents(value),
      BigInt(0),
    );

  if (remaining < BigInt(0)) {
    throw new Error("Les règlements dépassent le montant de la vente.");
  }

  const whole = remaining / BigInt(100);
  const fraction = (remaining % BigInt(100)).toString().padStart(2, "0");
  return `${whole}.${fraction}`;
}

function amountToCents(value: string): bigint {
  const [whole, fraction = ""] = value.replace(",", ".").split(".");
  return BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
}

export function paymentFitsReceivable(
  totalAmount: string,
  existingPayments: ReadonlyArray<string>,
  paymentAmount: string,
): boolean {
  return amountToCents(paymentAmount) <=
    amountToCents(outstandingReceivable(totalAmount, existingPayments));
}

export function calculateSalesTotal(
  quantity: number,
  unitPrice: string,
): string {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new Error("La quantité doit être un entier positif.");
  }

  const total = BigInt(quantity) * amountToCents(unitPrice);
  const whole = total / BigInt(100);
  const fraction = (total % BigInt(100)).toString().padStart(2, "0");
  return `${whole}.${fraction}`;
}

export type SalesOrderTotals = {
  quantity: number;
  totalAmount: string;
  averageUnitPrice: string;
};

export function calculateSalesOrderTotals(
  lines: ReadonlyArray<{ quantity: number; unitPrice: string }>,
): SalesOrderTotals {
  const quantity = lines.reduce((sum, line) => sum + line.quantity, 0);
  if (
    lines.length === 0 ||
    !Number.isSafeInteger(quantity) ||
    quantity <= 0
  ) {
    throw new Error("La commande doit contenir des quantités positives.");
  }

  const totalCents = lines.reduce(
    (sum, line) =>
      sum + BigInt(line.quantity) * amountToCents(line.unitPrice),
    BigInt(0),
  );
  const maximumCents = BigInt("99999999999999");
  if (totalCents > maximumCents) {
    throw new Error("Le montant total de la commande dépasse la limite autorisée.");
  }
  const averageUnitPriceCents =
    (totalCents + BigInt(Math.floor(quantity / 2))) / BigInt(quantity);

  return {
    quantity,
    totalAmount: centsToAmount(totalCents),
    averageUnitPrice: centsToAmount(averageUnitPriceCents),
  };
}

function centsToAmount(value: bigint): string {
  const whole = value / BigInt(100);
  const fraction = (value % BigInt(100)).toString().padStart(2, "0");
  return `${whole}.${fraction}`;
}
