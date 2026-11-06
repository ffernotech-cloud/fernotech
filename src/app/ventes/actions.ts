"use server";

import { asc, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDatabase } from "@/db";
import {
  auditLogs,
  customers,
  finishedProductStockMovements,
  payments,
  saleLines,
  products,
  sales,
  salesOrders,
  salesOrderLines,
} from "@/db/schema";
import { requirePermission } from "@/lib/auth/guards";
import { formatCurrency } from "@/lib/currency";
import {
  calculateSalesTotal,
  calculateSalesOrderTotals,
  finishedProductStockById,
  finishedProductsAreSufficient,
  outstandingReceivable,
  paymentFitsReceivable,
} from "@/lib/sales/calculations";
import {
  createCustomerSchema,
  createSalesOrderSchema,
  recordPaymentSchema,
  updateSalesOrderStatusSchema,
  type SalesActionState,
} from "@/lib/sales/validation";

function currentBusinessDate(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Africa/Douala",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

export async function createCustomer(
  _previousState: SalesActionState,
  formData: FormData,
): Promise<SalesActionState> {
  const actor = await requirePermission("customers:manage");
  const parsed = createCustomerSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Vérifiez la fiche client.",
    };
  }

  const database = getDatabase();
  await database.transaction(async (transaction) => {
    const [customer] = await transaction
      .insert(customers)
      .values(parsed.data)
      .returning({ id: customers.id });
    await transaction.insert(auditLogs).values({
      actorId: actor.id,
      action: "customer.created",
      entityType: "customer",
      entityId: customer.id,
      details: { name: parsed.data.name, phone: parsed.data.phone },
    });
  });

  revalidatePath("/ventes");
  return { message: "La fiche client a été créée." };
}

export async function createSalesOrder(
  _previousState: SalesActionState,
  formData: FormData,
): Promise<SalesActionState> {
  const actor = await requirePermission("sales:manage");
  const productIds = formData.getAll("productId");
  const quantities = formData.getAll("quantity");
  const unitPrices = formData.getAll("unitPrice");
  if (
    productIds.length === 0 ||
    productIds.length !== quantities.length ||
    productIds.length !== unitPrices.length
  ) {
    return { error: "Vérifiez les lignes de produits de la commande." };
  }
  const parsed = createSalesOrderSchema.safeParse({
    customerId: formData.get("customerId"),
    orderDate: formData.get("orderDate"),
    lines: productIds.map((productId, index) => ({
      productId,
      quantity: quantities[index],
      unitPrice: unitPrices[index],
    })),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Vérifiez la commande.",
    };
  }

  const totals = calculateSalesOrderTotals(parsed.data.lines);
  const requestedProductIds = [
    ...new Set(parsed.data.lines.map((line) => line.productId)),
  ];
  const database = getDatabase();
  const result = await database.transaction(
    async (transaction): Promise<SalesActionState> => {
      const [customer] = await transaction
        .select({ id: customers.id })
        .from(customers)
        .where(eq(customers.id, parsed.data.customerId))
        .limit(1)
        .for("update");
      if (!customer) {
        return { error: "Ce client n’existe plus." };
      }

      const productRows = await transaction
        .select({
          id: products.id,
          code: products.code,
          name: products.name,
          unitLabel: products.unitLabel,
          isActive: products.isActive,
        })
        .from(products)
        .where(inArray(products.id, requestedProductIds))
        .orderBy(asc(products.id))
        .for("update");
      if (productRows.length !== requestedProductIds.length) {
        return { error: "Un produit de cette commande n’existe plus." };
      }
      const inactiveProduct = productRows.find((product) => !product.isActive);
      if (inactiveProduct) {
        return {
          error: `Le produit « ${inactiveProduct.name} » est inactif.`,
        };
      }
      const productById = new Map(
        productRows.map((product) => [product.id, product]),
      );

      const [order] = await transaction
        .insert(salesOrders)
        .values({
          customerId: customer.id,
          orderDate: parsed.data.orderDate,
          quantity: totals.quantity,
          unitPrice: totals.averageUnitPrice,
          totalAmount: totals.totalAmount,
          createdBy: actor.id,
        })
        .returning({ id: salesOrders.id });
      const lineRows = parsed.data.lines.map((line) => {
        const product = productById.get(line.productId);
        if (!product) {
          throw new Error("Un produit sélectionné a disparu.");
        }
        return {
          salesOrderId: order.id,
          productId: product.id,
          productCode: product.code,
          productName: product.name,
          unitLabel: product.unitLabel,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          totalAmount: calculateSalesTotal(line.quantity, line.unitPrice),
        };
      });
      await transaction.insert(salesOrderLines).values(lineRows);
      await transaction.insert(auditLogs).values({
        actorId: actor.id,
        action: "sales_order.created",
        entityType: "sales_order",
        entityId: order.id,
        details: {
          customerId: customer.id,
          quantity: totals.quantity,
          totalAmount: totals.totalAmount,
          lines: lineRows.map((line) => ({
            productId: line.productId,
            productCode: line.productCode,
            productName: line.productName,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            totalAmount: line.totalAmount,
          })),
          status: "en_attente",
        },
      });
      return { message: "La commande a été créée en attente de préparation." };
    },
  );

  if (result.error) {
    return result;
  }
  revalidatePath("/ventes");
  return result;
}

