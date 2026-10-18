import { z } from "zod";
import {
  calculateProductionCosts,
  productionBalanceIsValid,
  productionCostAllocationMatches,
  productionCostTotals,
  productionLinesBalanceIsValid,
} from "@/lib/production/calculations";

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

const productionHeaderFields = {
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
  lossKg: kilograms,
  lossReason: z
    .string()
    .trim()
    .max(1000, "Le motif ne peut pas dépasser 1 000 caractères.")
    .transform((value) => value || null),
  materialCostPerKg: nonNegativeCost,
};

const productionLineSchema = z.object({
  technicalSpecId: z.uuid("Sélectionnez une fiche technique valide."),
  quantityProduced: z
    .string()
    .trim()
    .regex(/^\d{1,7}$/, "Saisissez une quantité entière.")
    .transform(Number)
    .refine(
      (value) => Number.isSafeInteger(value) && value > 0,
      "La quantité produite doit être positive.",
    ),
  bandsPreparedKg: kilograms,
  materialCost: nonNegativeCost,
  laborCost: nonNegativeCost,
  energyCost: nonNegativeCost,
  accessoriesCost: nonNegativeCost,
});

export const createProductionSchema = z
  .object({
    ...productionHeaderFields,
    lines: z
      .array(productionLineSchema)
      .min(1, "Ajoutez au moins un produit à cette fabrication.")
      .max(20, "Un ordre ne peut pas dépasser 20 lignes de produits."),
  })
  .superRefine((value, context) => {
    if (Number(value.lossKg) > 0 && !value.lossReason) {
      context.addIssue({
        code: "custom",
        message: "Indiquez le motif des pertes de matière.",
        path: ["lossReason"],
      });
    }

    if (
      !productionLinesBalanceIsValid({
        materialUsedKg: value.materialUsedKg,
        lines: value.lines,
        lossKg: value.lossKg,
      })
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Le poids utilisé doit être égal aux bandes des lignes plus les pertes.",
        path: ["lines"],
      });
    }

    const totalQuantity = value.lines.reduce(
      (total, line) => total + line.quantityProduced,
      0,
    );
    if (!Number.isSafeInteger(totalQuantity) || totalQuantity <= 0) {
      context.addIssue({
        code: "custom",
        message: "La quantité totale produite dépasse la limite autorisée.",
        path: ["lines"],
      });
      return;
    }

    const allocatedCosts = productionCostTotals(value.lines);
    const totalCosts = calculateProductionCosts({
      materialUsedKg: value.materialUsedKg,
      materialCostPerKg: value.materialCostPerKg,
      laborCost: allocatedCosts.laborCost,
      energyCost: allocatedCosts.energyCost,
      accessoriesCost: allocatedCosts.accessoriesCost,
      quantityProduced: totalQuantity,
    });
    if (
      !productionCostAllocationMatches(
        {
          ...allocatedCosts,
          materialCost: totalCosts.materialCost,
        },
        value.lines,
      )
    ) {
      context.addIssue({
        code: "custom",
        message:
          "La ventilation des coûts par produit doit égaler chaque total de l’ordre.",
        path: ["lines"],
      });
    }
  });

export const createOfflineProductionSchema = z
  .object({
    ...productionHeaderFields,
    bandsPreparedKg: kilograms,
    broomsProduced: z
      .string()
      .trim()
      .regex(/^\d{1,7}$/, "Saisissez un nombre entier de balais.")
      .transform(Number)
      .refine((value) => value > 0, "Fabriquez au moins un balai."),
    laborCost: nonNegativeCost,
    energyCost: nonNegativeCost,
    accessoriesCost: nonNegativeCost,
  })
  .superRefine((value, context) => {
    const totalQuantity = value.broomsProduced;
    if (Number(value.lossKg) > 0 && !value.lossReason) {
      context.addIssue({
        code: "custom",
        message: "Indiquez le motif des pertes de matière.",
        path: ["lossReason"],
      });
    }
    if (!productionBalanceIsValid(value)) {
      context.addIssue({
        code: "custom",
        message: "Le bilan matière de cette fabrication n’est pas équilibré.",
        path: ["bandsPreparedKg"],
      });
    }
    if (!Number.isSafeInteger(totalQuantity) || totalQuantity <= 0) {
      context.addIssue({
        code: "custom",
        message: "Fabriquez au moins un balai.",
        path: ["broomsProduced"],
      });
    }
  });

export type ProductionActionState = {
  message?: string;
  error?: string;
};
