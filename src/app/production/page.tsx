import Link from "next/link";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { getDatabase } from "@/db";
import {
  finishedProductStockMovements,
  materialStockMovements,
  productTechnicalSpecs,
  productionOrderLines,
  productionOrders,
  products,
  users,
} from "@/db/schema";
import { requirePermission } from "@/lib/auth/guards";
import { availableMaterialKg } from "@/lib/sorting/calculations";
import { ProductionManagement } from "@/app/production/production-management";
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

export default async function ProductionPage() {
  await requirePermission("production:manage");
  const database = getDatabase();
  const [
    materialMovementRows,
    finishedMovementRows,
    productRows,
    productSpecRows,
    orderRows,
    productionTotals,
  ] = await Promise.all([
    database
      .select({
        plasticType: materialStockMovements.plasticType,
        movementType: materialStockMovements.movementType,
        quantityKg: materialStockMovements.quantityKg,
      })
      .from(materialStockMovements)
      .orderBy(asc(materialStockMovements.plasticType)),
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
      })
      .from(products)
      .orderBy(asc(products.name)),
    database
      .select({
        id: productTechnicalSpecs.id,
        productId: products.id,
        productName: products.name,
        productCode: products.code,
        version: productTechnicalSpecs.version,
      })
      .from(productTechnicalSpecs)
      .innerJoin(products, eq(productTechnicalSpecs.productId, products.id))
      .where(
        and(
          eq(products.isActive, true),
          sql`${productTechnicalSpecs.version} = (
            select max(current_spec.version)
            from product_technical_specs as current_spec
            where current_spec.product_id = ${products.id}
          )`,
        ),
      )
      .orderBy(asc(products.name)),
    database
      .select({
        id: productionOrders.id,
        productionDate: productionOrders.productionDate,
        plasticType: productionOrders.plasticType,
        materialUsedKg: productionOrders.materialUsedKg,
        bandsPreparedKg: productionOrders.bandsPreparedKg,
        lossKg: productionOrders.lossKg,
        lossReason: productionOrders.lossReason,
        totalCost: productionOrders.totalCost,
        supervisorName: users.displayName,
      })
      .from(productionOrders)
      .innerJoin(users, eq(productionOrders.supervisorId, users.id))
      .orderBy(
        desc(productionOrders.productionDate),
        desc(productionOrders.createdAt),
      )
      .limit(50),
    database
      .select({
        quantity: sql<number>`coalesce(sum(${productionOrderLines.quantityProduced}), 0)::int`
          .mapWith(Number)
          .as("quantity_produced"),
      })
      .from(productionOrderLines),
  ]);

  const stockByType = new Map<
    string,
    Array<{ movementType: "entree" | "sortie"; quantityKg: string }>
  >();
  for (const movement of materialMovementRows) {
    const rows = stockByType.get(movement.plasticType) ?? [];
    rows.push({
      movementType: movement.movementType,
      quantityKg: movement.quantityKg,
    });
    stockByType.set(movement.plasticType, rows);
  }
  const materialStock = [...stockByType.entries()]
    .map(([plasticType, movements]) => ({
      plasticType,
      quantityKg: availableMaterialKg(movements),
    }))
    .filter((row) => row.quantityKg > 0)
    .sort((left, right) => left.plasticType.localeCompare(right.plasticType));

  const finishedBalanceByProduct = new Map<string, number>();
  for (const movement of finishedMovementRows) {
    const quantity =
      movement.movementType === "entree"
        ? movement.quantity
        : -movement.quantity;
    finishedBalanceByProduct.set(
      movement.productId,
      (finishedBalanceByProduct.get(movement.productId) ?? 0) + quantity,
    );
  }
  const finishedStock = productRows.map((product) => ({
    productId: product.id,
    productName: product.name,
    productCode: product.code,
    quantity: finishedBalanceByProduct.get(product.id) ?? 0,
  }));

  const orderIds = orderRows.map((order) => order.id);
  const lineRows =
    orderIds.length === 0
      ? []
      : await database
          .select({
            productionOrderId: productionOrderLines.productionOrderId,
            productName: products.name,
            productCode: products.code,
            specVersion: productTechnicalSpecs.version,
            quantityProduced: productionOrderLines.quantityProduced,
            bandsPreparedKg: productionOrderLines.bandsPreparedKg,
            materialCost: productionOrderLines.materialCost,
            laborCost: productionOrderLines.laborCost,
            energyCost: productionOrderLines.energyCost,
            accessoriesCost: productionOrderLines.accessoriesCost,
            totalCost: productionOrderLines.totalCost,
          })
          .from(productionOrderLines)
          .innerJoin(products, eq(productionOrderLines.productId, products.id))
          .innerJoin(
            productTechnicalSpecs,
            eq(productionOrderLines.technicalSpecId, productTechnicalSpecs.id),
          )
          .where(inArray(productionOrderLines.productionOrderId, orderIds))
          .orderBy(asc(productionOrderLines.createdAt));
  const linesByOrder = new Map<
    string,
    (typeof lineRows)[number][]
  >();
  for (const line of lineRows) {
    const lines = linesByOrder.get(line.productionOrderId) ?? [];
    lines.push(line);
    linesByOrder.set(line.productionOrderId, lines);
  }
  const orders = orderRows.map((order) => ({
    ...order,
    lines: linesByOrder.get(order.id) ?? [],
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
              Production
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#758178]">
              Fabriquez plusieurs produits dans un ordre, suivez chaque stock
              fini et contrôlez le bilan matière et les coûts.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ExportLink href="/api/exports/production">
              Exporter la production (CSV/Excel)
            </ExportLink>
            <ExportLink href="/api/exports/stock-produits">
              Mouvements de produits finis
            </ExportLink>
            <ExportLink href="/production/rapport">
              Rapport imprimable / PDF
            </ExportLink>
          </div>
        </header>

        <ProductionManagement
          defaultDate={localDateInputValue(new Date())}
          finishedStock={finishedStock}
          materialStock={materialStock}
          totalProductsProduced={productionTotals[0]?.quantity ?? 0}
          productSpecs={productSpecRows}
          orders={orders}
        />
      </div>
    </main>
  );
}
