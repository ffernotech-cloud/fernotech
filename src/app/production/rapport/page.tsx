import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDatabase } from "@/db";
import { productionOrders, users } from "@/db/schema";
import { requirePermission } from "@/lib/auth/guards";
import { formatCurrency } from "@/lib/currency";
import { PrintButton } from "@/app/production/print-button";

export const instant = false;

function displayDate(value: string): string {
  return value.split("-").reverse().join("/");
}

export default async function ProductionReportPage() {
  await requirePermission("production:manage");
  const rows = await getDatabase()
    .select({
      productionDate: productionOrders.productionDate,
      supervisorName: users.displayName,
      plasticType: productionOrders.plasticType,
      materialUsedKg: productionOrders.materialUsedKg,
      bandsPreparedKg: productionOrders.bandsPreparedKg,
      broomsProduced: productionOrders.broomsProduced,
      lossKg: productionOrders.lossKg,
      totalCost: productionOrders.totalCost,
    })
    .from(productionOrders)
    .innerJoin(users, eq(productionOrders.supervisorId, users.id))
    .orderBy(desc(productionOrders.productionDate), desc(productionOrders.createdAt));

  const totals = rows.reduce(
    (sum, row) => ({
      materialKg: sum.materialKg + Number(row.materialUsedKg),
      bandsKg: sum.bandsKg + Number(row.bandsPreparedKg),
      brooms: sum.brooms + row.broomsProduced,
      lossesKg: sum.lossesKg + Number(row.lossKg),
      cost: sum.cost + Number(row.totalCost),
    }),
    { materialKg: 0, bandsKg: 0, brooms: 0, lossesKg: 0, cost: 0 },
  );

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-8">
      <div className="print:hidden mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          className="text-sm font-semibold text-[#286542] hover:underline"
          href="/production"
        >
          ← Retour à la production
        </Link>
        <PrintButton />
      </div>
      <header className="mb-6 border-b border-[#d9e4da] pb-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#286542]">
          FERNOTECH ECO-TRACK
        </p>
        <h1 className="mt-2 text-2xl font-bold text-[#193b29]">
          Rapport de production
        </h1>
        <p className="mt-1 text-sm text-[#65736a]">
          Généré le{" "}
          {new Intl.DateTimeFormat("fr-FR", {
            dateStyle: "long",
            timeZone: "Africa/Douala",
          }).format(new Date())}
        </p>
      </header>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Ordres", String(rows.length)],
          ["Matière utilisée", `${totals.materialKg.toLocaleString("fr-FR")} kg`],
          ["Bandes préparées", `${totals.bandsKg.toLocaleString("fr-FR")} kg`],
          ["Pertes", `${totals.lossesKg.toLocaleString("fr-FR")} kg`],
          ["Balais fabriqués", totals.brooms.toLocaleString("fr-FR")],
        ].map(([label, value]) => (
          <div className="rounded-xl border border-[#e3ebe4] p-4" key={label}>
            <p className="text-xs text-[#65736a]">{label}</p>
            <p className="mt-1 font-semibold text-[#193b29]">{value}</p>
          </div>
        ))}
      </section>
      <p className="mb-4 text-sm font-semibold text-[#193b29]">
        Coût total de production : {formatCurrency(totals.cost)}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs sm:text-sm">
          <thead>
            <tr className="border-y border-[#cbd9cd] bg-[#f4f7f4]">
              {[
                "Date",
                "Responsable",
                "Plastique",
                "Utilisé (kg)",
                "Bandes (kg)",
                "Pertes (kg)",
                "Balais",
                "Coût total",
                "Coût / balai",
              ].map((heading) => (
                <th className="px-2 py-3 font-semibold" key={heading}>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-2 py-5 text-center text-[#65736a]" colSpan={9}>
                  Aucun ordre de production enregistré.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr
                  className="border-b border-[#e3ebe4]"
                  key={`${row.productionDate}-${index}`}
                >
                  <td className="whitespace-nowrap px-2 py-3">
                    {displayDate(row.productionDate)}
                  </td>
                  <td className="px-2 py-3">{row.supervisorName}</td>
                  <td className="px-2 py-3">{row.plasticType}</td>
                  <td className="px-2 py-3">{row.materialUsedKg}</td>
                  <td className="px-2 py-3">{row.bandsPreparedKg}</td>
                  <td className="px-2 py-3">{row.lossKg}</td>
                  <td className="px-2 py-3">{row.broomsProduced}</td>
                  <td className="whitespace-nowrap px-2 py-3">
                    {formatCurrency(row.totalCost)}
                  </td>
                  <td className="whitespace-nowrap px-2 py-3">
                    {formatCurrency(
                      Number(row.totalCost) / row.broomsProduced,
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 ? (
            <tfoot>
              <tr className="border-t-2 border-[#cbd9cd] font-semibold">
                <td className="px-2 py-3" colSpan={3}>
                  Totaux
                </td>
                <td className="px-2 py-3">{totals.materialKg.toFixed(3)}</td>
                <td className="px-2 py-3">{totals.bandsKg.toFixed(3)}</td>
                <td className="px-2 py-3">{totals.lossesKg.toFixed(3)}</td>
                <td className="px-2 py-3">{totals.brooms}</td>
                <td className="px-2 py-3">{formatCurrency(totals.cost)}</td>
                <td className="px-2 py-3">—</td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </main>
  );
}