export async function updateSalesOrderStatus(
  _previousState: SalesActionState,
  formData: FormData,
): Promise<SalesActionState> {
  const actor = await requirePermission("sales:manage");
  const parsed = updateSalesOrderStatusSchema.safeParse({
    orderId: formData.get("orderId"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { error: "Identifiant ou statut de commande invalide." };
  }

  const database = getDatabase();
  const result = await database.transaction(
    async (transaction): Promise<SalesActionState> => {
      const [order] = await transaction
        .select({
          id: salesOrders.id,
          customerId: salesOrders.customerId,
          orderDate: salesOrders.orderDate,
          status: salesOrders.status,
          quantity: salesOrders.quantity,
          unitPrice: salesOrders.unitPrice,
          totalAmount: salesOrders.totalAmount,
        })
        .from(salesOrders)
        .where(eq(salesOrders.id, parsed.data.orderId))
        .limit(1)
        .for("update");

      if (!order) {
        return { error: "Cette commande n’existe plus." };
      }
      if (
        parsed.data.status === "preparee" &&
        order.status !== "en_attente"
      ) {
        return {
          error: "Seule une commande en attente peut être préparée.",
        };
      }
      if (
        parsed.data.status === "annulee" &&
        order.status !== "en_attente" &&
        order.status !== "preparee"
      ) {
        return { error: "Cette commande ne peut plus être annulée." };
      }
      if (parsed.data.status === "livree" && order.status !== "preparee") {
        return {
          error: "Préparez la commande avant de confirmer sa livraison.",
        };
      }

      if (parsed.data.status === "livree") {
        await transaction.execute(
          sql`select pg_advisory_xact_lock(hashtext('finished-product-stock'))`,
        );
        const orderLineRows = await transaction
          .select({
            id: salesOrderLines.id,
            productId: salesOrderLines.productId,
            productCode: salesOrderLines.productCode,
            productName: salesOrderLines.productName,
            unitLabel: salesOrderLines.unitLabel,
            quantity: salesOrderLines.quantity,
            unitPrice: salesOrderLines.unitPrice,
            totalAmount: salesOrderLines.totalAmount,
          })
          .from(salesOrderLines)
          .where(eq(salesOrderLines.salesOrderId, order.id))
          .for("update");
        if (orderLineRows.length === 0) {
          return {
            error:
              "Cette commande ne contient aucune ligne de produit; elle ne peut pas être livrée.",
          };
        }
        const quantitiesByProduct = new Map<string, number>();
        for (const line of orderLineRows) {
          quantitiesByProduct.set(
            line.productId,
            (quantitiesByProduct.get(line.productId) ?? 0) + line.quantity,
          );
        }
        const productIds = [...quantitiesByProduct.keys()].sort();
        const movements = await transaction
          .select({
            productId: finishedProductStockMovements.productId,
            movementType: finishedProductStockMovements.movementType,
            quantity: finishedProductStockMovements.quantity,
          })
          .from(finishedProductStockMovements)
          .where(inArray(finishedProductStockMovements.productId, productIds));
        const requiredProducts = productIds.map((productId) => ({
          productId,
          quantity: quantitiesByProduct.get(productId) ?? 0,
        }));
        if (!finishedProductsAreSufficient(movements, requiredProducts)) {
          const balances = finishedProductStockById(movements);
          const insufficientLine = orderLineRows.find(
            (line) =>
              (balances.get(line.productId) ?? 0) <
              (quantitiesByProduct.get(line.productId) ?? 0),
          );
          if (!insufficientLine) {
            return {
              error:
                "Les stocks produits ne peuvent pas être vérifiés. Actualisez la page puis réessayez.",
            };
          }
          return {
            error: `Stock insuffisant : ${insufficientLine.productName}, ${quantitiesByProduct.get(insufficientLine.productId)} ${insufficientLine.unitLabel}(s) demandée(s), ${balances.get(insufficientLine.productId) ?? 0} disponible(s). La commande reste préparée.`,
          };
        }

        const [sale] = await transaction
          .insert(sales)
          .values({
            orderId: order.id,
            customerId: order.customerId,
            saleDate: currentBusinessDate(),
            quantity: order.quantity,
            unitPrice: order.unitPrice,
            totalAmount: order.totalAmount,
            actorId: actor.id,
          })
          .returning({ id: sales.id });
        const createdSaleLines = await transaction
          .insert(saleLines)
          .values(
            orderLineRows.map((line) => ({
              saleId: sale.id,
              salesOrderLineId: line.id,
              productId: line.productId,
              productCode: line.productCode,
              productName: line.productName,
              unitLabel: line.unitLabel,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              totalAmount: line.totalAmount,
            })),
          )
          .returning({
            id: saleLines.id,
            productId: saleLines.productId,
            productName: saleLines.productName,
            quantity: saleLines.quantity,
          });
        await transaction.insert(finishedProductStockMovements).values(
          createdSaleLines.map((line) => ({
            movementType: "sortie" as const,
            productId: line.productId,
            quantity: line.quantity,
            saleId: sale.id,
            saleLineId: line.id,
            actorId: actor.id,
            reason: `Livraison de commande · ${line.productName}`,
          })),
        );
      }

      await transaction
        .update(salesOrders)
        .set({ status: parsed.data.status })
        .where(eq(salesOrders.id, order.id));
      await transaction.insert(auditLogs).values({
        actorId: actor.id,
        action: `sales_order.${parsed.data.status}`,
        entityType: "sales_order",
        entityId: order.id,
        details: {
          previousStatus: order.status,
          status: parsed.data.status,
          quantity: order.quantity,
          totalAmount: order.totalAmount,
        },
      });
      return {
        message:
          parsed.data.status === "livree"
            ? "La vente est enregistrée et les stocks des produits livrés ont été débités."
            : parsed.data.status === "preparee"
              ? "La commande est prête. Le stock sera débité à la livraison."
              : "La commande a été annulée. Le stock n’a pas été modifié.",
      };
    },
  );

  if (result.error) {
    return result;
  }
  revalidatePath("/ventes");
  revalidatePath("/production");
  revalidatePath("/");
  return result;
}

export async function recordPayment(
  _previousState: SalesActionState,
  formData: FormData,
): Promise<SalesActionState> {
  const actor = await requirePermission("sales:manage");
  const parsed = recordPaymentSchema.safeParse({
    saleId: formData.get("saleId"),
    amount: formData.get("amount"),
    method: formData.get("method"),
    paidAt: formData.get("paidAt"),
    reference: formData.get("reference"),
  });
  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ?? "Vérifiez les informations du règlement.",
    };
  }

  const database = getDatabase();
  const result = await database.transaction(
    async (transaction): Promise<SalesActionState> => {
      const [sale] = await transaction
        .select({
          id: sales.id,
          totalAmount: sales.totalAmount,
        })
        .from(sales)
        .where(eq(sales.id, parsed.data.saleId))
        .limit(1)
        .for("update");
      if (!sale) {
        return { error: "Cette vente n’existe plus." };
      }

      const existingPayments = await transaction
        .select({ amount: payments.amount })
        .from(payments)
        .where(eq(payments.saleId, sale.id));
      if (
        !paymentFitsReceivable(
          sale.totalAmount,
          existingPayments.map((payment) => payment.amount),
          parsed.data.amount,
        )
      ) {
        return {
          error: `Le règlement dépasse le solde restant de ${formatCurrency(
            outstandingReceivable(
              sale.totalAmount,
              existingPayments.map((payment) => payment.amount),
            ),
          )}.`,
        };
      }

      const [payment] = await transaction
        .insert(payments)
        .values({
          saleId: sale.id,
          amount: parsed.data.amount,
          method: parsed.data.method,
          paidAt: parsed.data.paidAt,
          reference: parsed.data.reference,
          actorId: actor.id,
        })
        .returning({ id: payments.id });
      await transaction.insert(auditLogs).values({
        actorId: actor.id,
        action: "payment.recorded",
        entityType: "payment",
        entityId: payment.id,
        details: {
          saleId: sale.id,
          amount: parsed.data.amount,
          method: parsed.data.method,
          paidAt: parsed.data.paidAt,
        },
      });
      return { message: "Le règlement a été enregistré." };
    },
  );

  if (result.error) {
    return result;
  }
  revalidatePath("/ventes");
  revalidatePath("/");
  return result;
}
