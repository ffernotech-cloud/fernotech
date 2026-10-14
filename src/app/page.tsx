import Link from "next/link";
import { roleHasPermission } from "@/lib/auth/roles";
import { signOut } from "@/auth";
import { requirePermission } from "@/lib/auth/guards";
import { roleLabels } from "@/lib/auth/roles";

export const instant = false;

const indicators = [
  {
    label: "Plastique collecté",
    value: "0 kg",
    detail: "Aucune livraison enregistrée",
    icon: "↓",
  },
  {
    label: "Matière en stock",
    value: "0 kg",
    detail: "Calculée depuis les mouvements",
    icon: "◈",
  },
  {
    label: "Balais fabriqués",
    value: "0",
    detail: "Aucun ordre de fabrication",
    icon: "⌁",
  },
  {
    label: "Balais vendus",
    value: "0",
    detail: "Aucune vente enregistrée",
    icon: "↗",
  },
];

const stages = [
  { number: "01", label: "Collecte", description: "Suivre les apports" },
  { number: "02", label: "Tri", description: "Peser et qualifier" },
  { number: "03", label: "Production", description: "Transformer en balais" },
  { number: "04", label: "Ventes", description: "Vendre et encaisser" },
];

export default async function Home() {
  const user = await requirePermission("dashboard:read");

  return (
    <main className="min-h-screen px-4 py-5 sm:px-8 sm:py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#e3ebe4] bg-white px-5 py-4 shadow-sm sm:px-7">
          <a className="flex items-center gap-3" href="#accueil">
            <span className="flex size-11 items-center justify-center rounded-xl bg-[#e9f4ec] text-xl text-[#23643e]">
              <span aria-hidden="true">✳</span>
            </span>
            <span>
              <span className="block text-sm font-bold tracking-[0.12em] text-[#173c29]">
                FERNOTECH
              </span>
              <span className="block text-xs font-medium text-[#728078]">
                ECO-TRACK
              </span>
            </span>
          </a>
          <nav
            aria-label="Navigation principale"
            className="flex flex-wrap items-center gap-2"
          >
            <a
              className="rounded-xl bg-[#edf5ef] px-4 py-3 text-sm font-semibold text-[#205d39]"
              href="#accueil"
            >
              Tableau de bord
            </a>
            <span className="px-2 text-sm text-[#65736a]">
              {user.displayName} · {roleLabels[user.role]}
            </span>
            {roleHasPermission(user.role, "collectors:manage") ? (
              <Link
                className="rounded-xl px-4 py-3 text-sm font-semibold text-[#205d39] hover:bg-[#edf5ef]"
                href="/collecteurs"
              >
                Collecteurs
              </Link>
            ) : null}
            {roleHasPermission(user.role, "sorting:manage") ? (
              <Link
                className="rounded-xl px-4 py-3 text-sm font-semibold text-[#205d39] hover:bg-[#edf5ef]"
                href="/tri"
              >
                Tri et stock matière
              </Link>
            ) : null}
            {roleHasPermission(user.role, "production:manage") ? (
              <Link
                className="rounded-xl px-4 py-3 text-sm font-semibold text-[#205d39] hover:bg-[#edf5ef]"
                href="/production"
              >
                Production
              </Link>
            ) : null}
            {user.role === "administrateur" ? (
              <Link
                className="rounded-xl px-4 py-3 text-sm font-semibold text-[#205d39] hover:bg-[#edf5ef]"
                href="/utilisateurs"
              >
                Utilisateurs
              </Link>
            ) : null}
            <span className="rounded-xl px-3 py-3 text-sm text-[#77847b]">
              XAF · FCFA
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/connexion" });
              }}
            >
              <button
                className="min-h-11 rounded-xl border border-[#d9e4da] px-4 py-2 text-sm font-semibold text-[#526258] hover:bg-[#f6f9f6]"
                type="submit"
              >
                Se déconnecter
              </button>
            </form>
          </nav>
        </header>

        <section
          aria-labelledby="welcome-title"
          className="relative overflow-hidden rounded-3xl bg-[#17472e] px-6 py-8 text-white shadow-sm sm:px-10 sm:py-10"
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
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#b7d7c0]">
              Le plastique reprend vie
            </p>
            <h1
              className="max-w-xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl"
              id="welcome-title"
            >
              Chaque kilo collecté compte.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-[#d6e6da] sm:text-base">
              Suivez vos collectes, votre production et vos ventes depuis un
              seul espace.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-medium text-[#e5f1e8]">
              <span
                aria-hidden="true"
                className="size-2 rounded-full bg-[#a9d9a7]"
              />
              Application initialisée · Données en attente
            </div>
          </div>
        </section>

        <section aria-labelledby="indicators-title">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <h2
                className="text-lg font-semibold text-[#193b29]"
                id="indicators-title"
              >
                Vue d’ensemble
              </h2>
              <p className="mt-1 text-sm text-[#758178]">
                Les indicateurs apparaîtront avec vos premières opérations.
              </p>
            </div>
            <span className="hidden text-xs font-medium text-[#758178] sm:inline">
              Tous les chiffres sont à zéro
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {indicators.map((indicator) => (
              <article
                className="rounded-2xl border border-[#e3ebe4] bg-white p-5 shadow-sm"
                key={indicator.label}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-[#65736a]">
                    {indicator.label}
                  </p>
                  <span
                    aria-hidden="true"
                    className="flex size-9 items-center justify-center rounded-xl bg-[#edf5ef] text-lg font-semibold text-[#286542]"
                  >
                    {indicator.icon}
                  </span>
                </div>
                <p className="mt-5 text-3xl font-semibold tracking-tight text-[#193b29]">
                  {indicator.value}
                </p>
                <p className="mt-1 text-xs text-[#819087]">{indicator.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="chain-title"
          className="rounded-2xl border border-[#e3ebe4] bg-white p-5 shadow-sm sm:p-7"
        >
          <div className="mb-5">
            <h2
              className="text-lg font-semibold text-[#193b29]"
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
                className="flex items-center gap-3 rounded-xl bg-[#f6f9f6] p-4"
                key={stage.number}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#d9e7dc] bg-white text-xs font-bold text-[#286542]">
                  {stage.number}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-[#264432]">
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
