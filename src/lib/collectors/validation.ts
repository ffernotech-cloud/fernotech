import { z } from "zod";
import { collectorTypes } from "@/lib/auth/roles";

const optionalText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum, `Ce champ ne peut pas dépasser ${maximum} caractères.`)
    .transform((value) => value || null);

const collectorFields = {
  name: z
    .string()
    .trim()
    .min(2, "Le nom doit contenir au moins 2 caractères.")
    .max(120, "Le nom ne peut pas dépasser 120 caractères."),
  type: z.enum(collectorTypes, {
    error: "Sélectionnez un type de collecteur valide.",
  }),
  phone: optionalText(40),
  zone: optionalText(120),
  notes: optionalText(2000),
};

export const createCollectorSchema = z.object(collectorFields);

export const updateCollectorSchema = z.object({
  collectorId: z.uuid("Identifiant du collecteur invalide."),
  ...collectorFields,
});

export const updateCollectorActiveSchema = z.object({
  collectorId: z.uuid("Identifiant du collecteur invalide."),
  isActive: z.enum(["true", "false"]).transform((value) => value === "true"),
});

const positiveKilograms = z
  .string()
  .trim()
  .regex(
    /^\d{1,7}(?:[.,]\d{1,3})?$/,
    "Saisissez un poids positif avec au maximum 3 décimales.",
  )
  .transform((value) => value.replace(",", "."))
  .refine((value) => Number(value) > 0, "Le poids doit être supérieur à 0.");

export const createDeliverySchema = z.object({
  collectorId: z.uuid("Sélectionnez un collecteur valide."),
  deliveryDate: z.iso.date("Saisissez une date valide."),
  collectionPoint: z
    .string()
    .trim()
    .min(2, "Le point de collecte est obligatoire.")
    .max(160, "Le point de collecte ne peut pas dépasser 160 caractères."),
  plasticType: z
    .string()
    .trim()
    .min(2, "Saisissez le type de plastique.")
    .max(80, "Le type de plastique ne peut pas dépasser 80 caractères."),
  receivedKg: positiveKilograms,
});

export type CollectorActionState = {
  message?: string;
  error?: string;
};
