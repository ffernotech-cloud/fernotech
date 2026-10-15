import { z } from "zod";

const optionalText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum, `Ce champ ne peut pas dépasser ${maximum} caractères.`)
    .transform((value) => value || null);

const positiveAmount = z
  .string()
  .trim()
  .regex(
    /^\d{1,12}(?:[.,]\d{1,2})?$/,
    "Saisissez un montant positif avec au maximum 2 décimales.",
  )
  .transform((value) => value.replace(",", "."))
  .refine((value) => Number(value) > 0, "Le montant doit être supérieur à 0.");

export const createCustomerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Le nom du client doit contenir au moins 2 caractères.")
    .max(120, "Le nom ne peut pas dépasser 120 caractères."),
  phone: optionalText(40),
  address: optionalText(200),
  notes: optionalText(1000),
});

export const createSalesOrderSchema = z
  .object({
    customerId: z.uuid("Sélectionnez un client valide."),
    orderDate: z.iso.date("Saisissez une date de commande valide."),
    quantity: z
      .string()
      .trim()
      .regex(/^\d{1,7}$/, "Saisissez une quantité entière de balais.")
      .transform(Number)
      .refine((value) => value > 0, "La quantité doit être supérieure à 0."),
    unitPrice: positiveAmount,
  })
  .superRefine((value, context) => {
    const [whole, fraction = ""] = value.unitPrice.split(".");
    const totalCents =
      BigInt(value.quantity) *
      (BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0")));
    if (totalCents > BigInt("99999999999999")) {
      context.addIssue({
        code: "custom",
        message:
          "Le montant total de la commande dépasse la limite autorisée.",
        path: ["quantity"],
      });
    }
  });

export const updateSalesOrderStatusSchema = z.object({
  orderId: z.uuid("Identifiant de commande invalide."),
  status: z.enum(["preparee", "livree", "annulee"]),
});

export const recordPaymentSchema = z.object({
  saleId: z.uuid("Identifiant de vente invalide."),
  amount: positiveAmount,
  method: z.enum(["especes", "mobile_money", "virement"], {
    error: "Sélectionnez un mode de règlement valide.",
  }),
  paidAt: z.iso.date("Saisissez une date de règlement valide."),
  reference: optionalText(120),
});

export type SalesActionState = {
  message?: string;
  error?: string;
};
