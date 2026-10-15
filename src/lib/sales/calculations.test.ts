import { describe, expect, it } from "vitest";
import {
  availableFinishedProductStock,
  calculateSalesTotal,
  finishedStockIsSufficient,
  outstandingReceivable,
  paymentFitsReceivable,
} from "@/lib/sales/calculations";

describe("calculs de ventes et stock fini", () => {
  it("calcule le stock depuis les mouvements d’entrée et de sortie", () => {
    expect(
      availableFinishedProductStock([
        { movementType: "entree", quantity: 20 },
        { movementType: "sortie", quantity: 5 },
      ]),
    ).toBe(15);
  });

  it("bloque une livraison supérieure au stock disponible", () => {
    const movements = [
      { movementType: "entree" as const, quantity: 20 },
      { movementType: "sortie" as const, quantity: 5 },
    ];
    expect(finishedStockIsSufficient(movements, 15)).toBe(true);
    expect(finishedStockIsSufficient(movements, 16)).toBe(false);
  });

  it("calcule une créance après plusieurs règlements partiels", () => {
    expect(outstandingReceivable("15000.00", ["5000.00", "2500.00"])).toBe(
      "7500.00",
    );
  });

  it("refuse un règlement supérieur au solde restant", () => {
    expect(paymentFitsReceivable("10000.00", ["6000.00"], "4000.00")).toBe(
      true,
    );
    expect(paymentFitsReceivable("10000.00", ["6000.00"], "4000")).toBe(true);
    expect(paymentFitsReceivable("10000.00", ["6000.00"], "4000.01")).toBe(
      false,
    );
  });

  it("multiplie la quantité par le prix sans perdre les centimes", () => {
    expect(calculateSalesTotal(3, "1250.50")).toBe("3751.50");
  });

  it("retourne un solde nul pour une créance entièrement réglée", () => {
    expect(outstandingReceivable("10000.00", ["10000.00"])).toBe("0.00");
  });
});
