import { describe, expect, it } from "vitest";
import { roleHasPermission } from "@/lib/auth/roles";

describe("permissions des rôles", () => {
  it("permet à chaque rôle de consulter le tableau de bord", () => {
    expect(roleHasPermission("administrateur", "dashboard:read")).toBe(true);
    expect(roleHasPermission("responsable_atelier", "dashboard:read")).toBe(
      true,
    );
    expect(roleHasPermission("commercial_caissier", "dashboard:read")).toBe(
      true,
    );
    expect(roleHasPermission("lecteur", "dashboard:read")).toBe(true);
  });

  it("limite le rôle lecteur au tableau de bord", () => {
    expect(roleHasPermission("lecteur", "dashboard:read")).toBe(true);
    expect(roleHasPermission("lecteur", "materials:read")).toBe(false);
    expect(roleHasPermission("lecteur", "products:read")).toBe(false);
    expect(roleHasPermission("lecteur", "sales:manage")).toBe(false);
    expect(roleHasPermission("lecteur", "users:manage")).toBe(false);
  });

  it("donne au responsable d’atelier les opérations de collecte et production", () => {
    expect(roleHasPermission("responsable_atelier", "collectors:manage")).toBe(
      true,
    );
    expect(roleHasPermission("responsable_atelier", "production:manage")).toBe(
      true,
    );
    expect(roleHasPermission("responsable_atelier", "sales:manage")).toBe(
      false,
    );
    expect(roleHasPermission("responsable_atelier", "users:manage")).toBe(
      false,
    );
  });

  it("limite le commercial aux ventes et à la lecture du stock de produits finis", () => {
    expect(roleHasPermission("commercial_caissier", "sales:manage")).toBe(true);
    expect(roleHasPermission("commercial_caissier", "products:read")).toBe(
      true,
    );
    expect(roleHasPermission("commercial_caissier", "materials:read")).toBe(
      false,
    );
    expect(roleHasPermission("commercial_caissier", "production:manage")).toBe(
      false,
    );
  });

  it("réserve la gestion des comptes à l’administrateur", () => {
    expect(roleHasPermission("administrateur", "users:manage")).toBe(true);
    expect(roleHasPermission("responsable_atelier", "users:manage")).toBe(
      false,
    );
    expect(roleHasPermission("commercial_caissier", "users:manage")).toBe(
      false,
    );
  });
});
