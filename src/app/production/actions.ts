"use server";

import { eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDatabase } from "@/db";
import {
  auditLogs,
  finishedProductStockMovements,
  materialStockMovements,
  productTechnicalSpecs,
  productionOrderLines,
  productionOrders,
  products,
} from "@/db/schema";
import { requirePermission } from "@/lib/auth/guards";
import { formatCurrency } from "@/lib/currency";
import {
  calculateProductionCosts,
  calculateProductionLineTotalCost,
  calculateUnitProductionCost,
  productionMaterialStockIsSufficient,
  productionCostTotals,
  sumProductionBandsKg,
} from "@/lib/production/calculations";
import {
  createProductionSchema,
  type ProductionActionState,
} from "@/lib/production/validation";

const lineFieldNames = [
  "technicalSpecId",
  "quantityProduced",
  "bandsPreparedKg",
  "materialCost",
  "laborCost",
  "energyCost",
  "accessoriesCost",
] as const;

function productionLinesFromForm(formData: FormData) {
  const columns = Object.fromEntries(
    lineFieldNames.map((field) => [field, formData.getAll(field)]),
  ) as Record<(typeof lineFieldNames)[number], Array<string | File>>;
  const rowCount = columns.technicalSpecId.length;
  if (
    rowCount === 0 ||
    lineFieldNames.some((field) => columns[field].length !== rowCount)
  ) {
    return null;
  }
  return Array.from({ length: rowCount }, (_, index) => ({
    technicalSpecId: columns.technicalSpecId[index],
    quantityProduced: columns.quantityProduced[index],
    bandsPreparedKg: columns.bandsPreparedKg[index],
    materialCost: columns.materialCost[index],
    laborCost: columns.laborCost[index],
    energyCost: columns.energyCost[index],
    accessoriesCost: columns.accessoriesCost[index],
  }));
}

export async function createProductionOrder(
  _previousState: ProductionActionState,
  formData: FormData,
): Promise<ProductionActionState> {
  const actor = await requirePermission("production:manage");
  const lines = productionLinesFromForm(formData);
  if (!lines) {
    return {
      error: "Vérifiez les lignes de produits et leurs coûts ventilés.",
    };
  }
  const parsed = createProductionSchema.safeParse({
    productionDate: formData.get("productionDate"),
    plasticType: formData.get("plasticType"),
    materialUsedKg: formData.get("materialUsedKg"),
    lossKg: formData.get("lossKg"),
    lossReason: formData.get("lossReason"),
    materialCostPerKg: formData.get("materialCostPerKg"),
    lines,
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        "Vérifiez les informations de fabrication.",
    };
  }

  const totalQuantity = parsed.data.lines.reduce(
    (sum, line) => sum + line.quantityProduced,
    0,
  );
  const bandsPreparedKg = sumProductionBandsKg(parsed.data.lines);
  const allocatedCosts = productionCostTotals(parsed.data.lines);
  const costs = calculateProductionCosts({
    materialUsedKg: parsed.data.materialUsedKg,
    materialCostPerKg: parsed.data.materialCostPerKg,
    laborCost: allocatedCosts.laborCost,
    energyCost: allocatedCosts.energyCost,
    accessoriesCost: allocatedCosts.accessoriesCost,
    quantityProduced: totalQuantity,
  });
  const requestedSpecIds = [
    ...new Set(parsed.data.lines.map((line) => line.technicalSpecId)),
  ];

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

      const specRows = await transaction
        .select({
          id: productTechnicalSpecs.id,
          version: productTechnicalSpecs.version,
          productId: products.id,
          productCode: products.code,
          productName: products.name,
          isActive: products.isActive,
        })
        .from(productTechnicalSpecs)
        .innerJoin(products, eq(productTechnicalSpecs.productId, products.id))
        .where(inArray(productTechnicalSpecs.id, requestedSpecIds))
        .for("update");
      const specById = new Map(specRows.map((spec) => [spec.id, spec]));
      if (specById.size !== requestedSpecIds.length) {
        return {
          error: "Une fiche technique sélectionnée n’existe plus.",
        };
      }
      const inactiveProduct = specRows.find((spec) => !spec.isActive);
      if (inactiveProduct) {
        return {
          error: `Le produit « ${inactiveProduct.productName} » est inactif et ne peut pas être fabriqué.`,
        };
      }

      const [order] = await transaction
        .insert(productionOrders)
        .values({
          productionDate: parsed.data.productionDate,
          supervisorId: actor.id,
          plasticType: parsed.data.plasticType,
          materialUsedKg: parsed.data.materialUsedKg,
          bandsPreparedKg,
          broomsProduced: totalQuantity,
          lossKg: parsed.data.lossKg,
          lossReason: parsed.data.lossReason,
          materialCostPerKg: parsed.data.materialCostPerKg,
          laborCost: allocatedCosts.laborCost,
          energyCost: allocatedCosts.energyCost,
          accessoriesCost: allocatedCosts.accessoriesCost,
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

      const lineAuditDetails = [];
      for (const line of parsed.data.lines) {
        const spec = specById.get(line.technicalSpecId);
        if (!spec) {
          throw new Error("La fiche technique sélectionnée a disparu.");
        }
        const lineCostBreakdown = {
          materialCost: line.materialCost,
          laborCost: line.laborCost,
          energyCost: line.energyCost,
          accessoriesCost: line.accessoriesCost,
        };
        const lineTotalCost = calculateProductionLineTotalCost(lineCostBreakdown);
        const [createdLine] = await transaction
          .insert(productionOrderLines)
          .values({
            productionOrderId: order.id,
            productId: spec.productId,
            technicalSpecId: spec.id,
            quantityProduced: line.quantityProduced,
            bandsPreparedKg: line.bandsPreparedKg,
            ...lineCostBreakdown,
            totalCost: lineTotalCost,
          })
          .returning({ id: productionOrderLines.id });
        await transaction.insert(finishedProductStockMovements).values({
          movementType: "entree",
          productId: spec.productId,
          quantity: line.quantityProduced,
          productionOrderLineId: createdLine.id,
          actorId: actor.id,
          reason: `Fabrication ${spec.productName}`,
        });
        lineAuditDetails.push({
          productId: spec.productId,
          productCode: spec.productCode,
          productName: spec.productName,
          technicalSpecId: spec.id,
          technicalSpecVersion: spec.version,
          quantityProduced: line.quantityProduced,
          bandsPreparedKg: line.bandsPreparedKg,
          ...lineCostBreakdown,
          totalCost: lineTotalCost,
          unitCost: calculateUnitProductionCost(
            lineTotalCost,
            line.quantityProduced,
          ),
        });
      }

      await transaction.insert(auditLogs).values({
        actorId: actor.id,
        action: "production.created",
        entityType: "production_order",
        entityId: order.id,
        details: {
          productionDate: parsed.data.productionDate,
          plasticType: parsed.data.plasticType,
          materialUsedKg: parsed.data.materialUsedKg,
          bandsPreparedKg,
          lossKg: parsed.data.lossKg,
          lossReason: parsed.data.lossReason,
          materialCost: costs.materialCost,
          totalCost: costs.totalCost,
          lines: lineAuditDetails,
        },
      });

      return {
        message: `Fabrication enregistrée pour ${parsed.data.lines.length} ligne(s) de produit. Coût total : ${formatCurrency(costs.totalCost)}.`,
      };
    },
  );

  if (result.error) {
    return result;
  }

  revalidatePath("/production");
  revalidatePath("/tri");
  revalidatePath("/ventes");
  revalidatePath("/");
  return result;
}
