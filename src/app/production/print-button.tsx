"use client";

export function PrintButton() {
  return (
    <button
      className="min-h-11 rounded-xl bg-[#0b428a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b428a]"
      onClick={() => window.print()}
      type="button"
    >
      Imprimer / Enregistrer en PDF
    </button>
  );
}
