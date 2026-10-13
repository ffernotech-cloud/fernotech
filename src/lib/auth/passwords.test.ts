import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/passwords";

describe("hachage des mots de passe", () => {
  it("stocke un hash vérifiable et jamais le mot de passe brut", async () => {
    const password = "FernoTech-atelier-2026!";
    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
    expect(hash).toMatch(/^\$2[aby]\$/);
    await expect(verifyPassword(password, hash)).resolves.toBe(true);
    await expect(verifyPassword("mauvais-mot-de-passe", hash)).resolves.toBe(
      false,
    );
  });
});
