import { describe, expect, it } from "vitest";
import { createUserSchema, loginSchema } from "@/lib/auth/validation";

describe("validation des identifiants", () => {
  it("normalise les identifiants en minuscules", () => {
    expect(
      loginSchema.parse({ identifier: "  Atelier.1 ", password: "secret" })
        .identifier,
    ).toBe("atelier.1");
  });

  it("rejette un identifiant contenant des caractères ambigus", () => {
    expect(
      loginSchema.safeParse({
        identifier: "atelier admin",
        password: "secret",
      }).success,
    ).toBe(false);
  });

  it("limite les mots de passe au plafond UTF-8 de bcrypt", () => {
    expect(
      loginSchema.safeParse({
        identifier: "atelier",
        password: "x".repeat(73),
      }).success,
    ).toBe(false);
  });

  it("exige un mot de passe long pour la création d’un compte", () => {
    expect(
      createUserSchema.safeParse({
        identifier: "agent1",
        displayName: "Agent",
        password: "Court123!",
        role: "lecteur",
      }).success,
    ).toBe(false);
  });

  it("rejette un rôle qui ne figure pas dans les quatre rôles de l’application", () => {
    expect(
      createUserSchema.safeParse({
        identifier: "agent1",
        displayName: "Agent",
        password: "Motdepasse-long-2026!",
        role: "super-admin",
      }).success,
    ).toBe(false);
  });
});
