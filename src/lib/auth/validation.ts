import { z } from "zod";
import { appRoles } from "@/lib/auth/roles";

export const identifierSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "L’identifiant doit contenir au moins 3 caractères.")
  .max(32, "L’identifiant ne peut pas dépasser 32 caractères.")
  .regex(
    /^[a-z0-9._-]+$/,
    "Utilisez uniquement des lettres, chiffres, points, tirets ou tirets bas.",
  );

export const passwordSchema = z
  .string()
  .min(12, "Le mot de passe doit contenir au moins 12 caractères.")
  .refine(
    (password) => new TextEncoder().encode(password).length <= 72,
    "Le mot de passe ne peut pas dépasser 72 octets UTF-8.",
  );

export const loginSchema = z.object({
  identifier: identifierSchema,
  password: z
    .string()
    .min(1, "Saisissez votre mot de passe.")
    .refine(
      (password) => new TextEncoder().encode(password).length <= 72,
      "Le mot de passe ne peut pas dépasser 72 octets UTF-8.",
    ),
});

export const createUserSchema = z.object({
  identifier: identifierSchema,
  displayName: z
    .string()
    .trim()
    .min(2, "Le nom doit contenir au moins 2 caractères.")
    .max(100, "Le nom ne peut pas dépasser 100 caractères."),
  password: passwordSchema,
  role: z.enum(appRoles, {
    error: "Sélectionnez un rôle valide.",
  }),
});

export const updateRoleSchema = z.object({
  userId: z.uuid("Identifiant utilisateur invalide."),
  role: z.enum(appRoles, {
    error: "Sélectionnez un rôle valide.",
  }),
});

export const updateActiveSchema = z.object({
  userId: z.uuid("Identifiant utilisateur invalide."),
  isActive: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export type UserActionState = {
  message?: string;
  error?: string;
};
