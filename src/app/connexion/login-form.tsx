"use client";

import { useActionState } from "react";
import { authenticate } from "@/app/connexion/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(authenticate, {});

  return (
    <form action={action} className="mt-7 space-y-5">
      <div>
        <label
          className="mb-2 block text-sm font-semibold text-[#26374b]"
          htmlFor="identifier"
        >
          Identifiant
        </label>
        <input
          autoComplete="username"
          className="min-h-12 w-full rounded-xl border border-[#dbe3ec] bg-white px-4 text-base text-[#17212b] outline-none transition focus:border-[#0b428a] focus:ring-2 focus:ring-[#0b428a]/15"
          id="identifier"
          maxLength={32}
          name="identifier"
          placeholder="Votre identifiant"
          required
        />
      </div>
      <div>
        <label
          className="mb-2 block text-sm font-semibold text-[#26374b]"
          htmlFor="password"
        >
          Mot de passe
        </label>
        <input
          autoComplete="current-password"
          className="min-h-12 w-full rounded-xl border border-[#dbe3ec] bg-white px-4 text-base text-[#17212b] outline-none transition focus:border-[#0b428a] focus:ring-2 focus:ring-[#0b428a]/15"
          id="password"
          name="password"
          required
          type="password"
        />
      </div>
      {state.error ? (
        <p
          aria-live="polite"
          className="rounded-xl border border-[#f0ceca] bg-[#fff5f3] px-4 py-3 text-sm text-[#9a342a]"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      <button
        className="min-h-12 w-full rounded-xl bg-[#0b428a] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#16345d] disabled:cursor-wait disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
