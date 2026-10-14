import Link from "next/link";
import { asc, desc, sql } from "drizzle-orm";
import { getDatabase } from "@/db";
import {
  collectors,
  deliveries,
  materialStockMovements,
} from "@/db/schema";
import { requirePermission } from "@/lib/auth/guards";
import { MaterialSorting } from "@/app/tri/material-sorting";
import { availableMaterialKg } from "@/lib/sorting/calculations";

export const instant = false;

const stockBalance = sql<string>`
  coalesce(
    sum(
      case
        when ${materialStockMovements.movementType} = 'entree'
          then ${materialStockMovements.quantityKg}::numeric
        else -${materialStockMovements.quantityKg}::numeric
      end
    ),
    0
  )::text
`.as("stock_balance");

export default async function SortingPage() {
  await requirePermission("sorting:manage");
  const database = getDatabase();

  const [deliveryRows, stockRows, movementRows] = await Promise.all([
    database
      .select({
        id: deliveries.id,
        collectorName: collectors.name,
        deliveryDate: deliveries.deliveryDate,
        collectionPoint: deliveries.collectionPoint,
        plasticType: deliveries.plasticType,
        receivedKg: deliveries.receivedKg,
        acceptedKg: deliveries.acceptedKg,
        rejectedKg: deliveries.rejectedKg,
        rejectionReason: deliveries.rejectionReason,
        status: deliveries.status,
      })
      .from(deliveries)
      .innerJoin(collectors, sql`${deliveries.collectorId} = ${collectors.id}`)
      .orderBy(asc(deliveries.deliveryDate), asc(deliveries.createdAt)),
    database
      .select({
        plasticType: materialStockMovements.plasticType,
        quantityKg: stockBalance,
      })
      .from(materialStockMovements)
      .groupBy(materialStockMovements.plasticType)
      .having(sql`(${stockBalance})::numeric <> 0`)
      .orderBy(asc(materialStockMovements.plasticType)),
    database
      .select({
        id: materialStockMovements.id,
        plasticType: materialStockMovements.plasticType,
        movementType: materialStockMovements.movementType,
        quantityKg: materialStockMovements.quantityKg,
        reason: materialStockMovements.reason,
        createdAt: materialStockMovements.createdAt,
        deliveryDate: deliveries.deliveryDate,
        collectorName: collectors.name,
      })
      .from(materialStockMovements)
      .leftJoin(
        deliveries,
        sql`${materialStockMovements.deliveryId} = ${deliveries.id}`,
      )
      .leftJoin(collectors, sql`${deliveries.collectorId} = ${collectors.id}`)
      .orderBy(desc(materialStockMovements.createdAt))
      .limit(50),
  ]);

  const materialStock = stockRows.map((row) => ({
    plasticType: row.plasticType,
    quantityKg: Number(row.quantityKg),
  }));
  const totalStockKg = availableMaterialKg(
    stockRows.map((row) => ({
      movementType: "entree" as const,
      quantityKg: row.quantityKg,
    })),
  );

  return (
    <main className="min-h-screen px-4 py-5 sm:px-8 sm:py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              className="text-sm font-semibold text-[#286542] hover:underline"
              href="/"
            >
              ← Tableau de bord
            </Link>
            <h1 className="mt-3 text-2xl font-semibold text-[#193b29]">
              Tri et stock matière
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#758178]">
              Pesez les matières acceptées et rejetées. Seul le poids accepté
              peut entrer dans le stock.
            </p>
          </div>
        </header>

        <section
          aria-label="Indicateurs du tri et du stock matière"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          {[
            {
              label: "Apports à trier",
              value: String(deliveryRows.filter((row) => row.status === "recue").length),
            },
            {
              label: "Apports triés",
              value: String(deliveryRows.filter((row) => row.status === "triee").length),
            },
            {
              label: "Plastique disponible",
              value: `${totalStockKg.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} kg`,
            },
            {
              label: "Types de plastique en stock",
              value: String(materialStock.length),
            },
          ].map((indicator) => (
            <article
              className="rounded-2xl border border-[#e3ebe4] bg-white p-5 shadow-sm"
              key={indicator.label}
            >
              <p className="text-sm font-medium text-[#65736a]">
                {indicator.label}
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-[#193b29]">
                {indicator.value}
              </p>
            </article>
          ))}
        </section>

        <MaterialSorting
          deliveries={deliveryRows.map((delivery) => ({
            ...delivery,
            receivedKg: String(delivery.receivedKg),
            acceptedKg:
              delivery.acceptedKg === null ? null : String(delivery.acceptedKg),
            rejectedKg:
              delivery.rejectedKg === null ? null : String(delivery.rejectedKg),
          }))}
          materialStock={materialStock}
          movements={movementRows.map((movement) => ({
            ...movement,
            quantityKg: String(movement.quantityKg),
          }))}
        />
      </div>
    </main>
  );
}
