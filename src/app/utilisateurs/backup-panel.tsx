"use client";

import { useState } from "react";

const fieldClass =
  "min-h-12 w-full rounded-xl border border-[#d9e4da] bg-white px-4 text-sm text-[#193b29] outline-none focus:border-[#286542] focus:ring-2 focus:ring-[#286542]/15";

export function BackupPanel() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  async function createBackup(formData: FormData) {
    setPending(true);
    setMessage("");
    setError(false);
    try {
      const passphrase = String(formData.get("passphrase") ?? "");
      const confirmation = String(formData.get("confirmation") ?? "");
      if (passphrase.length < 12) {
        throw new Error("La phrase secrète doit contenir au moins 12 caractères.");
      }
      if (passphrase !== confirmation) {
        throw new Error("Les deux phrases secrètes ne correspondent pas.");
      }

      const response = await fetch("/api/admin/backup", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/vnd.fernotech.backup+json",
        },
        body: JSON.stringify({ passphrase }),
      });
      const responseType = response.headers.get("Content-Type") ?? "";
      if (
        !response.ok ||
        response.redirected ||
        !responseType.includes("application/vnd.fernotech.backup+json")
      ) {
        const result = responseType.includes("application/json")
          ? ((await response.json()) as { error?: string })
          : null;
        throw new Error(
          result?.error ??
            (response.redirected || !responseType.includes("application/json")
              ? "Votre session a peut-être expiré. Reconnectez-vous puis réessayez."
              : "La sauvegarde n’a pas pu être créée."),
        );
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      const filename = contentDisposition?.match(/filename="([^"]+)"/)?.[1];
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = filename ?? "fernotech-sauvegarde.fernotech-backup.json";
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 60_000);
      setMessage(
        "Sauvegarde chiffrée téléchargée. Conservez la phrase secrète séparément : elle ne peut pas être récupérée si elle est perdue.",
      );
      (document.getElementById("backup-form") as HTMLFormElement | null)?.reset();
    } catch (caught) {
      setError(true);
      setMessage(
        caught instanceof Error
          ? caught.message
          : "Une erreur inattendue a empêché la création de la sauvegarde.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#e3ebe4] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-[#193b29]">
        Sauvegarde complète de la base
      </h2>
      <p className="mt-2 text-sm leading-6 text-[#65736a]">
        Téléchargez une archive chiffrée des comptes, collectes, mouvements,
        productions, clients, ventes, règlements et journaux d’audit. L’archive
        contient aussi les empreintes des mots de passe. Choisissez une phrase
        secrète longue et conservez-la séparément, dans un endroit sûr.
      </p>
      <form
        action={createBackup}
        className="mt-4 grid gap-4 sm:grid-cols-2"
        id="backup-form"
      >
        <label className="text-sm font-semibold text-[#314a39]">
          Phrase secrète (12 caractères minimum)
          <input
            autoComplete="new-password"
            className={`${fieldClass} mt-2`}
            maxLength={128}
            minLength={12}
            name="passphrase"
            required
            type="password"
          />
        </label>
        <label className="text-sm font-semibold text-[#314a39]">
          Confirmer la phrase secrète
          <input
            autoComplete="new-password"
            className={`${fieldClass} mt-2`}
            maxLength={128}
            minLength={12}
            name="confirmation"
            required
            type="password"
          />
        </label>
        <div className="sm:col-span-2">
          <button
            className="min-h-12 rounded-xl bg-[#205d39] px-5 py-3 text-sm font-semibold text-white hover:bg-[#17472e] disabled:opacity-60"
            disabled={pending}
            type="submit"
          >
            {pending ? "Chiffrement et téléchargement…" : "Créer la sauvegarde chiffrée"}
          </button>
          {message ? (
            <p
              aria-live="polite"
              className={`mt-3 text-sm ${error ? "text-[#9a342a]" : "text-[#286542]"}`}
              role={error ? "alert" : "status"}
            >
              {message}
            </p>
          ) : null}
        </div>
      </form>
    </section>
  );
}
