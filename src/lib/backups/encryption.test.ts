import { describe, expect, it } from "vitest";
import {
  decryptBackup,
  encryptBackup,
} from "@/lib/backups/encryption";

describe("chiffrement des sauvegardes", () => {
  it("chiffre et déchiffre une archive avec une phrase valide", () => {
    const plaintext = JSON.stringify({
      format: "fernotech-postgresql-json",
      tables: { collectors: [{ name: "Collecteur test" }] },
    });
    const encrypted = encryptBackup(plaintext, "phrase-sure-a-garder-ici");

    expect(JSON.stringify(encrypted)).not.toContain("Collecteur test");
    expect(decryptBackup(encrypted, "phrase-sure-a-garder-ici")).toBe(
      plaintext,
    );
  });

  it("refuse une phrase erronée et une modification du fichier", () => {
    const encrypted = encryptBackup("contenu sensible", "phrase-sure-valide");

    expect(() =>
      decryptBackup(encrypted, "mauvaise phrase de passe"),
    ).toThrow();
    expect(() =>
      decryptBackup(
        { ...encrypted, ciphertext: Buffer.from("attaque").toString("base64") },
        "phrase-sure-valide",
      ),
    ).toThrow();
  });

  it("refuse les phrases de chiffrement trop courtes", () => {
    expect(() => encryptBackup("archive", "trop-court")).toThrow(
      "au moins 12 caractères",
    );
  });
});
