import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDatabase } from "@/db";
import { users } from "@/db/schema";
import {
  roleHasPermission,
  type AppRole,
  type Permission,
} from "@/lib/auth/roles";

export async function requirePermission(permission: Permission) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/connexion");
  }

  const database = getDatabase();
  const [user] = await database
    .select({
      id: users.id,
      identifier: users.identifier,
      displayName: users.displayName,
      role: users.role,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user || !user.isActive) {
    redirect("/connexion?compte=inactif");
  }

  if (!roleHasPermission(user.role, permission)) {
    redirect("/acces-refuse");
  }

  return user;
}

export async function requireRole(...allowedRoles: AppRole[]) {
  const user = await requirePermission("dashboard:read");
  if (!allowedRoles.includes(user.role)) {
    redirect("/acces-refuse");
  }
  return user;
}
