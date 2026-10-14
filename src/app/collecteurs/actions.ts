"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDatabase } from "@/db";
import { auditLogs, collectors, deliveries } from "@/db/schema";
import { requirePermission } from "@/lib/auth/guards";
import {
  createCollectorSchema,
  createDeliverySchema,
  updateCollectorActiveSchema,
  updateCollectorSchema,
  type CollectorActionState,
} from "@/lib/collectors/validation";

export async function createCollector(
  _previousState: CollectorActionState,
  formData: FormData,
): Promise<CollectorActionState> {
  const actor = await requirePermission("collectors:manage");
  const parsed = createCollectorSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    phone: formData.get("phone"),
    zone: formData.get("zone"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Vérifiez les champs.",
    };
  }

  const database = getDatabase();
  await database.transaction(async (transaction) => {
    const [created] = await transaction
      .insert(collectors)
      .values(parsed.data)
      .returning({ id: collectors.id });
    await transaction.insert(auditLogs).values({
      actorId: actor.id,
      action: "collector.created",
      entityType: "collector",
      entityId: created.id,
      details: {
        name: parsed.data.name,
        type: parsed.data.type,
        zone: parsed.data.zone,
      },
    });
  });

  revalidatePath("/collecteurs");
  revalidatePath("/");
  return { message: "Le collecteur a été ajouté." };
}

export async function updateCollector(
  _previousState: CollectorActionState,
  formData: FormData,
): Promise<CollectorActionState> {
  const actor = await requirePermission("collectors:manage");
  const parsed = updateCollectorSchema.safeParse({
    collectorId: formData.get("collectorId"),
    name: formData.get("name"),
    type: formData.get("type"),
    phone: formData.get("phone"),
    zone: formData.get("zone"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Vérifiez les champs.",
    };
  }

  const database = getDatabase();
  const result = await database.transaction(
    async (transaction): Promise<CollectorActionState> => {
      const [previous] = await transaction
        .select({ id: collectors.id, name: collectors.name })
        .from(collectors)
        .where(eq(collectors.id, parsed.data.collectorId))
        .limit(1)
        .for("update");

      if (!previous) {
        return { error: "Ce collecteur n’existe plus." };
      }

      const { collectorId, ...changes } = parsed.data;
      await transaction
        .update(collectors)
        .set(changes)
        .where(eq(collectors.id, collectorId));
      await transaction.insert(auditLogs).values({
        actorId: actor.id,
        action: "collector.updated",
        entityType: "collector",
        entityId: collectorId,
        details: {
          previousName: previous.name,
          name: changes.name,
          type: changes.type,
          zone: changes.zone,
        },
      });

      return { message: "La fiche du collecteur a été mise à jour." };
    },
  );

  if (result.error) {
    return result;
  }

  revalidatePath("/collecteurs");
  return result;
}

export async function updateCollectorActiveStatus(
  _previousState: CollectorActionState,
  formData: FormData,
): Promise<CollectorActionState> {
  const actor = await requirePermission("collectors:manage");
  const parsed = updateCollectorActiveSchema.safeParse({
    collectorId: formData.get("collectorId"),
    isActive: formData.get("isActive"),
  });

  if (!parsed.success) {
    return { error: "L’état demandé n’est pas valide." };
  }

  const database = getDatabase();
  const result = await database.transaction(
    async (transaction): Promise<CollectorActionState> => {
      const [previous] = await transaction
        .select({ id: collectors.id, isActive: collectors.isActive })
        .from(collectors)
        .where(eq(collectors.id, parsed.data.collectorId))
        .limit(1)
        .for("update");

      if (!previous) {
        return { error: "Ce collecteur n’existe plus." };
      }

      await transaction
        .update(collectors)
        .set({ isActive: parsed.data.isActive })
        .where(eq(collectors.id, previous.id));
      await transaction.insert(auditLogs).values({
        actorId: actor.id,
        action: parsed.data.isActive
          ? "collector.activated"
          : "collector.deactivated",
        entityType: "collector",
        entityId: previous.id,
        details: {
          previousIsActive: previous.isActive,
          isActive: parsed.data.isActive,
        },
      });

      return {
        message: parsed.data.isActive
          ? "Le collecteur a été réactivé."
          : "Le collecteur a été désactivé.",
      };
    },
  );

  if (result.error) {
    return result;
  }

  revalidatePath("/collecteurs");
  revalidatePath("/");
  return result;
}

export async function recordDelivery(
  _previousState: CollectorActionState,
  formData: FormData,
): Promise<CollectorActionState> {
  const actor = await requirePermission("collectors:manage");
  const parsed = createDeliverySchema.safeParse({
    collectorId: formData.get("collectorId"),
    deliveryDate: formData.get("deliveryDate"),
    collectionPoint: formData.get("collectionPoint"),
    plasticType: formData.get("plasticType"),
    receivedKg: formData.get("receivedKg"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Vérifiez les champs.",
    };
  }

  const database = getDatabase();
  const result = await database.transaction(
    async (transaction): Promise<CollectorActionState> => {
      const [collector] = await transaction
        .select({ id: collectors.id, isActive: collectors.isActive })
        .from(collectors)
        .where(eq(collectors.id, parsed.data.collectorId))
        .limit(1)
        .for("update");

      if (!collector) {
        return { error: "Ce collecteur n’existe plus." };
      }
      if (!collector.isActive) {
        return {
          error: "Ce collecteur est inactif et ne peut pas être sélectionné.",
        };
      }

      const [created] = await transaction
        .insert(deliveries)
        .values({
          collectorId: collector.id,
          deliveryDate: parsed.data.deliveryDate,
          collectionPoint: parsed.data.collectionPoint,
          plasticType: parsed.data.plasticType,
          receivedKg: parsed.data.receivedKg,
        })
        .returning({ id: deliveries.id });

      await transaction.insert(auditLogs).values({
        actorId: actor.id,
        action: "delivery.received",
        entityType: "delivery",
        entityId: created.id,
        details: {
          collectorId: collector.id,
          deliveryDate: parsed.data.deliveryDate,
          receivedKg: parsed.data.receivedKg,
          status: "recue",
        },
      });

      return {
        message:
          "L’apport a été enregistré comme reçu. Il sera ajouté au stock après le tri.",
      };
    },
  );

  if (result.error) {
    return result;
  }

  revalidatePath("/collecteurs");
  revalidatePath("/");
  return result;
}
