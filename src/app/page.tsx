import Link from "next/link";
import Image from "next/image";
import { roleHasPermission } from "@/lib/auth/roles";
import { signOut } from "@/auth";
import { requirePermission } from "@/lib/auth/guards";
import { roleLabels } from "@/lib/auth/roles";
import { DashboardChartsLoader } from "@/app/dashboard-charts-loader";
import { getAvailableYears, getDashboardData } from "@/lib/dashboard/data";
import { resolveDashboardPeriod } from "@/lib/dashboard/period";
import { kilogramsToTonnes } from "@/lib/dashboard/calculations";
import { CURRENCY_CODE, CURRENCY_LABEL, formatCurrency } from "@/lib/currency";

export const instant = false;

const stages = [
  { number: "01", label: "Collecte", description: "Suivre les apports" },
  { number: "02", label: "Tri", description: "Peser et qualifier" },
  { number: "03", label: "Production", description: "Transformer en produits" },
  { number: "04", label: "Ventes", description: "Vendre et encaisser" },
];

const kilogramFormat = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 3,
});
const integerFormat = new Intl.NumberFormat("fr-FR");


function weightLabel(value: string | number): string {
  const kilograms = String(value);
  const tonnes = kilogramsToTonnes(kilograms);
  return `${kilogramFormat.format(Number(kilograms))} kg (${kilogramFormat.format(Number(tonnes))} t)`;
}

