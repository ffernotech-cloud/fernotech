"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDatabase } from "@/db";
import {
  auditLogs,
  finishedProductStockMovements,
  materialStockMovements,
  productionOrders,
} from "@/db/schema";
import { requirePermission } from "@/lib/auth/guards";
import {
  calculateProductionCosts,
  productionBalanceIsValid,
  productionMaterialStockIsSufficient,
} from "@/lib/production/calculations";
import {
  createProductionSchema,
  type ProductionActionState,
} from "@/lib/production/validation";

export async function createProductionOrder(
  _previousState: ProductionActionState,
  formData: FormData,
): Promise<ProductionActionState> {
  const actor = await requirePermission("production:manage");
  const parsed = createProductionSchema.safeParse({
    productionDate: formData.get("productionDate"),
    plasticType: formData.get("plasticType"),
    materialUsedKg: formData.get("materialUsedKg"),
    bandsPreparedKg: formData.get("bandsPreparedKg"),
    broomsProduced: formData.get("broomsProduced"),
    lossKg: formData.get("lossKg"),
    lossReason: formData.get("lossReason"),
    materialCostPerKg: formData.get("materialCostPerKg"),
    laborCost: formData.get("laborCost"),
    energyCost: formData.get("energyCost"),
    accessoriesCost: formData.get("accessoriesCost"),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        "Vérifiez les informations de fabrication.",
    };
  }

  if (
    !productionBalanceIsValid({
      materialUsedKg: parsed.data.materialUsedKg,
      bandsPreparedKg: parsed.data.bandsPreparedKg,
      lossKg: parsed.data.lossKg,
    })
  ) {
    return {
      error:
        "Le poids utilisé doit être égal aux bandes préparées plus les pertes.",
    };
  }

  const costs = calculateProductionCosts({
    materialUsedKg: parsed.data.materialUsedKg,
    materialCostPerKg: parsed.data.materialCostPerKg,
    laborCost: parsed.data.laborCost,
    energyCost: parsed.data.energyCost,
    accessoriesCost: parsed.data.accessoriesCost,
    broomsProduced: parsed.data.broomsProduced,
  });

  const database = getDatabase();
  const result = await database.transaction(
    async (transaction): Promise<ProductionActionState> => {
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtext(${parsed.data.plasticType}))`,
      );
      const movements = await transaction
        .select({
          movementType: materialStockMovements.movementType,
          quantityKg: materialStockMovements.quantityKg,
        })
        .from(materialStockMovements)
        .where(eq(materialStockMovements.plasticType, parsed.data.plasticType));

      if (
        !productionMaterialStockIsSufficient(
          movements,
          parsed.data.materialUsedKg,
        )
      ) {
        return {
          error: `Stock insuffisant en ${parsed.data.plasticType}. Consultez le stock matière avant de lancer cette fabrication.`,
        };
      }

      const [order] = await transaction
        .insert(productionOrders)
        .values({
          productionDate: parsed.data.productionDate,
          supervisorId: actor.id,
          plasticType: parsed.data.plasticType,
          materialUsedKg: parsed.data.materialUsedKg,
          bandsPreparedKg: parsed.data.bandsPreparedKg,
          broomsProduced: parsed.data.broomsProduced,
          lossKg: parsed.data.lossKg,
          lossReason: parsed.data.lossReason,
          materialCostPerKg: parsed.data.materialCostPerKg,
          laborCost: parsed.data.laborCost,
          energyCost: parsed.data.energyCost,
          accessoriesCost: parsed.data.accessoriesCost,
          materialCost: costs.materialCost,
          totalCost: costs.totalCost,
        })
        .returning({ id: productionOrders.id });

      await transaction.insert(materialStockMovements).values({
        plasticType: parsed.data.plasticType,
        movementType: "sortie",
        quantityKg: parsed.data.materialUsedKg,
        productionOrderId: order.id,
        actorId: actor.id,
        reason: "Consommation pour fabrication",
      });

      await transaction.insert(finishedProductStockMovements).values({
        movementType: "entree",
        quantity: parsed.data.broomsProduced,
        productionOrderId: order.id,
        actorId: actor.id,
        reason: "Balais fabriqués",
      });

      await transaction.insert(auditLogs).values({
        actorId: actor.id,
        action: "production.created",
        entityType: "production_order",
        entityId: order.id,
        details: {
          productionDate: parsed.data.productionDate,
          plasticType: parsed.data.plasticType,
          materialUsedKg: parsed.data.materialUsedKg,
          bandsPreparedKg: parsed.data.bandsPreparedKg,
          broomsProduced: parsed.data.broomsProduced,
          lossKg: parsed.data.lossKg,
          lossReason: parsed.data.lossReason,
          materialCost: costs.materialCost,
          totalCost: costs.totalCost,
        },
      });

      return {
        message: `Fabrication enregistrée : ${parsed.data.broomsProduced} balais. Coût estimé : ${costs.totalCost} FCFA, soit ${costs.costPerBroom} FCFA par balai.`,
      };
    },
  );

  if (result.error) {
    return result;
  }

  revalidatePath("/production");
  revalidatePath("/tri");
  revalidatePath("/");
  return result;
}
