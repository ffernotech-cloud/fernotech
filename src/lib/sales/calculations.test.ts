import { describe, expect, it } from "vitest";
import {
  availableFinishedProductStock,
  calculateSalesOrderTotals,
  calculateSalesTotal,
  finishedProductStockById,
  finishedProductsAreSufficient,
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

  it("vérifie chaque produit demandé contre son propre stock", () => {
    const movements = [
      {
        productId: "balai",
        movementType: "entree" as const,
        quantity: 10,
      },
      {
        productId: "brosse",
        movementType: "entree" as const,
        quantity: 3,
      },
      {
        productId: "balai",
        movementType: "sortie" as const,
        quantity: 2,
      },
    ];
    expect(finishedProductStockById(movements)).toEqual(
      new Map([
        ["balai", 8],
        ["brosse", 3],
      ]),
    );
    expect(
      finishedProductsAreSufficient(movements, [
        { productId: "balai", quantity: 8 },
        { productId: "brosse", quantity: 3 },
      ]),
    ).toBe(true);
    expect(
      finishedProductsAreSufficient(movements, [
        { productId: "balai", quantity: 8 },
        { productId: "brosse", quantity: 4 },
      ]),
    ).toBe(false);
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

  it("calcule le montant et le prix moyen d’une commande multi-produits", () => {
    expect(
      calculateSalesOrderTotals([
        { quantity: 2, unitPrice: "1250.50" },
        { quantity: 3, unitPrice: "500" },
      ]),
    ).toEqual({
      quantity: 5,
      totalAmount: "4001.00",
      averageUnitPrice: "800.20",
    });
  });

  it("retourne un solde nul pour une créance entièrement réglée", () => {
    expect(outstandingReceivable("10000.00", ["10000.00"])).toBe("0.00");
  });
});
