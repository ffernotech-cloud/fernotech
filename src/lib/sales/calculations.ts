export type FinishedMovement = {
  movementType: "entree" | "sortie";
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
