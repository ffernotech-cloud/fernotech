export type CollectorDeliveryTotals = {
  receivedKg: number;
  acceptedKg: number;
};

export function acceptanceRate({
  receivedKg,
  acceptedKg,
}: CollectorDeliveryTotals): number {
  if (receivedKg <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, (acceptedKg / receivedKg) * 100));
}

export function kilogramsLabel(kilograms: number): string {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 3,
  }).format(kilograms);
}
