import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
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
      <section className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[#e3e9f0] bg-white p-6 shadow-sm sm:p-9">
        <div aria-hidden="true" className="brand-color-bar absolute inset-x-0 top-0 h-1" />
        <Link className="inline-flex items-center gap-3" href="/">
          <Image
            alt="Logo FERNOTECH"
            className="size-20 rounded-xl border border-[#dbe3ec] bg-white object-contain p-1"
            height={768}
            priority
            src="/fernotech-logo.png"
            width={768}
          />
          <span className="text-sm font-bold tracking-[0.12em] text-[#17212b]">
            ECO-TRACK
          </span>
        </Link>
        <h1 className="mt-8 text-2xl font-semibold tracking-tight text-[#17212b]">
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
