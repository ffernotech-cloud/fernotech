import { z } from "zod";

const kilograms = z
  .string()
  .trim()
  .regex(
    /^\d{1,7}(?:[.,]\d{1,3})?$/,
    "Saisissez un poids positif ou nul avec au maximum 3 décimales.",
  )
  .transform((value) => value.replace(",", "."));

export const sortDeliverySchema = z.object({
  deliveryId: z.uuid("Identifiant de l’apport invalide."),
  acceptedKg: kilograms,
  rejectedKg: kilograms,
  rejectionReason: z
    .string()
    .trim()
    .max(1000, "Le motif ne peut pas dépasser 1 000 caractères.")
    .transform((value) => value || null),
}).superRefine((value, context) => {
  if (Number(value.rejectedKg) > 0 && !value.rejectionReason) {
    context.addIssue({
      code: "custom",
      message: "Indiquez le motif lorsque des kilos sont rejetés.",
      path: ["rejectionReason"],
    });
  }
});

export const integrateDeliverySchema = z.object({
  deliveryId: z.uuid("Identifiant de l’apport invalide."),
});

export type SortingActionState = {
  message?: string;
  error?: string;
};
