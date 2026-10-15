export const CURRENCY_CODE =
  process.env.NEXT_PUBLIC_CURRENCY_CODE?.trim().toUpperCase() || "XAF";

export const CURRENCY_LABEL =
  CURRENCY_CODE === "XAF" ? "FCFA" : CURRENCY_CODE;

const currencyFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: CURRENCY_CODE,
  maximumFractionDigits: 2,
});

export function formatCurrency(value: string | number): string {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) {
    throw new Error("Le montant à afficher est invalide.");
  }
  return currencyFormatter.format(amount);
}
