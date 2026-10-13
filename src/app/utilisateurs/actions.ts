"use server";

import { and, count, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDatabase } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { requirePermission } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/passwords";
import {
  createUserSchema,
  updateActiveSchema,
  updateRoleSchema,
  type UserActionState,
} from "@/lib/auth/validation";

const userManagementLock = sql`SELECT pg_advisory_xact_lock(hashtext('fernotech-user-management'))`;

export async function createUser(
  _previousState: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const actor = await requirePermission("users:manage");
  const parsed = createUserSchema.safeParse({
    identifier: formData.get("identifier"),
    displayName: formData.get("displayName"),
    password: formData.get("password"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Vérifiez les champs.",
    };
  }

  const database = getDatabase();
  const passwordHash = await hashPassword(parsed.data.password);
  const result = await database.transaction(
    async (transaction): Promise<UserActionState> => {
      await transaction.execute(userManagementLock);
      const [existing] = await transaction
        .select({ id: users.id })
        .from(users)
        .where(eq(users.identifier, parsed.data.identifier))
        .limit(1);

      if (existing) {
        return {
          error: "Cet identifiant est déjà utilisé. Choisissez-en un autre.",
        };
      }

      const [created] = await transaction
        .insert(users)
        .values({
          identifier: parsed.data.identifier,
          displayName: parsed.data.displayName,
          passwordHash,
          role: parsed.data.role,
        })
        .returning({ id: users.id });

      await transaction.insert(auditLogs).values({
        actorId: actor.id,
        action: "user.created",
        entityType: "user",
        entityId: created.id,
        details: {
          identifier: parsed.data.identifier,
          role: parsed.data.role,
        },
      });

      return { message: "Le compte a été créé." };
    },
  );

  if (result.error) {
    return result;
  }

  revalidatePath("/utilisateurs");
  return result;
}

export async function updateUserRole(
  _previousState: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const actor = await requirePermission("users:manage");
  const parsed = updateRoleSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { error: "Le rôle demandé n’est pas valide." };
  }
  if (parsed.data.userId === actor.id) {
    return { error: "Vous ne pouvez pas modifier votre propre rôle." };
  }

  const database = getDatabase();
  const result = await database.transaction(
    async (transaction): Promise<UserActionState> => {
      await transaction.execute(userManagementLock);
      const [target] = await transaction
        .select()
        .from(users)
        .where(eq(users.id, parsed.data.userId))
        .limit(1)
        .for("update");

      if (!target) {
        return { error: "Ce compte n’existe plus." };
      }

      if (
        target.isActive &&
        target.role === "administrateur" &&
        parsed.data.role !== "administrateur"
      ) {
        const [activeAdministrators] = await transaction
          .select({ total: count() })
          .from(users)
          .where(
            and(eq(users.role, "administrateur"), eq(users.isActive, true)),
          );

        if (activeAdministrators.total <= 1) {
          return {
            error: "Le dernier administrateur actif doit être conservé.",
          };
        }
      }

      await transaction
        .update(users)
        .set({ role: parsed.data.role })
        .where(eq(users.id, target.id));
      await transaction.insert(auditLogs).values({
        actorId: actor.id,
        action: "user.role_updated",
        entityType: "user",
        entityId: target.id,
        details: { previousRole: target.role, role: parsed.data.role },
      });

      return { message: "Le rôle a été mis à jour." };
    },
  );

  revalidatePath("/utilisateurs");
  return result;
}

export async function updateUserActiveStatus(
  _previousState: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const actor = await requirePermission("users:manage");
  const parsed = updateActiveSchema.safeParse({
    userId: formData.get("userId"),
    isActive: formData.get("isActive"),
  });

  if (!parsed.success) {
    return { error: "L’état demandé n’est pas valide." };
  }
  if (parsed.data.userId === actor.id && !parsed.data.isActive) {
    return { error: "Vous ne pouvez pas désactiver votre propre compte." };
  }

  const database = getDatabase();
  const result = await database.transaction(
    async (transaction): Promise<UserActionState> => {
      await transaction.execute(userManagementLock);
      const [target] = await transaction
        .select()
        .from(users)
        .where(eq(users.id, parsed.data.userId))
        .limit(1)
        .for("update");

      if (!target) {
        return { error: "Ce compte n’existe plus." };
      }

      if (
        target.isActive &&
        target.role === "administrateur" &&
        !parsed.data.isActive
      ) {
        const [activeAdministrators] = await transaction
          .select({ total: count() })
          .from(users)
          .where(
            and(eq(users.role, "administrateur"), eq(users.isActive, true)),
          );

        if (activeAdministrators.total <= 1) {
          return {
            error: "Le dernier administrateur actif doit être conservé.",
          };
        }
      }

      await transaction
        .update(users)
        .set({ isActive: parsed.data.isActive })
        .where(eq(users.id, target.id));
      await transaction.insert(auditLogs).values({
        actorId: actor.id,
        action: parsed.data.isActive ? "user.activated" : "user.deactivated",
        entityType: "user",
        entityId: target.id,
        details: {
          previousIsActive: target.isActive,
          isActive: parsed.data.isActive,
        },
      });

      return {
        message: parsed.data.isActive
          ? "Le compte a été réactivé."
          : "Le compte a été désactivé.",
      };
    },
  );

  revalidatePath("/utilisateurs");
  return result;
}
