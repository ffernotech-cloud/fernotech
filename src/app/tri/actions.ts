"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDatabase } from "@/db";
import {
  auditLogs,
  deliveries,
  materialStockMovements,
} from "@/db/schema";
import { requirePermission } from "@/lib/auth/guards";
import { sortingBalanceIsValid } from "@/lib/sorting/calculations";
import {
  integrateDeliverySchema,
  sortDeliverySchema,
  type SortingActionState,
} from "@/lib/sorting/validation";

export async function sortDelivery(
  _previousState: SortingActionState,
  formData: FormData,
): Promise<SortingActionState> {
  const actor = await requirePermission("sorting:manage");
  const parsed = sortDeliverySchema.safeParse({
    deliveryId: formData.get("deliveryId"),
    acceptedKg: formData.get("acceptedKg"),
    rejectedKg: formData.get("rejectedKg"),
    rejectionReason: formData.get("rejectionReason"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Vérifiez les champs du tri.",
    };
  }

  const database = getDatabase();
  const result = await database.transaction(
    async (transaction): Promise<SortingActionState> => {
      const [delivery] = await transaction
        .select({
          id: deliveries.id,
          receivedKg: deliveries.receivedKg,
          status: deliveries.status,
        })
        .from(deliveries)
        .where(eq(deliveries.id, parsed.data.deliveryId))
        .limit(1)
        .for("update");

      if (!delivery) {
        return { error: "Cet apport n’existe plus." };
      }
      if (delivery.status !== "recue") {
        return { error: "Cet apport a déjà été trié ou intégré au stock." };
      }

      if (
        !sortingBalanceIsValid({
          receivedKg: delivery.receivedKg,
          acceptedKg: parsed.data.acceptedKg,
          rejectedKg: parsed.data.rejectedKg,
        })
      ) {
        return {
          error:
            "Le poids accepté et le poids rejeté doivent être égaux au poids reçu.",
        };
      }

      await transaction
        .update(deliveries)
        .set({
          acceptedKg: parsed.data.acceptedKg,
          rejectedKg: parsed.data.rejectedKg,
          rejectionReason: parsed.data.rejectionReason,
          status: "triee",
        })
        .where(eq(deliveries.id, delivery.id));

      await transaction.insert(auditLogs).values({
        actorId: actor.id,
        action: "delivery.sorted",
        entityType: "delivery",
        entityId: delivery.id,
        details: {
          receivedKg: delivery.receivedKg,
          acceptedKg: parsed.data.acceptedKg,
          rejectedKg: parsed.data.rejectedKg,
          rejectionReason: parsed.data.rejectionReason,
        },
      });

      return {
        message:
          "Le tri est enregistré. Vous pouvez maintenant intégrer les kilos acceptés au stock.",
      };
    },
  );

  if (result.error) {
    return result;
  }

  revalidatePath("/tri");
  revalidatePath("/collecteurs");
  revalidatePath("/");
  return result;
}

export async function integrateDelivery(
  _previousState: SortingActionState,
  formData: FormData,
): Promise<SortingActionState> {
  const actor = await requirePermission("sorting:manage");
  const parsed = integrateDeliverySchema.safeParse({
    deliveryId: formData.get("deliveryId"),
  });

  if (!parsed.success) {
    return { error: "Identifiant de l’apport invalide." };
  }

  const database = getDatabase();
  const result = await database.transaction(
    async (transaction): Promise<SortingActionState> => {
      const [delivery] = await transaction
        .select({
          id: deliveries.id,
          plasticType: deliveries.plasticType,
          acceptedKg: deliveries.acceptedKg,
          rejectedKg: deliveries.rejectedKg,
          status: deliveries.status,
        })
        .from(deliveries)
        .where(eq(deliveries.id, parsed.data.deliveryId))
        .limit(1)
        .for("update");

      if (!delivery) {
        return { error: "Cet apport n’existe plus." };
      }
      if (delivery.status !== "triee" || delivery.acceptedKg === null) {
        return {
          error: "Seul un apport trié peut être intégré au stock.",
        };
      }

      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtext(${delivery.plasticType}))`,
      );
      const acceptedKg = Number(delivery.acceptedKg);
      if (acceptedKg > 0) {
        await transaction.insert(materialStockMovements).values({
          plasticType: delivery.plasticType,
          movementType: "entree",
          quantityKg: delivery.acceptedKg,
          deliveryId: delivery.id,
          actorId: actor.id,
          reason: "Poids accepté au tri",
        });
      }

      await transaction
        .update(deliveries)
        .set({ status: "integree_au_stock" })
        .where(eq(deliveries.id, delivery.id));
      await transaction.insert(auditLogs).values({
        actorId: actor.id,
        action: "delivery.integrated",
        entityType: "delivery",
        entityId: delivery.id,
        details: {
          plasticType: delivery.plasticType,
          acceptedKg: delivery.acceptedKg,
          rejectedKg: delivery.rejectedKg,
          movementCreated: acceptedKg > 0,
        },
      });

      return {
        message:
          acceptedKg > 0
            ? `${delivery.acceptedKg} kg de ${delivery.plasticType} ont été intégrés au stock.`
            : "L’apport a été clôturé. Aucun poids accepté : le stock reste inchangé.",
      };
    },
  );

  if (result.error) {
    return result;
  }

  revalidatePath("/tri");
  revalidatePath("/collecteurs");
  revalidatePath("/");
  return result;
}
