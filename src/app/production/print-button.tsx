"use client";

export function PrintButton() {
  return (
    <button
      className="min-h-11 rounded-xl bg-[#286542] px-4 py-2 text-sm font-semibold text-white hover:bg-[#205d39]"
      onClick={() => window.print()}
      type="button"
    >
      Imprimer / Enregistrer en PDF
    </button>
  );
}
