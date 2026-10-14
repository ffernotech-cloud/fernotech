import { z } from "zod";

const kilograms = z
  .string()
  .trim()
  .regex(
    /^\d{1,7}(?:[.,]\d{1,3})?$/,
    "Saisissez un poids avec au maximum 3 décimales.",
  )
  .transform((value) => value.replace(",", "."));

const nonNegativeCost = z
  .string()
  .trim()
  .regex(
    /^\d{1,12}(?:[.,]\d{1,2})?$/,
    "Saisissez un coût positif ou nul avec au maximum 2 décimales.",
  )
  .transform((value) => value.replace(",", "."));

export const createProductionSchema = z
  .object({
    productionDate: z.iso.date("Saisissez une date de production valide."),
    plasticType: z
      .string()
      .trim()
      .min(2, "Sélectionnez un type de plastique.")
      .max(80, "Le type de plastique ne peut pas dépasser 80 caractères."),
    materialUsedKg: kilograms.refine(
      (value) => Number(value) > 0,
      "Le poids utilisé doit être supérieur à 0.",
    ),
    bandsPreparedKg: kilograms,
    broomsProduced: z
      .string()
      .trim()
      .regex(/^\d{1,7}$/, "Saisissez un nombre entier de balais.")
      .transform(Number)
      .refine((value) => value > 0, "Fabriquez au moins un balai."),
    lossKg: kilograms,
    lossReason: z
      .string()
      .trim()
      .max(1000, "Le motif ne peut pas dépasser 1 000 caractères.")
      .transform((value) => value || null),
    materialCostPerKg: nonNegativeCost,
    laborCost: nonNegativeCost,
    energyCost: nonNegativeCost,
    accessoriesCost: nonNegativeCost,
  })
  .superRefine((value, context) => {
    if (Number(value.lossKg) > 0 && !value.lossReason) {
      context.addIssue({
        code: "custom",
        message: "Indiquez le motif des pertes de matière.",
        path: ["lossReason"],
      });
    }
  });

export type ProductionActionState = {
  message?: string;
  error?: string;
};
