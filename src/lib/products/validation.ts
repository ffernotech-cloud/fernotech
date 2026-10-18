import { z } from "zod";

const optionalText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum, `Ce champ ne peut pas dépasser ${maximum} caractères.`)
    .transform((value) => value || null);

const optionalNonNegativeInteger = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : Number(value)))
  .refine(
    (value) =>
      value === null || (Number.isSafeInteger(value) && value >= 0),
    "Le seuil doit être un nombre entier positif ou nul.",
  );

const optionalPositiveDecimal = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value.replace(",", ".")))
  .refine(
    (value) =>
      value === null ||
      (/^\d{1,7}(?:\.\d{1,3})?$/.test(value) && Number(value) > 0),
    "Saisissez un poids supérieur à 0 avec au maximum 3 décimales.",
  );

const productFields = {
  name: z
    .string()
    .trim()
    .min(2, "Le nom du produit doit contenir au moins 2 caractères.")
    .max(120, "Le nom du produit ne peut pas dépasser 120 caractères."),
  description: optionalText(2000),
  unitLabel: z
    .string()
    .trim()
    .min(1, "L’unité de vente est obligatoire.")
    .max(40, "L’unité ne peut pas dépasser 40 caractères."),
  alertThreshold: optionalNonNegativeInteger,
};

export const createProductSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[A-Z0-9][A-Z0-9_-]{1,39}$/,
      "Le code doit contenir 2 à 40 lettres majuscules, chiffres, tirets ou tirets bas.",
    ),
  ...productFields,
});

export const updateProductSchema = z.object({
  productId: z.uuid("Identifiant du produit invalide."),
  ...productFields,
});

export const updateProductActiveSchema = z.object({
  productId: z.uuid("Identifiant du produit invalide."),
  isActive: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export const createTechnicalSpecSchema = z.object({
  productId: z.uuid("Identifiant du produit invalide."),
  effectiveFrom: z
    .string()
    .trim()
    .transform((value) => value || null)
    .pipe(z.iso.date().nullable()),
  standardBandsKgPerUnit: optionalPositiveDecimal,
  description: optionalText(4000),
  notes: optionalText(2000),
});

export type ProductActionState = {
  message?: string;
  error?: string;
};
