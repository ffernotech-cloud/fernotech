import { eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { getDatabase } from "@/db";
import {
  auditLogs,
  collectors,
  deliveries,
  finishedProductStockMovements,
  materialStockMovements,
  productTechnicalSpecs,
  productionOrders,
  productionOrderLines,
  products,
  users,
} from "@/db/schema";
import {
  calculateProductionCosts,
  productionBalanceIsValid,
  productionMaterialStockIsSufficient,
} from "@/lib/production/calculations";
import { offlineSubmissionSchema } from "@/lib/offline/validation";
import { sortingBalanceIsValid } from "@/lib/sorting/calculations";

type SyncResult =
  | { ok: true; message: string; entityId: string }
  | { ok: false; error: string };

function response(result: SyncResult, status = result.ok ? 200 : 409) {
  return Response.json(result, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function sameWeight(left: string, right: string): boolean {
  return Number(left) === Number(right);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return response({ ok: false, error: "Votre session a expiré. Reconnectez-vous avant la synchronisation." }, 401);
  }

  const database = getDatabase();
  const [actor] = await database
    .select({
      id: users.id,
      isActive: users.isActive,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  if (
    !actor?.isActive ||
    !["administrateur", "responsable_atelier"].includes(actor.role)
  ) {
    return response(
      { ok: false, error: "Votre compte n’est pas autorisé à synchroniser ces saisies." },
      403,
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return response({ ok: false, error: "La saisie reçue n’est pas un JSON valide." }, 400);
    }
    throw error;
  }

  const parsed = offlineSubmissionSchema.safeParse(raw);
  if (!parsed.success) {
    return response(
      {
        ok: false,
        error:
          parsed.error.issues[0]?.message ??
          "Une saisie hors ligne est invalide. Corrigez-la puis réessayez.",
      },
      400,
    );
  }

  const item = parsed.data;
  if (item.ownerId !== actor.id) {
    return response(
      {
        ok: false,
        error:
          "Cette saisie a été créée avec un autre compte. Reconnectez-vous avec le compte d’origine pour la synchroniser.",
      },
      403,
    );
  }

  const permission =
    item.type === "collecteur" || item.type === "apport"
      ? "collectors:manage"
      : item.type === "tri" || item.type === "integration"
        ? "sorting:manage"
        : "production:manage";
  const allowed =
    actor.role === "administrateur" ||
    (actor.role === "responsable_atelier" &&
      [
        "collectors:manage",
        "sorting:manage",
        "production:manage",
      ].includes(permission));
  if (!allowed) {
    return response({ ok: false, error: "Votre rôle ne permet pas cette opération." }, 403);
  }

  if (item.type === "collecteur") {
    const result = await database.transaction(
      async (transaction): Promise<SyncResult> => {
        const [existing] = await transaction
          .select({
            id: collectors.id,
            name: collectors.name,
            collectorType: collectors.type,
            phone: collectors.phone,
            zone: collectors.zone,
            notes: collectors.notes,
          })
          .from(collectors)
          .where(eq(collectors.id, item.id))
          .limit(1);
        if (existing) {
          const isSame =
            existing.name === item.name &&
            existing.collectorType === item.collectorType &&
            (existing.phone ?? "") === (item.phone ?? "") &&
            (existing.zone ?? "") === (item.zone ?? "") &&
            (existing.notes ?? "") === (item.notes ?? "");
          return isSame
            ? { ok: true, entityId: item.id, message: "Collecteur déjà synchronisé." }
            : { ok: false, error: "Conflit : cet identifiant de collecteur existe déjà avec d’autres données." };
        }
        const [created] = await transaction
          .insert(collectors)
          .values({
            id: item.id,
            name: item.name,
            type: item.collectorType,
            phone: item.phone,
            zone: item.zone,
            notes: item.notes,
          })
          .onConflictDoNothing()
          .returning({ id: collectors.id });
        if (!created) {
          const [concurrent] = await transaction
            .select({
              name: collectors.name,
              collectorType: collectors.type,
              phone: collectors.phone,
              zone: collectors.zone,
              notes: collectors.notes,
            })
            .from(collectors)
            .where(eq(collectors.id, item.id))
            .limit(1);
          const matches =
            concurrent?.name === item.name &&
            concurrent.collectorType === item.collectorType &&
            (concurrent.phone ?? "") === (item.phone ?? "") &&
            (concurrent.zone ?? "") === (item.zone ?? "") &&
            (concurrent.notes ?? "") === (item.notes ?? "");
          return matches
            ? { ok: true, entityId: item.id, message: "Collecteur déjà synchronisé." }
            : { ok: false, error: "Conflit : l’identifiant du collecteur existe déjà." };
        }
        await transaction.insert(auditLogs).values({
          actorId: actor.id,
          action: "collector.created",
          entityType: "collector",
          entityId: item.id,
          details: {
            name: item.name,
            type: item.collectorType,
            zone: item.zone,
            synchronizedOffline: true,
          },
        });
        return {
          ok: true,
          entityId: item.id,
          message: "Collecteur synchronisé.",
        };
      },
    );
    return response(result);
  }

  if (item.type === "apport") {
    const result = await database.transaction(
      async (transaction): Promise<SyncResult> => {
        const [existing] = await transaction
          .select({
            id: deliveries.id,
            collectorId: deliveries.collectorId,
            deliveryDate: deliveries.deliveryDate,
            collectionPoint: deliveries.collectionPoint,
            plasticType: deliveries.plasticType,
            receivedKg: deliveries.receivedKg,
          })
          .from(deliveries)
          .where(eq(deliveries.id, item.id))
          .limit(1);

        if (existing) {
          const isSame =
            existing.collectorId === item.collectorId &&
            existing.deliveryDate === item.deliveryDate &&
            existing.collectionPoint === item.collectionPoint &&
            existing.plasticType === item.plasticType &&
            sameWeight(existing.receivedKg, item.receivedKg);
          return isSame
            ? { ok: true, entityId: item.id, message: "Apport déjà synchronisé." }
            : { ok: false, error: "Conflit : cet identifiant d’apport existe déjà avec d’autres données." };
        }

        const [collector] = await transaction
          .select({ id: collectors.id, isActive: collectors.isActive })
          .from(collectors)
          .where(eq(collectors.id, item.collectorId))
          .limit(1)
          .for("update");
        if (!collector?.isActive) {
          return {
            ok: false,
            error: "Le collecteur n’existe plus ou a été désactivé. Actualisez l’espace hors ligne avant de réessayer.",
          };
        }

        const [created] = await transaction
          .insert(deliveries)
          .values({
            id: item.id,
            collectorId: collector.id,
            deliveryDate: item.deliveryDate,
            collectionPoint: item.collectionPoint,
            plasticType: item.plasticType,
            receivedKg: item.receivedKg,
          })
          .onConflictDoNothing()
          .returning({ id: deliveries.id });
        if (!created) {
          const [concurrent] = await transaction
            .select({
              collectorId: deliveries.collectorId,
              deliveryDate: deliveries.deliveryDate,
              collectionPoint: deliveries.collectionPoint,
              plasticType: deliveries.plasticType,
              receivedKg: deliveries.receivedKg,
            })
            .from(deliveries)
            .where(eq(deliveries.id, item.id))
            .limit(1);
          const matches =
            concurrent?.collectorId === item.collectorId &&
            concurrent.deliveryDate === item.deliveryDate &&
            concurrent.collectionPoint === item.collectionPoint &&
            concurrent.plasticType === item.plasticType &&
            sameWeight(concurrent.receivedKg, item.receivedKg);
          return matches
            ? { ok: true, entityId: item.id, message: "Apport déjà synchronisé." }
            : { ok: false, error: "Conflit : l’identifiant de l’apport existe déjà." };
        }
        await transaction.insert(auditLogs).values({
          actorId: actor.id,
          action: "delivery.received",
          entityType: "delivery",
          entityId: item.id,
          details: {
            collectorId: collector.id,
            deliveryDate: item.deliveryDate,
            receivedKg: item.receivedKg,
            status: "recue",
            synchronizedOffline: true,
          },
        });
        return {
          ok: true,
          entityId: item.id,
          message: "Apport synchronisé; il reste à trier et à intégrer au stock.",
        };
      },
    );
    return response(result);
  }

  if (item.type === "tri") {
    const result = await database.transaction(
      async (transaction): Promise<SyncResult> => {
        const [delivery] = await transaction
          .select({
            id: deliveries.id,
            receivedKg: deliveries.receivedKg,
            acceptedKg: deliveries.acceptedKg,
            rejectedKg: deliveries.rejectedKg,
            rejectionReason: deliveries.rejectionReason,
            status: deliveries.status,
          })
          .from(deliveries)
          .where(eq(deliveries.id, item.deliveryId))
          .limit(1)
          .for("update");
        if (!delivery) {
          return {
            ok: false,
            error: "Cet apport n’existe plus. Actualisez l’espace hors ligne puis réessayez.",
          };
        }

        const sameSort =
          delivery.acceptedKg !== null &&
          delivery.rejectedKg !== null &&
          sameWeight(delivery.acceptedKg, item.acceptedKg) &&
          sameWeight(delivery.rejectedKg, item.rejectedKg) &&
          (delivery.rejectionReason ?? "") === (item.rejectionReason ?? "");
        if (delivery.status !== "recue") {
          return sameSort
            ? { ok: true, entityId: delivery.id, message: "Tri déjà synchronisé." }
            : {
                ok: false,
                error: "Conflit : cet apport a changé depuis la préparation hors ligne. Vérifiez son état en ligne.",
              };
        }

        if (
          !sortingBalanceIsValid({
            receivedKg: delivery.receivedKg,
            acceptedKg: item.acceptedKg,
            rejectedKg: item.rejectedKg,
          })
        ) {
          return {
            ok: false,
            error: "Le poids accepté et rejeté ne correspond pas au poids reçu. Corrigez le tri hors ligne.",
          };
        }

        await transaction
          .update(deliveries)
          .set({
            acceptedKg: item.acceptedKg,
            rejectedKg: item.rejectedKg,
            rejectionReason: item.rejectionReason,
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
            acceptedKg: item.acceptedKg,
            rejectedKg: item.rejectedKg,
            rejectionReason: item.rejectionReason,
            synchronizedOffline: true,
          },
        });
        return {
          ok: true,
          entityId: delivery.id,
          message: "Tri synchronisé; il reste à intégrer le poids accepté au stock.",
        };
      },
    );
    return response(result);
  }

  if (item.type === "integration") {
    const result = await database.transaction(
      async (transaction): Promise<SyncResult> => {
        const [delivery] = await transaction
          .select({
            id: deliveries.id,
            plasticType: deliveries.plasticType,
            acceptedKg: deliveries.acceptedKg,
            status: deliveries.status,
          })
          .from(deliveries)
          .where(eq(deliveries.id, item.deliveryId))
          .limit(1)
          .for("update");
        if (!delivery) {
          return {
            ok: false,
            error: "Cet apport n’existe plus. Actualisez l’espace hors ligne puis réessayez.",
          };
        }
        if (delivery.status === "integree_au_stock") {
          return {
            ok: true,
            entityId: delivery.id,
            message: "Intégration déjà synchronisée; aucun mouvement en double n’a été créé.",
          };
        }
        if (delivery.status !== "triee" || delivery.acceptedKg === null) {
          return {
            ok: false,
            error: "Seul un apport déjà trié peut être intégré au stock.",
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
            reason: "Poids accepté au tri (synchronisé hors ligne)",
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
            movementCreated: acceptedKg > 0,
            synchronizedOffline: true,
          },
        });
        return {
          ok: true,
          entityId: delivery.id,
          message:
            acceptedKg > 0
              ? `${delivery.acceptedKg} kg de ${delivery.plasticType} intégrés au stock.`
              : "Apport clôturé sans mouvement de stock.",
        };
      },
    );
    return response(result);
  }

  const result = await database.transaction(
    async (transaction): Promise<SyncResult> => {
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`offline-production:${item.id}`}))`,
      );
      const [existing] = await transaction
        .select({
          id: productionOrders.id,
          productionDate: productionOrders.productionDate,
          plasticType: productionOrders.plasticType,
          materialUsedKg: productionOrders.materialUsedKg,
          bandsPreparedKg: productionOrders.bandsPreparedKg,
          broomsProduced: productionOrders.broomsProduced,
          lossKg: productionOrders.lossKg,
          lossReason: productionOrders.lossReason,
          materialCostPerKg: productionOrders.materialCostPerKg,
          laborCost: productionOrders.laborCost,
          energyCost: productionOrders.energyCost,
          accessoriesCost: productionOrders.accessoriesCost,
        })
        .from(productionOrders)
        .where(eq(productionOrders.id, item.id))
        .limit(1);
      if (existing) {
        const isSame =
          existing.productionDate === item.productionDate &&
          existing.plasticType === item.plasticType &&
          sameWeight(existing.materialUsedKg, item.materialUsedKg) &&
          sameWeight(existing.bandsPreparedKg, item.bandsPreparedKg) &&
          existing.broomsProduced === item.broomsProduced &&
          sameWeight(existing.lossKg, item.lossKg) &&
          (existing.lossReason ?? "") === (item.lossReason ?? "") &&
          Number(existing.materialCostPerKg) === Number(item.materialCostPerKg) &&
          Number(existing.laborCost) === Number(item.laborCost) &&
          Number(existing.energyCost) === Number(item.energyCost) &&
          Number(existing.accessoriesCost) === Number(item.accessoriesCost);
        return isSame
          ? { ok: true, entityId: item.id, message: "Fabrication déjà synchronisée." }
          : { ok: false, error: "Conflit : cet ordre existe déjà avec d’autres données." };
      }

      if (
        !productionBalanceIsValid({
          materialUsedKg: item.materialUsedKg,
          bandsPreparedKg: item.bandsPreparedKg,
          lossKg: item.lossKg,
        })
      ) {
        return {
          ok: false,
          error: "Le bilan matière de cette fabrication n’est pas équilibré.",
        };
      }
      const costs = calculateProductionCosts({
        materialUsedKg: item.materialUsedKg,
        materialCostPerKg: item.materialCostPerKg,
        laborCost: item.laborCost,
        energyCost: item.energyCost,
        accessoriesCost: item.accessoriesCost,
        quantityProduced: item.broomsProduced,
      });

      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtext(${item.plasticType}))`,
      );
      const [concurrentOrder] = await transaction
        .select({
          id: productionOrders.id,
          productionDate: productionOrders.productionDate,
          plasticType: productionOrders.plasticType,
          materialUsedKg: productionOrders.materialUsedKg,
          bandsPreparedKg: productionOrders.bandsPreparedKg,
          broomsProduced: productionOrders.broomsProduced,
          lossKg: productionOrders.lossKg,
          lossReason: productionOrders.lossReason,
          materialCostPerKg: productionOrders.materialCostPerKg,
          laborCost: productionOrders.laborCost,
          energyCost: productionOrders.energyCost,
          accessoriesCost: productionOrders.accessoriesCost,
        })
        .from(productionOrders)
        .where(eq(productionOrders.id, item.id))
        .limit(1);
      if (concurrentOrder) {
        const matches =
          concurrentOrder.productionDate === item.productionDate &&
          concurrentOrder.plasticType === item.plasticType &&
          sameWeight(concurrentOrder.materialUsedKg, item.materialUsedKg) &&
          sameWeight(concurrentOrder.bandsPreparedKg, item.bandsPreparedKg) &&
          concurrentOrder.broomsProduced === item.broomsProduced &&
          sameWeight(concurrentOrder.lossKg, item.lossKg) &&
          (concurrentOrder.lossReason ?? "") === (item.lossReason ?? "") &&
          Number(concurrentOrder.materialCostPerKg) === Number(item.materialCostPerKg) &&
          Number(concurrentOrder.laborCost) === Number(item.laborCost) &&
          Number(concurrentOrder.energyCost) === Number(item.energyCost) &&
          Number(concurrentOrder.accessoriesCost) === Number(item.accessoriesCost);
        return matches
          ? { ok: true, entityId: item.id, message: "Fabrication déjà synchronisée." }
          : { ok: false, error: "Conflit : cet ordre existe déjà avec d’autres données." };
      }
      const movements = await transaction
        .select({
          movementType: materialStockMovements.movementType,
          quantityKg: materialStockMovements.quantityKg,
        })
        .from(materialStockMovements)
        .where(eq(materialStockMovements.plasticType, item.plasticType));
      if (
        !productionMaterialStockIsSufficient(
          movements,
          item.materialUsedKg,
        )
      ) {
        return {
          ok: false,
          error: `Stock insuffisant en ${item.plasticType} au moment de la synchronisation. Actualisez les stocks et corrigez ou abandonnez cette saisie.`,
        };
      }

      const [balai] = await transaction
        .select({
          productId: products.id,
          technicalSpecId: productTechnicalSpecs.id,
        })
        .from(products)
        .innerJoin(
          productTechnicalSpecs,
          eq(productTechnicalSpecs.productId, products.id),
        )
        .where(eq(products.code, "BALAI"))
        .orderBy(sql`${productTechnicalSpecs.version} DESC`)
        .limit(1);
      if (!balai) {
        return {
          ok: false,
          error:
            "Le produit Balai ou sa fiche technique est introuvable. Contactez l’administrateur.",
        };
      }

      await transaction.insert(productionOrders).values({
        id: item.id,
        productionDate: item.productionDate,
        supervisorId: actor.id,
        plasticType: item.plasticType,
        materialUsedKg: item.materialUsedKg,
        bandsPreparedKg: item.bandsPreparedKg,
        broomsProduced: item.broomsProduced,
        lossKg: item.lossKg,
        lossReason: item.lossReason,
        materialCostPerKg: item.materialCostPerKg,
        laborCost: item.laborCost,
        energyCost: item.energyCost,
        accessoriesCost: item.accessoriesCost,
        materialCost: costs.materialCost,
        totalCost: costs.totalCost,
      });
      await transaction.insert(materialStockMovements).values({
        plasticType: item.plasticType,
        movementType: "sortie",
        quantityKg: item.materialUsedKg,
        productionOrderId: item.id,
        actorId: actor.id,
        reason: "Consommation fabrication (synchronisée hors ligne)",
      });
      const [productionLine] = await transaction
        .insert(productionOrderLines)
        .values({
          productionOrderId: item.id,
          productId: balai.productId,
          technicalSpecId: balai.technicalSpecId,
          quantityProduced: item.broomsProduced,
          bandsPreparedKg: item.bandsPreparedKg,
          materialCost: costs.materialCost,
          laborCost: item.laborCost,
          energyCost: item.energyCost,
          accessoriesCost: item.accessoriesCost,
          totalCost: costs.totalCost,
        })
        .returning({ id: productionOrderLines.id });
      await transaction.insert(finishedProductStockMovements).values({
        movementType: "entree",
        productId: balai.productId,
        quantity: item.broomsProduced,
        productionOrderId: item.id,
        productionOrderLineId: productionLine.id,
        actorId: actor.id,
        reason: "Balais fabriqués (synchronisés hors ligne)",
      });
      await transaction.insert(auditLogs).values({
        actorId: actor.id,
        action: "production.created",
        entityType: "production_order",
        entityId: item.id,
        details: {
          productionDate: item.productionDate,
          plasticType: item.plasticType,
          materialUsedKg: item.materialUsedKg,
          bandsPreparedKg: item.bandsPreparedKg,
          broomsProduced: item.broomsProduced,
          lossKg: item.lossKg,
          lossReason: item.lossReason,
          materialCost: costs.materialCost,
          totalCost: costs.totalCost,
          synchronizedOffline: true,
        },
      });
      return {
        ok: true,
        entityId: item.id,
        message: `${item.broomsProduced} balais fabriqués; stock et coûts synchronisés.`,
      };
    },
  );
  return response(result);
}
