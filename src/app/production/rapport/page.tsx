import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { getDatabase } from "@/db";
import {
  productTechnicalSpecs,
  productionOrderLines,
  productionOrders,
  products,
  users,
} from "@/db/schema";
import { requirePermission } from "@/lib/auth/guards";
import { formatCurrency } from "@/lib/currency";
import { PrintButton } from "@/app/production/print-button";

export const instant = false;

function displayDate(value: string): string {
  return value.split("-").reverse().join("/");
}

export default async function ProductionReportPage() {
  await requirePermission("production:manage");
  const database = getDatabase();
  const [orders, lines] = await Promise.all([
    database
      .select({
        id: productionOrders.id,
        productionDate: productionOrders.productionDate,
        supervisorName: users.displayName,
        plasticType: productionOrders.plasticType,
        materialUsedKg: productionOrders.materialUsedKg,
        lossKg: productionOrders.lossKg,
        totalCost: productionOrders.totalCost,
      })
      .from(productionOrders)
      .innerJoin(users, eq(productionOrders.supervisorId, users.id))
      .orderBy(
        desc(productionOrders.productionDate),
        desc(productionOrders.createdAt),
      ),
    database
      .select({
        productionOrderId: productionOrderLines.productionOrderId,
        productName: products.name,
        productCode: products.code,
        specVersion: productTechnicalSpecs.version,
        quantityProduced: productionOrderLines.quantityProduced,
        bandsPreparedKg: productionOrderLines.bandsPreparedKg,
        totalCost: productionOrderLines.totalCost,
      })
      .from(productionOrderLines)
      .innerJoin(products, eq(productionOrderLines.productId, products.id))
      .innerJoin(
        productTechnicalSpecs,
        eq(productionOrderLines.technicalSpecId, productTechnicalSpecs.id),
      )
      .orderBy(asc(productionOrderLines.createdAt)),
  ]);

  const orderById = new Map(orders.map((order) => [order.id, order]));
  const reportLines = lines.flatMap((line) => {
    const order = orderById.get(line.productionOrderId);
    return order ? [{ ...line, order }] : [];
  });
  const totals = orders.reduce(
    (sum, order) => ({
      materialKg: sum.materialKg + Number(order.materialUsedKg),
      lossesKg: sum.lossesKg + Number(order.lossKg),
      cost: sum.cost + Number(order.totalCost),
    }),
    { materialKg: 0, lossesKg: 0, cost: 0 },
  );
  const lineTotals = reportLines.reduce(
    (sum, line) => ({
      bandsKg: sum.bandsKg + Number(line.bandsPreparedKg),
      quantity: sum.quantity + line.quantityProduced,
    }),
    { bandsKg: 0, quantity: 0 },
  );
  const quantitiesByProduct = new Map<string, number>();
  for (const line of reportLines) {
    const key = `${line.productName} (${line.productCode})`;
    quantitiesByProduct.set(
      key,
      (quantitiesByProduct.get(key) ?? 0) + line.quantityProduced,
    );
  }

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
          Rapport de production multi-produits
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
          ["Ordres", String(orders.length)],
          ["Matière utilisée", `${totals.materialKg.toLocaleString("fr-FR")} kg`],
          ["Bandes préparées", `${lineTotals.bandsKg.toLocaleString("fr-FR")} kg`],
          ["Pertes", `${totals.lossesKg.toLocaleString("fr-FR")} kg`],
          ["Unités fabriquées", lineTotals.quantity.toLocaleString("fr-FR")],
        ].map(([label, value]) => (
          <div className="rounded-xl border border-[#e3ebe4] p-4" key={label}>
            <p className="text-xs text-[#65736a]">{label}</p>
            <p className="mt-1 font-semibold text-[#193b29]">{value}</p>
          </div>
        ))}
      </section>
      <p className="mb-2 text-sm font-semibold text-[#193b29]">
        Coût total de production : {formatCurrency(totals.cost)}
      </p>
      <p className="mb-4 text-sm text-[#65736a]">
        {Array.from(quantitiesByProduct.entries())
          .map(([product, quantity]) => `${product} : ${quantity}`)
          .join(" · ") || "Aucun produit fabriqué"}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs sm:text-sm">
          <thead>
            <tr className="border-y border-[#cbd9cd] bg-[#f4f7f4]">
              {[
                "Date",
                "Ordre",
                "Responsable",
                "Plastique",
                "Produit",
                "Fiche",
                "Quantité",
                "Bandes (kg)",
                "Coût ligne",
                "Coût / unité",
              ].map((heading) => (
                <th className="px-2 py-3 font-semibold" key={heading}>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reportLines.length === 0 ? (
              <tr>
                <td className="px-2 py-5 text-center text-[#65736a]" colSpan={10}>
                  Aucun ordre de production enregistré.
                </td>
              </tr>
            ) : (
              reportLines.map((line, index) => (
                <tr
                  className="border-b border-[#e3ebe4]"
                  key={`${line.productionOrderId}-${index}`}
                >
                  <td className="whitespace-nowrap px-2 py-3">
                    {displayDate(line.order.productionDate)}
                  </td>
                  <td className="px-2 py-3">{line.productionOrderId.slice(0, 8)}</td>
                  <td className="px-2 py-3">{line.order.supervisorName}</td>
                  <td className="px-2 py-3">{line.order.plasticType}</td>
                  <td className="px-2 py-3">
                    {line.productName} ({line.productCode})
                  </td>
                  <td className="px-2 py-3">v{line.specVersion}</td>
                  <td className="px-2 py-3">{line.quantityProduced}</td>
                  <td className="px-2 py-3">{line.bandsPreparedKg}</td>
                  <td className="whitespace-nowrap px-2 py-3">
                    {formatCurrency(line.totalCost)}
                  </td>
                  <td className="whitespace-nowrap px-2 py-3">
                    {formatCurrency(
                      Number(line.totalCost) / line.quantityProduced,
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {reportLines.length > 0 ? (
            <tfoot>
              <tr className="border-t-2 border-[#cbd9cd] font-semibold">
                <td className="px-2 py-3" colSpan={6}>
                  Totaux
                </td>
                <td className="px-2 py-3">{lineTotals.quantity}</td>
                <td className="px-2 py-3">{lineTotals.bandsKg.toFixed(3)}</td>
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
