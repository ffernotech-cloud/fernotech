import Link from "next/link";
import { asc, desc, eq, sql } from "drizzle-orm";
import { getDatabase } from "@/db";
import {
  finishedProductStockMovements,
  materialStockMovements,
  productionOrders,
  users,
} from "@/db/schema";
import { requirePermission } from "@/lib/auth/guards";
import { availableMaterialKg } from "@/lib/sorting/calculations";
import { ProductionManagement } from "@/app/production/production-management";

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
          movementType: finishedProductStockMovements.movementType,
          quantity: finishedProductStockMovements.quantity,
        })
        .from(finishedProductStockMovements),
      database
        .select({
          id: productionOrders.id,
          productionDate: productionOrders.productionDate,
          plasticType: productionOrders.plasticType,
          materialUsedKg: productionOrders.materialUsedKg,
          bandsPreparedKg: productionOrders.bandsPreparedKg,
          broomsProduced: productionOrders.broomsProduced,
          lossKg: productionOrders.lossKg,
          lossReason: productionOrders.lossReason,
          materialCostPerKg: productionOrders.materialCostPerKg,
          laborCost: productionOrders.laborCost,
          energyCost: productionOrders.energyCost,
          accessoriesCost: productionOrders.accessoriesCost,
          materialCost: productionOrders.materialCost,
          totalCost: productionOrders.totalCost,
          supervisorName: users.displayName,
        })
        .from(productionOrders)
        .innerJoin(users, eq(productionOrders.supervisorId, users.id))
        .orderBy(desc(productionOrders.productionDate), desc(productionOrders.createdAt))
        .limit(50),
      database
        .select({
          broomsProduced: sql<number>`coalesce(sum(${productionOrders.broomsProduced}), 0)::int`
            .mapWith(Number)
            .as("brooms_produced"),
        })
        .from(productionOrders),
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
  const finishedStock = finishedMovementRows.reduce(
    (balance, movement) =>
      balance +
      (movement.movementType === "entree"
        ? movement.quantity
        : -movement.quantity),
    0,
  );

  return (
    <main className="min-h-screen px-4 py-5 sm:px-8 sm:py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header>
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
            Enregistrez les fabrications, contrôlez le bilan matière et suivez
            les coûts et les balais disponibles.
          </p>
        </header>

        <ProductionManagement
          defaultDate={localDateInputValue(new Date())}
          finishedStock={finishedStock}
          materialStock={materialStock}
          totalBroomsProduced={productionTotals[0]?.broomsProduced ?? 0}
          orders={orderRows}
        />
      </div>
    </main>
  );
}
