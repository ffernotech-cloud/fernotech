import { z } from "zod";
import { calculateSalesOrderTotals } from "@/lib/sales/calculations";

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

const salesOrderLineSchema = z.object({
  productId: z.uuid("Sélectionnez un produit valide."),
  quantity: z
      .string()
      .trim()
      .regex(/^\d{1,8}$/, "Saisissez une quantité entière.")
      .transform(Number)
      .refine(
        (value) => Number.isSafeInteger(value) && value > 0,
        "La quantité doit être supérieure à 0.",
      ),
  unitPrice: positiveAmount,
});

export const createSalesOrderSchema = z
  .object({
    customerId: z.uuid("Sélectionnez un client valide."),
    orderDate: z.iso.date("Saisissez une date de commande valide."),
    lines: z
      .array(salesOrderLineSchema)
      .min(1, "Ajoutez au moins un produit à cette commande.")
      .max(20, "Une commande ne peut pas dépasser 20 lignes de produits."),
  })
  .superRefine((value, context) => {
    try {
      calculateSalesOrderTotals(value.lines);
    } catch (error) {
      context.addIssue({
        code: "custom",
        message:
          error instanceof Error
            ? error.message
            : "Le montant total de la commande est invalide.",
        path: ["lines"],
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
