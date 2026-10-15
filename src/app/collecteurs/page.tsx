import Link from "next/link";
import { asc, desc, sql } from "drizzle-orm";
import { getDatabase } from "@/db";
import { collectors, deliveries } from "@/db/schema";
import { requirePermission } from "@/lib/auth/guards";
import { CollectorManagement } from "@/app/collecteurs/collector-management";
import { acceptanceRate } from "@/lib/collectors/metrics";
import { ExportLink } from "@/components/export-link";

export const instant = false;

const receivedTotal = sql<number>`coalesce(sum(${deliveries.receivedKg}::numeric), 0)::float8`
  .mapWith(Number)
  .as("received_kg_total");
const acceptedTotal = sql<number>`coalesce(sum(${deliveries.acceptedKg}::numeric), 0)::float8`
  .mapWith(Number)
  .as("accepted_kg_total");
const deliveryCount = sql<number>`count(${deliveries.id})::int`
  .mapWith(Number)
  .as("delivery_count");

export default async function CollectorsPage() {
  await requirePermission("collectors:manage");

  const database = getDatabase();
  const [collectorRows, activeCollectors, deliveryRows] = await Promise.all([
    database
      .select({
        id: collectors.id,
        name: collectors.name,
        type: collectors.type,
        phone: collectors.phone,
        zone: collectors.zone,
        notes: collectors.notes,
        isActive: collectors.isActive,
        receivedKg: receivedTotal,
        acceptedKg: acceptedTotal,
        deliveryCount,
      })
      .from(collectors)
      .leftJoin(deliveries, sql`${deliveries.collectorId} = ${collectors.id}`)
      .groupBy(collectors.id)
      .orderBy(desc(acceptedTotal), asc(collectors.name)),
    database
      .select({
        id: collectors.id,
        name: collectors.name,
      })
      .from(collectors)
      .where(sql`${collectors.isActive} = true`)
      .orderBy(asc(collectors.name)),
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
        status: deliveries.status,
      })
      .from(deliveries)
      .innerJoin(collectors, sql`${deliveries.collectorId} = ${collectors.id}`)
      .orderBy(desc(deliveries.deliveryDate), desc(deliveries.createdAt))
      .limit(30),
  ]);

  const totals = collectorRows.reduce(
    (sum, collector) => ({
      receivedKg: sum.receivedKg + collector.receivedKg,
      acceptedKg: sum.acceptedKg + collector.acceptedKg,
      deliveries: sum.deliveries + collector.deliveryCount,
    }),
    { receivedKg: 0, acceptedKg: 0, deliveries: 0 },
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
              Collecteurs
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#758178]">
              Gérez les personnes et organisations qui apportent les déchets
              plastiques, puis consultez leurs livraisons et leur classement.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ExportLink href="/api/exports/collecteurs">
              Exporter les collecteurs (CSV/Excel)
            </ExportLink>
            <Link
              className="inline-flex min-h-11 items-center rounded-xl border border-[#d9e4da] bg-white px-4 py-2 text-sm font-semibold text-[#205d39] hover:bg-[#edf5ef]"
              href="/"
            >
              Retour au tableau de bord
            </Link>
          </div>
        </header>

        <section
          aria-label="Indicateurs des collecteurs"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          {[
            {
              label: "Collecteurs actifs",
              value: String(activeCollectors.length),
            },
            { label: "Apports enregistrés", value: String(totals.deliveries) },
            {
              label: "Poids reçu",
              value: `${totals.receivedKg.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} kg`,
            },
            {
              label: "Poids accepté",
              value: `${totals.acceptedKg.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} kg`,
              detail: `${acceptanceRate(totals).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} % des kilos reçus`,
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
              {"detail" in indicator ? (
                <p className="mt-1 text-xs text-[#758178]">
                  {indicator.detail}
                </p>
              ) : null}
            </article>
          ))}
        </section>

        <CollectorManagement
          collectors={collectorRows}
          deliveries={deliveryRows.map((delivery) => ({
            ...delivery,
            receivedKg: Number(delivery.receivedKg),
            acceptedKg:
              delivery.acceptedKg === null ? null : Number(delivery.acceptedKg),
            rejectedKg:
              delivery.rejectedKg === null ? null : Number(delivery.rejectedKg),
          }))}
          activeCollectors={activeCollectors}
        />
      </div>
    </main>
  );
}
