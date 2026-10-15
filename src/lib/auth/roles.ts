export const appRoles = [
  "administrateur",
  "responsable_atelier",
  "commercial_caissier",
  "lecteur",
] as const;

export const collectorTypes = [
  "individuel",
  "association",
  "groupe",
] as const;

export type CollectorType = (typeof collectorTypes)[number];

export const collectorTypeLabels: Record<CollectorType, string> = {
  individuel: "Individuel",
  association: "Association",
  groupe: "Groupe",
};

export type AppRole = (typeof appRoles)[number];

export const roleLabels: Record<AppRole, string> = {
  administrateur: "Administrateur",
  responsable_atelier: "Responsable d’atelier",
  commercial_caissier: "Commercial / Caissier",
  lecteur: "Lecteur",
};

export const permissions = [
  "dashboard:read",
  "collectors:manage",
  "deliveries:manage",
  "sorting:manage",
  "production:manage",
  "materials:read",
  "products:read",
  "sales:manage",
  "customers:manage",
  "users:manage",
] as const;

export type Permission = (typeof permissions)[number];

const permissionsByRole: Record<AppRole, readonly Permission[]> = {
  administrateur: permissions,
  responsable_atelier: [
    "dashboard:read",
    "collectors:manage",
    "deliveries:manage",
    "sorting:manage",
    "production:manage",
    "materials:read",
    "products:read",
  ],
  commercial_caissier: [
    "dashboard:read",
    "products:read",
    "sales:manage",
    "customers:manage",
  ],
  lecteur: ["dashboard:read"],
};

export function roleHasPermission(
  role: AppRole,
  permission: Permission,
): boolean {
  return permissionsByRole[role].includes(permission);
}
