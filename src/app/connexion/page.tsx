import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/app/connexion/login-form";

export const metadata: Metadata = {
  title: "Connexion · FERNOTECH ECO-TRACK",
};

export const instant = false;

export default async function LoginPage({
  searchParams,
}: PageProps<"/connexion">) {
  const { compte } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <section className="w-full max-w-md rounded-3xl border border-[#e3ebe4] bg-white p-6 shadow-sm sm:p-9">
        <Link className="inline-flex items-center gap-3" href="/">
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
        </Link>
        <h1 className="mt-8 text-2xl font-semibold tracking-tight text-[#193b29]">
          Connexion à votre espace
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#758178]">
          Utilisez l’identifiant et le mot de passe fournis par
          l’administrateur.
        </p>
        {compte === "inactif" ? (
          <p
            className="mt-5 rounded-xl border border-[#f0ceca] bg-[#fff5f3] px-4 py-3 text-sm text-[#9a342a]"
            role="alert"
          >
            Ce compte n’est pas actif. Contactez l’administrateur.
          </p>
        ) : null}
        <LoginForm />
      </section>
    </main>
  );
}
