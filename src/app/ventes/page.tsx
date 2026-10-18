import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { getDatabase } from "@/db";
import {
  customers,
  finishedProductStockMovements,
  payments,
  products,
  sales,
  salesOrders,
} from "@/db/schema";
import { requirePermission } from "@/lib/auth/guards";
import {
  availableFinishedProductStock,
  outstandingReceivable,
} from "@/lib/sales/calculations";
import { SalesManagement } from "@/app/ventes/sales-management";
import { ExportLink } from "@/components/export-link";

export const instant = false;

function localDateInputValue(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Africa/Douala",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

export default async function SalesPage() {
  await requirePermission("sales:manage");
  const database = getDatabase();
  const [
    customerRows,
    finishedMovements,
    orderRows,
    salesRows,
    paymentRows,
    paymentTotals,
    customerReceivables,
  ] = await Promise.all([
      database
        .select({
          id: customers.id,
          name: customers.name,
          phone: customers.phone,
          address: customers.address,
          notes: customers.notes,
        })
        .from(customers)
        .orderBy(desc(customers.createdAt)),
      database
        .select({
          movementType: finishedProductStockMovements.movementType,
          quantity: finishedProductStockMovements.quantity,
        })
        .from(finishedProductStockMovements)
        .innerJoin(
          products,
          eq(finishedProductStockMovements.productId, products.id),
        )
        .where(eq(products.code, "BALAI")),
      database
        .select({
          id: salesOrders.id,
          customerId: salesOrders.customerId,
          customerName: customers.name,
          orderDate: salesOrders.orderDate,
          status: salesOrders.status,
          quantity: salesOrders.quantity,
          unitPrice: salesOrders.unitPrice,
          totalAmount: salesOrders.totalAmount,
        })
        .from(salesOrders)
        .innerJoin(customers, eq(salesOrders.customerId, customers.id))
        .orderBy(desc(salesOrders.orderDate), desc(salesOrders.createdAt)),
      database
        .select({
          id: sales.id,
          orderId: sales.orderId,
          customerId: sales.customerId,
          customerName: customers.name,
          saleDate: sales.saleDate,
          quantity: sales.quantity,
          totalAmount: sales.totalAmount,
        })
        .from(sales)
        .innerJoin(customers, eq(sales.customerId, customers.id))
        .orderBy(desc(sales.saleDate), desc(sales.createdAt)),
      database
        .select({
          id: payments.id,
          saleId: payments.saleId,
          customerName: customers.name,
          amount: payments.amount,
          method: payments.method,
          paidAt: payments.paidAt,
          reference: payments.reference,
          createdAt: payments.createdAt,
        })
        .from(payments)
        .innerJoin(sales, eq(payments.saleId, sales.id))
        .innerJoin(customers, eq(sales.customerId, customers.id))
        .orderBy(desc(payments.paidAt), desc(payments.createdAt)),
      database
        .select({
          saleId: payments.saleId,
          amount: sql<string>`coalesce(sum(${payments.amount}::numeric), 0)::text`.as(
            "paid_amount",
          ),
        })
        .from(payments)
        .groupBy(payments.saleId),
      database
        .select({
          customerId: sales.customerId,
          outstandingAmount: sql<string>`
            sum(
              ${sales.totalAmount}::numeric -
              coalesce(
                (
                  select sum(${payments.amount}::numeric)
                  from ${payments}
                  where ${payments.saleId} = ${sales.id}
                ),
                0
              )
            )::text
          `.as("outstanding_amount"),
        })
        .from(sales)
        .groupBy(sales.customerId),
    ]);

  const stock = availableFinishedProductStock(finishedMovements);
  const paymentsBySale = new Map(
    paymentTotals.map((payment) => [payment.saleId, [payment.amount]]),
  );
  const salesWithReceivables = salesRows.map((sale) => {
    const salePayments = paymentsBySale.get(sale.id) ?? [];
    return {
      ...sale,
      outstandingAmount: outstandingReceivable(sale.totalAmount, salePayments),
    };
  });

  return (
    <main className="min-h-screen px-4 py-5 sm:px-8 sm:py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link
              className="text-sm font-semibold text-[#286542] hover:underline"
              href="/"
            >
              ← Tableau de bord
            </Link>
            <h1 className="mt-3 text-2xl font-semibold text-[#193b29]">
              Ventes et règlements
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#758178]">
              Gérez vos clients, préparez les commandes et suivez les livraisons,
              paiements et créances.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ExportLink href="/api/exports/clients">Exporter les clients</ExportLink>
            <ExportLink href="/api/exports/ventes">Exporter les ventes</ExportLink>
            <ExportLink href="/api/exports/reglements">
              Exporter les règlements
            </ExportLink>
            <ExportLink href="/api/exports/stock-produits">
              Mouvements de produits finis
            </ExportLink>
          </div>
        </header>

        <SalesManagement
          customers={customerRows}
          defaultDate={localDateInputValue(new Date())}
          orders={orderRows}
          payments={paymentRows}
          sales={salesWithReceivables}
          finishedStock={stock}
          customerReceivables={customerReceivables}
        />
      </div>
    </main>
  );
}
