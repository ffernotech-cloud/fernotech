import { describe, expect, it } from "vitest";
import {
  createCollectorSchema,
  createDeliverySchema,
} from "@/lib/collectors/validation";

describe("validation des collecteurs et apports", () => {
  it("normalise les coordonnées facultatives vides", () => {
    const result = createCollectorSchema.safeParse({
      name: "Collectif Vert",
      type: "association",
      phone: "",
      zone: "Douala",
      notes: "",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBeNull();
      expect(result.data.notes).toBeNull();
    }
  });

  it("accepte une livraison avec un poids décimal saisi avec une virgule", () => {
    const result = createDeliverySchema.safeParse({
      collectorId: "d1adf726-aec1-4b8f-9735-944e6da55172",
      deliveryDate: "2026-10-14",
      collectionPoint: "Bonamoussadi",
      plasticType: "PET",
      receivedKg: "12,500",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.receivedKg).toBe("12.500");
    }
  });

  it.each(["0", "-2", "2.1234", "1e2", "10000000"])(
    "refuse un poids reçu invalide (%s)",
    (receivedKg) => {
      expect(
        createDeliverySchema.safeParse({
          collectorId: "d1adf726-aec1-4b8f-9735-944e6da55172",
          deliveryDate: "2026-10-14",
          collectionPoint: "Bonamoussadi",
          plasticType: "PET",
          receivedKg,
        }).success,
      ).toBe(false);
    },
  );
});
