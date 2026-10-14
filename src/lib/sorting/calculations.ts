export type SortingWeights = {
  receivedKg: string;
  acceptedKg: string;
  rejectedKg: string;
};

function kilogramsToMilliKg(kilograms: string): bigint {
  const [whole, fraction = ""] = kilograms.replace(",", ".").split(".");
  return BigInt(whole) * BigInt(1000) + BigInt(fraction.padEnd(3, "0"));
}

export function sortingBalanceIsValid({
  receivedKg,
  acceptedKg,
  rejectedKg,
}: SortingWeights): boolean {
  return (
    kilogramsToMilliKg(receivedKg) ===
    kilogramsToMilliKg(acceptedKg) + kilogramsToMilliKg(rejectedKg)
  );
}

export function availableMaterialKg(
  movements: ReadonlyArray<{
    movementType: "entree" | "sortie";
    quantityKg: string;
  }>,
): number {
  const balance = movements.reduce((total, movement) => {
    const quantity = Number(movement.quantityKg);
    if (!Number.isFinite(quantity) || quantity < 0) {
      throw new Error("Un mouvement de stock contient un poids invalide.");
    }

    if (movement.movementType === "sortie") {
      return total - quantity;
    }
    return total + quantity;
  }, 0);

  return Math.round((balance + Number.EPSILON) * 1000) / 1000;
}
