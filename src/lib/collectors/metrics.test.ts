import { describe, expect, it } from "vitest";
import { acceptanceRate, kilogramsLabel } from "@/lib/collectors/metrics";

describe("indicateurs des collecteurs", () => {
  it("calcule le taux d’acceptation à partir des kilos reçus et acceptés", () => {
    expect(acceptanceRate({ receivedKg: 15, acceptedKg: 12.5 })).toBeCloseTo(
      83.333,
      2,
    );
  });

  it("renvoie 0 si aucune livraison n’a été reçue", () => {
    expect(acceptanceRate({ receivedKg: 0, acceptedKg: 0 })).toBe(0);
  });

  it("évite un taux incohérent si les données sont hors limites", () => {
    expect(acceptanceRate({ receivedKg: 10, acceptedKg: 12 })).toBe(100);
    expect(acceptanceRate({ receivedKg: 10, acceptedKg: -1 })).toBe(0);
  });

  it("formate les kilos selon la locale française", () => {
    expect(kilogramsLabel(12.5)).toBe("12,5");
  });
});
