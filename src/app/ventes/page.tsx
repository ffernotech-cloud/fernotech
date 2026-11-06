import Link from "next/link";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { getDatabase } from "@/db";
import {
  customers,
  finishedProductStockMovements,
  payments,
  products,
  saleLines,
  sales,
  salesOrderLines,
  salesOrders,
} from "@/db/schema";
import { requirePermission } from "@/lib/auth/guards";
import {
  finishedProductStockById,
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
    productRows,
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
        productId: finishedProductStockMovements.productId,
        movementType: finishedProductStockMovements.movementType,
        quantity: finishedProductStockMovements.quantity,
      })
      .from(finishedProductStockMovements),
    database
      .select({
        id: products.id,
        name: products.name,
        code: products.code,
        unitLabel: products.unitLabel,
        isActive: products.isActive,
      })
      .from(products)
      .orderBy(products.name),
    database
      .select({
        id: salesOrders.id,
        customerId: salesOrders.customerId,
        customerName: customers.name,
        orderDate: salesOrders.orderDate,
        status: salesOrders.status,
        quantity: salesOrders.quantity,
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

  const stockByProduct = finishedProductStockById(finishedMovements);
  const finishedStock = productRows.map((product) => ({
    id: product.id,
    name: product.name,
    code: product.code,
    unitLabel: product.unitLabel,
    quantity: stockByProduct.get(product.id) ?? 0,
  }));
  const activeProducts = productRows
    .filter((product) => product.isActive)
    .map(({ id, name, code, unitLabel }) => ({
      id,
      name,
      code,
      unitLabel,
    }));
  const orderIds = orderRows.map((order) => order.id);
  const orderLineRows =
    orderIds.length === 0
      ? []
      : await database
          .select({
            salesOrderId: salesOrderLines.salesOrderId,
            productId: salesOrderLines.productId,
            productCode: salesOrderLines.productCode,
            productName: salesOrderLines.productName,
            unitLabel: salesOrderLines.unitLabel,
            quantity: salesOrderLines.quantity,
            unitPrice: salesOrderLines.unitPrice,
            totalAmount: salesOrderLines.totalAmount,
          })
          .from(salesOrderLines)
          .where(inArray(salesOrderLines.salesOrderId, orderIds))
          .orderBy(salesOrderLines.createdAt);
  const orderLinesById = new Map<string, typeof orderLineRows>();
  for (const line of orderLineRows) {
    const lines = orderLinesById.get(line.salesOrderId) ?? [];
    lines.push(line);
    orderLinesById.set(line.salesOrderId, lines);
  }
  const orders = orderRows.map((order) => ({
    ...order,
    lines: orderLinesById.get(order.id) ?? [],
  }));

  const saleIds = salesRows.map((sale) => sale.id);
  const saleLineRows =
    saleIds.length === 0
      ? []
      : await database
          .select({
            saleId: saleLines.saleId,
            productId: saleLines.productId,
            productCode: saleLines.productCode,
            productName: saleLines.productName,
            unitLabel: saleLines.unitLabel,
            quantity: saleLines.quantity,
            unitPrice: saleLines.unitPrice,
            totalAmount: saleLines.totalAmount,
          })
          .from(saleLines)
          .where(inArray(saleLines.saleId, saleIds))
          .orderBy(saleLines.createdAt);
  const saleLinesById = new Map<string, typeof saleLineRows>();
  for (const line of saleLineRows) {
    const lines = saleLinesById.get(line.saleId) ?? [];
    lines.push(line);
    saleLinesById.set(line.saleId, lines);
  }

  const paymentsBySale = new Map(
    paymentTotals.map((payment) => [payment.saleId, [payment.amount]]),
  );
  const salesWithReceivables = salesRows.map((sale) => ({
    ...sale,
    lines: saleLinesById.get(sale.id) ?? [],
    outstandingAmount: outstandingReceivable(
      sale.totalAmount,
      paymentsBySale.get(sale.id) ?? [],
    ),
  }));

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
              Gérez vos clients, commandes multi-produits, livraisons,
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
          products={activeProducts}
          defaultDate={localDateInputValue(new Date())}
          orders={orders}
          payments={paymentRows}
          sales={salesWithReceivables}
          finishedStock={finishedStock}
          customerReceivables={customerReceivables}
        />
      </div>
    </main>
  );
}
