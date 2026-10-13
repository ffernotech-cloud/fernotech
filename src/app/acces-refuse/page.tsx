import Link from "next/link";

export default function AccessDeniedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <section className="w-full max-w-lg rounded-3xl border border-[#e3ebe4] bg-white p-7 text-center shadow-sm sm:p-10">
        <span
          aria-hidden="true"
          className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#fff1ed] text-xl text-[#9a342a]"
        >
          !
        </span>
        <h1 className="mt-5 text-2xl font-semibold text-[#193b29]">
          Accès non autorisé
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#758178]">
          Votre rôle ne permet pas d’accéder à cette page. Si vous pensez qu’il
          s’agit d’une erreur, contactez l’administrateur.
        </p>
        <Link
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#205d39] px-5 py-3 text-sm font-semibold text-white hover:bg-[#17472e]"
          href="/"
        >
          Revenir au tableau de bord
        </Link>
      </section>
    </main>
  );
}