function displayDate(value: string): string {
  return value.split("-").reverse().join("/");
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string | string[];
    to?: string | string[];
    year?: string | string[];
  }>;
}) {
  const user = await requirePermission("dashboard:read");
  const [resolvedParams, availableYears] = await Promise.all([
    searchParams,
    getAvailableYears(),
  ]);
  const period = resolveDashboardPeriod(resolvedParams);
  const data = await getDashboardData(period.from, period.to);
  const totalMaterialStockKg = data.materialStock.reduce(
    (total, stock) => total + stock.quantityKg,
    0,
  );

  const indicators = [
    {
      label: "Plastique collecté",
      value: weightLabel(data.totals.receivedKg),
      detail: `Accepté ${weightLabel(data.totals.acceptedKg)} · Rejeté ${weightLabel(data.totals.rejectedKg)}`,
      icon: "↓",
    },
    {
      label: "Matière transformée",
      value: weightLabel(data.totals.materialUsedKg),
      detail: `Pertes déclarées : ${weightLabel(data.totals.lossKg)}`,
      icon: "↻",
    },
    {
      label: "Produits fabriqués",
      value: integerFormat.format(data.totals.unitsProduced),
      detail: "Ordres de fabrication de la période (tous produits)",
      icon: "⌁",
    },
    {
      label: "Produits vendus",
      value: integerFormat.format(data.totals.unitsSold),
      detail: "Ventes livrées durant la période (tous produits)",
      icon: "↗",
    },
    {
      label: "Stock matière",
      value: weightLabel(totalMaterialStockKg),
      detail: "Solde calculé depuis tous les mouvements",
      icon: "◈",
    },
    {
      label: "Stock produits finis",
      value: integerFormat.format(data.finishedProductStock),
      detail: "Total des unités disponibles en stock",
      icon: "▤",
    },
    {
      label: "Coût de production",
      value: formatCurrency(data.totals.totalProductionCost),
      detail: "Total des fabrications de la période",
      icon: "◉",
    },
    {
      label: "Recettes",
      value: formatCurrency(data.totals.revenue),
      detail: "Montant facturé pour les ventes de la période",
      icon: "↗",
    },
    {
      label: "Encaissements",
      value: formatCurrency(data.totals.paymentsCollected),
      detail: "Règlements reçus pendant la période",
      icon: "＋",
    },
    {
      label: "Créances ouvertes",
      value: formatCurrency(data.totals.outstandingReceivables),
      detail: "Solde restant dû sur toutes les ventes",
      icon: "…",
    },
    {
      label: "Marge estimée",
      value: data.totals.estimatedMargin === null
        ? "—"
        : formatCurrency(data.totals.estimatedMargin),
      detail: "Recettes moins coût historique estimé des unités vendues",
      icon: "≈",
    },
  ];

  return (
    <main className="min-h-screen px-4 py-5 sm:px-8 sm:py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[#e3e9f0] bg-white px-5 py-4 shadow-sm sm:px-7">
          <div aria-hidden="true" className="brand-color-bar absolute inset-x-0 top-0 h-1" />
          <a className="flex items-center gap-3" href="#accueil">
            <Image
              alt="Logo FERNOTECH"
              className="size-16 shrink-0 rounded-xl border border-[#dbe3ec] bg-white object-contain p-1"
              height={768}
              priority
              src="/fernotech-logo.png"
              width={768}
            />
            <span className="block text-sm font-bold tracking-[0.12em] text-[#17212b]">
              ECO-TRACK
            </span>
          </a>
          <nav
            aria-label="Navigation principale"
            className="flex flex-wrap items-center gap-2"
          >
            <a
              className="rounded-xl bg-[#eaf1fa] px-4 py-3 text-sm font-semibold text-[#0b428a]"
              href="#accueil"
            >
              Tableau de bord
            </a>
            <span className="px-2 text-sm text-[#65736a]">
              {user.displayName} · {roleLabels[user.role]}
            </span>
            {roleHasPermission(user.role, "collectors:manage") ? (
              <Link
                className="rounded-xl px-4 py-3 text-sm font-semibold text-[#0b428a] hover:bg-[#eaf1fa]"
                href="/collecteurs"
              >
                Collecteurs
              </Link>
            ) : null}
            {roleHasPermission(user.role, "sorting:manage") ? (
              <Link
                className="rounded-xl px-4 py-3 text-sm font-semibold text-[#0b428a] hover:bg-[#eaf1fa]"
                href="/tri"
              >
                Tri et stock matière
              </Link>
            ) : null}
            {roleHasPermission(user.role, "production:manage") ? (
              <Link
                className="rounded-xl px-4 py-3 text-sm font-semibold text-[#0b428a] hover:bg-[#eaf1fa]"
                href="/production"
              >
                Production
              </Link>
            ) : null}
            {roleHasPermission(user.role, "products:manage") ? (
              <Link
                className="rounded-xl px-4 py-3 text-sm font-semibold text-[#0b428a] hover:bg-[#eaf1fa]"
                href="/produits"
              >
                Catalogue produits
              </Link>
            ) : null}
            {roleHasPermission(user.role, "production:manage") ? (
              <Link
                className="rounded-xl border border-[#c9ddcd] px-4 py-3 text-sm font-semibold text-[#0b428a] hover:bg-[#eaf1fa]"
                href="/hors-ligne.html"
              >
                Préparer l’espace hors ligne
              </Link>
            ) : null}
            {roleHasPermission(user.role, "sales:manage") ? (
              <Link
                className="rounded-xl px-4 py-3 text-sm font-semibold text-[#0b428a] hover:bg-[#eaf1fa]"
                href="/ventes"
              >
                Ventes et règlements
              </Link>
            ) : null}
            {user.role === "administrateur" ? (
              <Link
                className="rounded-xl px-4 py-3 text-sm font-semibold text-[#0b428a] hover:bg-[#eaf1fa]"
                href="/utilisateurs"
              >
                Utilisateurs
              </Link>
            ) : null}
            <span className="rounded-xl px-3 py-3 text-sm text-[#77847b]">
              {CURRENCY_CODE} · {CURRENCY_LABEL}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/connexion" });
              }}
            >
              <button
                className="min-h-11 rounded-xl border border-[#dbe3ec] px-4 py-2 text-sm font-semibold text-[#526173] hover:bg-[#f6f8fb]"
                type="submit"
              >
                Se déconnecter
              </button>
            </form>
          </nav>
        </header>

        <section
          aria-label="Filtrer le tableau de bord par période"
          className="rounded-2xl border border-[#e3e9f0] bg-white p-4 shadow-sm sm:p-5"
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef3ef] pb-3">
              <span className="text-sm font-semibold text-[#28384d]">
                Filtrer par année :
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {availableYears.map((yr) => (
                  <Link
                    key={yr}
                    href={`/?year=${yr}`}
                    className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
                      period.mode === "year" && period.year === String(yr)
                        ? "bg-[#0b428a] text-white"
                        : "border border-[#dbe3ec] bg-white text-[#0b428a] hover:bg-[#eaf1fa]"
                    }`}
                  >
                    Année {yr}
                  </Link>
                ))}
              </div>
            </div>

            <form
              action="/"
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
              method="get"
            >
              <label className="flex flex-1 flex-col gap-2 text-sm font-semibold text-[#28384d]">
                Du
                <input
                  className="min-h-12 rounded-xl border border-[#dbe3ec] bg-white px-4 text-sm text-[#17212b] outline-none focus:border-[#0b428a] focus:ring-2 focus:ring-[#0b428a]/15"
                  name="from"
                  required
                  type="date"
                  defaultValue={period.from}
                />
              </label>
              <label className="flex flex-1 flex-col gap-2 text-sm font-semibold text-[#28384d]">
                Au
                <input
                  className="min-h-12 rounded-xl border border-[#dbe3ec] bg-white px-4 text-sm text-[#17212b] outline-none focus:border-[#0b428a] focus:ring-2 focus:ring-[#0b428a]/15"
                  name="to"
                  required
                  type="date"
                  defaultValue={period.to}
                />
              </label>
              <button
                className="min-h-12 rounded-xl bg-[#0b428a] px-5 py-3 text-sm font-semibold text-white hover:bg-[#16345d]"
                type="submit"
              >
                Période personnalisée
              </button>
            </form>
          </div>
          {period.error ? (
            <p className="mt-3 text-sm text-[#9a342a]" role="alert">
              {period.error} La période affichée a été ramenée au mois courant.
            </p>
          ) : null}
          <p className="mt-3 text-xs text-[#758178]">
            {period.mode === "year"
              ? `Année affichée : ${period.year} (du 01/01/${period.year} au 31/12/${period.year}).`
              : `Période affichée : du ${displayDate(period.from)} au ${displayDate(period.to)}.`}
          </p>
        </section>

        <section
          aria-labelledby="welcome-title"
          className="relative overflow-hidden rounded-3xl bg-[#16345d] px-6 py-8 text-white shadow-sm sm:px-10 sm:py-10"
          id="accueil"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-28 size-80 rounded-full border border-white/10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-2 -top-14 size-52 rounded-full border border-white/10"
          />
          <div className="relative max-w-2xl">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#c7d7ec]">
              Le plastique reprend vie
            </p>
            <h1
              className="max-w-xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl"
              id="welcome-title"
            >
              Chaque kilo collecté compte.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-[#d8e2ef] sm:text-base">
              Suivez vos collectes, votre production multi-produits et vos
              ventes depuis un seul espace.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-medium text-[#e5f1e8]">
              <span
                aria-hidden="true"
                className="size-2 rounded-full bg-[#a9d9a7]"
              />
              Données du {displayDate(period.from)} au {displayDate(period.to)}
            </div>
          </div>
        </section>

        <section aria-labelledby="indicators-title">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <h2
                className="text-lg font-semibold text-[#17212b]"
                id="indicators-title"
              >
                Vue d’ensemble
              </h2>
              <p className="mt-1 text-sm text-[#758178]">
                Collectes, production globale, ventes et règlements de la
                période. Poids présentés en kg et tonnes équivalentes (1 000 kg = 1 t).
              </p>
            </div>
            <span className="hidden text-xs font-medium text-[#758178] sm:inline">
              Stock et créances : soldes actuels
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {indicators.map((indicator) => (
              <article
                className="rounded-2xl border border-[#e3e9f0] bg-white p-5 shadow-sm"
                key={indicator.label}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-[#65736a]">
                    {indicator.label}
                  </p>
                  <span
                    aria-hidden="true"
                    className="flex size-9 items-center justify-center rounded-xl bg-[#eaf1fa] text-lg font-semibold text-[#0b428a]"
                  >
                    {indicator.icon}
                  </span>
                </div>
                <p className="mt-5 text-2xl font-semibold tracking-tight text-[#17212b]">
                  {indicator.value}
                </p>
                <p className="mt-1 text-xs text-[#819087]">{indicator.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="products-summary-title">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <h2
                className="text-lg font-semibold text-[#17212b]"
                id="products-summary-title"
              >
                Indicateurs par produit du catalogue
              </h2>
              <p className="mt-1 text-sm text-[#758178]">
                Quantités fabriquées et vendues, coûts, recettes de la période et stocks courants.
              </p>
            </div>
            <Link
              className="text-xs font-semibold text-[#0b428a] hover:underline"
              href="/produits"
            >
              Gérer le catalogue →
            </Link>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-[#e3e9f0] bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#e3e9f0] bg-[#f7faf8] text-xs font-semibold text-[#65736a]">
                <tr>
                  <th className="px-4 py-3 sm:px-6">Produit</th>
                  <th className="px-4 py-3 text-right">Fabriqués</th>
                  <th className="px-4 py-3 text-right">Coût total</th>
                  <th className="px-4 py-3 text-right">Coût unitaire</th>
                  <th className="px-4 py-3 text-right">Vendus</th>
                  <th className="px-4 py-3 text-right">Recettes</th>
                  <th className="px-4 py-3 text-right">Marge estimée</th>
                  <th className="px-4 py-3 text-right sm:px-6">Stock actuel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf1ed] text-[#17212b]">
                {data.productsSummary.map((p) => (
                  <tr className="hover:bg-[#fbfdfb]" key={p.productId}>
                    <td className="px-4 py-3.5 sm:px-6">
                      <div className="font-semibold text-[#17212b]">
                        {p.productName}
                      </div>
                      <div className="text-xs text-[#758178]">
                        {p.productCode} · {p.unitLabel}{" "}
                        {!p.isActive ? "(inactif)" : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium">
                      {integerFormat.format(p.quantityProduced)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-[#526173]">
                      {p.quantityProduced > 0
                        ? formatCurrency(p.productionCost)
                        : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-right text-[#526173]">
                      {p.averageProductionCost
                        ? formatCurrency(p.averageProductionCost)
                        : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium">
                      {integerFormat.format(p.quantitySold)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-[#526173]">
                      {p.quantitySold > 0 ? formatCurrency(p.revenue) : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-right text-[#526173]">
                      {p.estimatedMargin === null
                        ? "—"
                        : formatCurrency(p.estimatedMargin)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-[#0b428a] sm:px-6">
                      {integerFormat.format(p.currentStock)} {p.unitLabel}(s)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section
          aria-labelledby="impact-title"
          className="rounded-2xl border border-[#cfe3d3] bg-[#edf7ef] p-5 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-6 sm:px-7"
        >
          <div>
            <h2
              className="text-lg font-semibold text-[#17212b]"
              id="impact-title"
            >
              Plastique détourné de l’environnement
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#52685a]">
              Indicateur calculé uniquement à partir du poids accepté au tri,
              pour la période sélectionnée (1 000 kg = 1 t).
            </p>
          </div>
          <p className="mt-3 whitespace-nowrap text-3xl font-semibold text-[#0b428a] sm:mt-0">
            {weightLabel(data.totals.acceptedKg)}
          </p>
        </section>

        <DashboardChartsLoader data={data.monthly} />

        <section
          aria-label="Classement des collecteurs et détail du stock matière"
          className="grid gap-4 lg:grid-cols-2"
        >
          <article className="rounded-2xl border border-[#e3e9f0] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[#17212b]">
              Top collecteurs
            </h2>
            <p className="mt-1 text-sm text-[#758178]">
              Classement par poids accepté pendant la période.
            </p>
            {data.topCollectors.length > 0 ? (
              <ol className="mt-4 divide-y divide-[#edf1ed]">
                {data.topCollectors.map((collector, index) => (
                  <li
                    className="flex items-center justify-between gap-3 py-3"
                    key={collector.id}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#eaf1fa] text-sm font-semibold text-[#0b428a]">
                        {index + 1}
                      </span>
                      <span className="truncate text-sm font-medium text-[#26374b]">
                        {collector.name}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-[#0b428a]">
                      {weightLabel(collector.acceptedKg)}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-4 rounded-xl bg-[#f6f8fb] p-4 text-sm text-[#758178]">
                Aucun poids accepté sur cette période.
              </p>
            )}
          </article>
          <article className="rounded-2xl border border-[#e3e9f0] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[#17212b]">
              Stock matière par type
            </h2>
            <p className="mt-1 text-sm text-[#758178]">
              Soldes actuels calculés à partir des entrées et sorties tracées.
            </p>
            {data.materialStock.length > 0 ? (
              <ul className="mt-4 divide-y divide-[#edf1ed]">
                {data.materialStock.map((stock) => (
                  <li
                    className="flex items-center justify-between gap-3 py-3"
                    key={stock.plasticType}
                  >
                    <span className="text-sm font-medium text-[#26374b]">
                      {stock.plasticType}
                    </span>
                    <span className="text-sm font-semibold text-[#0b428a]">
                      {weightLabel(stock.quantityKg)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 rounded-xl bg-[#f6f8fb] p-4 text-sm text-[#758178]">
                Aucun stock matière disponible.
              </p>
            )}
          </article>
        </section>

        <section
          aria-labelledby="chain-title"
          className="rounded-2xl border border-[#e3e9f0] bg-white p-5 shadow-sm sm:p-7"
        >
          <div className="mb-5">
            <h2
              className="text-lg font-semibold text-[#17212b]"
              id="chain-title"
            >
              Votre chaîne de valorisation
            </h2>
            <p className="mt-1 text-sm text-[#758178]">
              Une traçabilité continue, de la collecte au règlement.
            </p>
          </div>
          <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stages.map((stage) => (
              <li
                className="flex items-center gap-3 rounded-xl bg-[#f6f8fb] p-4"
                key={stage.number}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#dbe3ec] bg-white text-xs font-bold text-[#0b428a]">
                  {stage.number}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-[#26374b]">
                    {stage.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-[#7d8b81]">
                    {stage.description}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <footer className="pb-3 text-center text-xs text-[#839087]">
          FERNOTECH ECO-TRACK · La matière se suit, elle ne s&apos;estime pas.
        </footer>
      </div>
    </main>
  );
}
