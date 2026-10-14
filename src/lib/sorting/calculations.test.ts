import { describe, expect, it } from "vitest";
import {
  availableMaterialKg,
  sortingBalanceIsValid,
} from "@/lib/sorting/calculations";
import { sortDeliverySchema } from "@/lib/sorting/validation";

describe("calculs du tri et du stock matière", () => {
  it("vérifie le bilan de tri à la précision du gramme", () => {
    expect(
      sortingBalanceIsValid({
        receivedKg: "15",
        acceptedKg: "12.500",
        rejectedKg: "2.500",
      }),
    ).toBe(true);
    expect(
      sortingBalanceIsValid({
        receivedKg: "15",
        acceptedKg: "12.501",
        rejectedKg: "2.500",
      }),
    ).toBe(false);
  });

  it("exige un motif pour un rejet et accepte le tri sans rejet", () => {
    const deliveryId = "d1adf726-aec1-4b8f-9735-944e6da55172";
    expect(
      sortDeliverySchema.safeParse({
        deliveryId,
        acceptedKg: "12,5",
        rejectedKg: "2,5",
        rejectionReason: "",
      }).success,
    ).toBe(false);
    expect(
      sortDeliverySchema.safeParse({
        deliveryId,
        acceptedKg: "15",
        rejectedKg: "0",
        rejectionReason: "",
      }).success,
    ).toBe(true);
  });

  it("calcule le stock depuis les mouvements, sans saisir un solde", () => {
    expect(
      availableMaterialKg([
        { movementType: "entree", quantityKg: "12.500" },
        { movementType: "sortie", quantityKg: "2.250" },
        { movementType: "entree", quantityKg: "0.125" },
      ]),
    ).toBe(10.375);
  });

  it("refuse de calculer le stock depuis un mouvement invalide", () => {
    expect(() =>
      availableMaterialKg([{ movementType: "entree", quantityKg: "-1" }]),
    ).toThrow("Un mouvement de stock contient un poids invalide.");
  });
});
