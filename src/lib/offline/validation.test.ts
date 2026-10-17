import { describe, expect, it } from "vitest";
import { offlineSubmissionSchema } from "@/lib/offline/validation";

const ownerId = "e289b4b4-a1bc-48e3-a78c-d277497e19e6";
const id = "9f62c4d4-cbd5-4eed-9ebd-4fb4bf496b7e";

describe("validations des saisies hors ligne", () => {
  it("accepte un apport avec un identifiant stable généré sur l’appareil", () => {
    const result = offlineSubmissionSchema.safeParse({
      id,
      ownerId,
      type: "apport",
      collectorId: "b07be038-8e88-422e-9813-e57fb8662c12",
      deliveryDate: "2026-10-15",
      collectionPoint: "Douala",
      plasticType: "PET",
      receivedKg: "12,500",
    });

    expect(result.success).toBe(true);
  });

  it("refuse un poids nul et un module financier hors ligne", () => {
    const zeroWeight = offlineSubmissionSchema.safeParse({
      id,
      ownerId,
      type: "apport",
      collectorId: "b07be038-8e88-422e-9813-e57fb8662c12",
      deliveryDate: "2026-10-15",
      collectionPoint: "Douala",
      plasticType: "PET",
      receivedKg: "0",
    });
    const payment = offlineSubmissionSchema.safeParse({
      id,
      ownerId,
      type: "reglement",
      amount: "1000",
    });

    expect(zeroWeight.success).toBe(false);
    expect(payment.success).toBe(false);
  });
});
