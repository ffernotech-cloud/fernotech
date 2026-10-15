import { describe, expect, it } from "vitest";
import { serializeCsv } from "@/lib/exports/csv";

describe("serializeCsv", () => {
  it("produces a French Excel-compatible CSV with UTF-8 BOM and escaped cells", () => {
    expect(
      serializeCsv(["Nom", "Zone"], [
        ['Association "Le Vert"', "Douala; Nord"],
      ]),
    ).toBe(
      '\uFEFFNom;Zone\r\n"Association ""Le Vert""";"Douala; Nord"\r\n',
    );
  });

  it("neutralizes formula-like text without changing numeric values", () => {
    expect(
      serializeCsv(["Texte", "Montant"], [[" =1+1", -125]]),
    ).toBe('\uFEFFTexte;Montant\r\n"\' =1+1";-125\r\n');
  });
});
