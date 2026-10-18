import { describe, expect, it } from "vitest";
import {
  createProductSchema,
  createTechnicalSpecSchema,
} from "@/lib/products/validation";

describe("validation du catalogue produit", () => {
  it("normalise le code et accepte les champs facultatifs vides", () => {
    const result = createProductSchema.safeParse({
      code: "nouveau-produit",
      name: "Nouveau produit",
      description: "",
      unitLabel: "pièce",
      alertThreshold: "",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe("NOUVEAU-PRODUIT");
      expect(result.data.description).toBeNull();
      expect(result.data.alertThreshold).toBeNull();
    }
  });

  it("refuse un code invalide et un seuil négatif", () => {
    expect(
      createProductSchema.safeParse({
        code: "Produit invalide",
        name: "Produit valide",
        description: "",
        unitLabel: "unité",
        alertThreshold: "-1",
      }).success,
    ).toBe(false);
  });

  it("permet de créer une fiche sans standard technique connu", () => {
    const result = createTechnicalSpecSchema.safeParse({
      productId: "123e4567-e89b-42d3-a456-426614174000",
      effectiveFrom: "",
      standardBandsKgPerUnit: "",
      description: "",
      notes: "",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.standardBandsKgPerUnit).toBeNull();
      expect(result.data.description).toBeNull();
    }
  });

  it("normalise un poids décimal français et refuse une date invalide", () => {
    const result = createTechnicalSpecSchema.safeParse({
      productId: "123e4567-e89b-42d3-a456-426614174000",
      effectiveFrom: "2026-02-30",
      standardBandsKgPerUnit: "0,125",
      description: "Essai",
      notes: "",
    });

    expect(result.success).toBe(false);
  });
});
