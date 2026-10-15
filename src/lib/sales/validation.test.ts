import { describe, expect, it } from "vitest";
import {
  createCustomerSchema,
  createSalesOrderSchema,
  recordPaymentSchema,
  updateSalesOrderStatusSchema,
} from "@/lib/sales/validation";

describe("validation des ventes", () => {
  it("valide un nouveau client et normalise les champs facultatifs", () => {
    expect(
      createCustomerSchema.parse({
        name: "Client de test",
        phone: "",
        address: "",
        notes: "",
      }),
    ).toMatchObject({ name: "Client de test", phone: null });
  });

  it("refuse une quantité invalide ou un prix nul", () => {
    const customerId = "b0000000-0000-4000-8000-000000000001";
    const common = { customerId, orderDate: "2026-10-15" };
    expect(
      createSalesOrderSchema.safeParse({
        ...common,
        quantity: "0",
        unitPrice: "1000",
      }).success,
    ).toBe(false);
    expect(
      createSalesOrderSchema.safeParse({
        ...common,
        quantity: "3",
        unitPrice: "0",
      }).success,
    ).toBe(false);
  });

  it("refuse un total supérieur à la capacité de la colonne monétaire", () => {
    expect(
      createSalesOrderSchema.safeParse({
        customerId: "b0000000-0000-4000-8000-000000000001",
        orderDate: "2026-10-15",
        quantity: "10000000",
        unitPrice: "999999999999.99",
      }).success,
    ).toBe(false);
  });

  it("valide une livraison seulement avec un état autorisé", () => {
    const orderId = "b0000000-0000-4000-8000-000000000001";
    expect(
      updateSalesOrderStatusSchema.safeParse({
        orderId,
        status: "livree",
      }).success,
    ).toBe(true);
    expect(
      updateSalesOrderStatusSchema.safeParse({
        orderId,
        status: "terminee",
      }).success,
    ).toBe(false);
  });

  it("valide un règlement et refuse un montant nul ou un mode inconnu", () => {
    const saleId = "b0000000-0000-4000-8000-000000000001";
    const common = {
      saleId,
      method: "mobile_money",
      paidAt: "2026-10-15",
      reference: "",
    };
    expect(
      recordPaymentSchema.safeParse({ ...common, amount: "1250,50" }).success,
    ).toBe(true);
    expect(
      recordPaymentSchema.safeParse({ ...common, amount: "0" }).success,
    ).toBe(false);
    expect(
      recordPaymentSchema.safeParse({
        ...common,
        method: "cheque",
        amount: "100",
      }).success,
    ).toBe(false);
  });
});
