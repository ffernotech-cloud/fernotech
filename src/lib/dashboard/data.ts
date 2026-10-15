import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { getDatabase } from "@/db";
import {
  collectors,
  deliveries,
  finishedProductStockMovements,
  materialStockMovements,
  payments,
  productionOrders,
  sales,
} from "@/db/schema";
import { availableFinishedProductStock } from "@/lib/sales/calculations";
import { availableMaterialKg } from "@/lib/sorting/calculations";
import {
  calculateAverageProductionCostPerBroom,
  calculateEstimatedSalesMargin,
  calculateOutstandingReceivables,
  sumAmounts,
  sumKilograms,
} from "./calculations";

export type MonthlyDashboardPoint = {
  month: string;
  acceptedKg: number;
  transformedKg: number;
  producedBrooms: number;
  soldBrooms: number;
};

type CollectorTotals = {
  id: string;
  name: string;
  acceptedKg: number;
  receivedKg: number;
  rejectedKg: number;
};

function safeCount(value: string, label: string): number {
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error(`${label} contient une quantité invalide.`);
  }
  return count;
}

function sumCounts(values: ReadonlyArray<string>, label: string): number {
  const total = values.reduce(
    (sum, value) => sum + safeCount(value, label),
    0,
  );
  if (!Number.isSafeInteger(total)) {
    throw new Error(`${label} dépasse la quantité maximale autorisée.`);
  }
  return total;
}

function kilogramsAsNumber(value: string): number {
  const kilograms = Number(value);
  if (!Number.isFinite(kilograms) || kilograms < 0) {
    throw new Error("Un poids agrégé du tableau de bord est invalide.");
  }
  return kilograms;
}

function roundedKilograms(value: number): number {
  const rounded = Math.round((value + Number.EPSILON) * 1000) / 1000;
  return kilogramsAsNumber(String(rounded));
}

function monthKeys(from: string, to: string): string[] {
  const [startYear, startMonth] = from.slice(0, 7).split("-").map(Number);
  const [endYear, endMonth] = to.slice(0, 7).split("-").map(Number);
  const months: string[] = [];
  let year = startYear;
  let month = startMonth;

  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push(
      `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}`,
    );
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return months;
}

export async function getDashboardData(from: string, to: string) {
  const database = getDatabase();
  const deliveryFilter = and(
    gte(deliveries.deliveryDate, from),
    lte(deliveries.deliveryDate, to),
  );
  const productionFilter = and(
    gte(productionOrders.productionDate, from),
    lte(productionOrders.productionDate, to),
  );
  const salesFilter = and(gte(sales.saleDate, from), lte(sales.saleDate, to));
  const paymentFilter = and(
    gte(payments.paidAt, from),
    lte(payments.paidAt, to),
  );
  const deliveryMonth = sql<string>`to_char(date_trunc('month', ${deliveries.deliveryDate}::date), 'YYYY-MM')`;
  const productionMonth = sql<string>`to_char(date_trunc('month', ${productionOrders.productionDate}::date), 'YYYY-MM')`;
  const salesMonth = sql<string>`to_char(date_trunc('month', ${sales.saleDate}::date), 'YYYY-MM')`;

  const [
    deliveryRows,
    productionRows,
    salesRows,
    paymentRows,
    receivableRows,
    lifetimeProductionRows,
    materialRows,
    finishedRows,
  ] = await Promise.all([
    database
      .select({
        month: deliveryMonth,
        collectorId: deliveries.collectorId,
        collectorName: collectors.name,
        receivedKg: sql<string>`coalesce(sum(${deliveries.receivedKg}::numeric), 0)::text`,
        acceptedKg: sql<string>`coalesce(sum(${deliveries.acceptedKg}::numeric), 0)::text`,
        rejectedKg: sql<string>`coalesce(sum(${deliveries.rejectedKg}::numeric), 0)::text`,
      })
      .from(deliveries)
      .innerJoin(collectors, eq(deliveries.collectorId, collectors.id))
      .where(deliveryFilter)
      .groupBy(deliveryMonth, deliveries.collectorId, collectors.name)
      .orderBy(asc(deliveryMonth)),
    database
      .select({
        month: productionMonth,
        materialUsedKg: sql<string>`coalesce(sum(${productionOrders.materialUsedKg}::numeric), 0)::text`,
        lossKg: sql<string>`coalesce(sum(${productionOrders.lossKg}::numeric), 0)::text`,
        broomsProduced: sql<string>`coalesce(sum(${productionOrders.broomsProduced}), 0)::text`,
        totalCost: sql<string>`coalesce(sum(${productionOrders.totalCost}::numeric), 0)::text`,
      })
      .from(productionOrders)
      .where(productionFilter)
      .groupBy(productionMonth)
      .orderBy(asc(productionMonth)),
    database
      .select({
        month: salesMonth,
        revenue: sql<string>`coalesce(sum(${sales.totalAmount}::numeric), 0)::text`,
        broomsSold: sql<string>`coalesce(sum(${sales.quantity}), 0)::text`,
      })
      .from(sales)
      .where(salesFilter)
      .groupBy(salesMonth)
      .orderBy(asc(salesMonth)),
    database
      .select({
        amount: sql<string>`coalesce(sum(${payments.amount}::numeric), 0)::text`,
      })
      .from(payments)
      .where(paymentFilter),
    database
      .select({
        totalAmount: sales.totalAmount,
        paidAmount: sql<string>`coalesce(sum(${payments.amount}::numeric), 0)::text`,
      })
      .from(sales)
      .leftJoin(payments, eq(payments.saleId, sales.id))
      .groupBy(sales.id, sales.totalAmount),
    database
      .select({
        totalCost: sql<string>`coalesce(sum(${productionOrders.totalCost}::numeric), 0)::text`,
        broomsProduced: sql<string>`coalesce(sum(${productionOrders.broomsProduced}), 0)::text`,
      })
      .from(productionOrders),
    database
      .select({
        plasticType: materialStockMovements.plasticType,
        movementType: materialStockMovements.movementType,
        quantityKg: sql<string>`sum(${materialStockMovements.quantityKg}::numeric)::text`,
      })
      .from(materialStockMovements)
      .groupBy(
        materialStockMovements.plasticType,
        materialStockMovements.movementType,
      ),
    database
      .select({
        movementType: finishedProductStockMovements.movementType,
        quantity: sql<string>`sum(${finishedProductStockMovements.quantity})::text`,
      })
      .from(finishedProductStockMovements)
      .groupBy(finishedProductStockMovements.movementType),
  ]);

  const deliveriesReceivedKg = sumKilograms(
    deliveryRows.map((row) => row.receivedKg),
  );
  const deliveriesAcceptedKg = sumKilograms(
    deliveryRows.map((row) => row.acceptedKg),
  );
  const deliveriesRejectedKg = sumKilograms(
    deliveryRows.map((row) => row.rejectedKg),
  );
  const productionTotalCost = sumAmounts(
    productionRows.map((row) => row.totalCost),
  );
  const productionMaterialUsedKg = sumKilograms(
    productionRows.map((row) => row.materialUsedKg),
  );
  const productionLossKg = sumKilograms(
    productionRows.map((row) => row.lossKg),
  );
  const productionBrooms = sumCounts(
    productionRows.map((row) => row.broomsProduced),
    "La production",
  );
  const salesRevenue = sumAmounts(salesRows.map((row) => row.revenue));
  const broomsSold = sumCounts(
    salesRows.map((row) => row.broomsSold),
    "Les ventes",
  );
  const lifetimeProductionCost = lifetimeProductionRows[0]?.totalCost ?? "0.00";
  const lifetimeBroomsProduced = safeCount(
    lifetimeProductionRows[0]?.broomsProduced ?? "0",
    "La production historique",
  );

  const materialByType = new Map<
    string,
    Array<{ movementType: "entree" | "sortie"; quantityKg: string }>
  >();
  for (const movement of materialRows) {
    const movements = materialByType.get(movement.plasticType) ?? [];
    movements.push({
      movementType: movement.movementType,
      quantityKg: movement.quantityKg,
    });
    materialByType.set(movement.plasticType, movements);
  }

  const materialStock = [...materialByType.entries()]
    .map(([plasticType, movements]) => ({
      plasticType,
      quantityKg: availableMaterialKg(movements),
    }))
    .filter((row) => row.quantityKg > 0)
    .sort((left, right) => left.plasticType.localeCompare(right.plasticType));
  const finishedProductStock = availableFinishedProductStock(
    finishedRows.map((row) => ({
      movementType: row.movementType,
      quantity: safeCount(row.quantity, "Le stock de produits finis"),
    })),
  );

  const monthly = new Map(
    monthKeys(from, to).map((month) => [
      month,
      {
        month,
        acceptedKg: 0,
        transformedKg: 0,
        producedBrooms: 0,
        soldBrooms: 0,
      },
    ]),
  );
  const collectorsById = new Map<string, CollectorTotals>();
  for (const row of deliveryRows) {
    const point = monthly.get(row.month);
    if (point) {
      point.acceptedKg = roundedKilograms(
        point.acceptedKg + Number(row.acceptedKg),
      );
    }

    const collector = collectorsById.get(row.collectorId) ?? {
      id: row.collectorId,
      name: row.collectorName,
      acceptedKg: 0,
      receivedKg: 0,
      rejectedKg: 0,
    };
    collector.acceptedKg += Number(row.acceptedKg);
    collector.receivedKg += Number(row.receivedKg);
    collector.rejectedKg += Number(row.rejectedKg);
    collectorsById.set(row.collectorId, collector);
  }
  for (const row of productionRows) {
    const point = monthly.get(row.month);
    if (point) {
      point.transformedKg = roundedKilograms(
        point.transformedKg + Number(row.materialUsedKg),
      );
      point.producedBrooms = sumCounts(
        [String(point.producedBrooms), row.broomsProduced],
        "Les balais fabriqués",
      );
    }
  }
  for (const row of salesRows) {
    const point = monthly.get(row.month);
    if (point) {
      point.soldBrooms = sumCounts(
        [String(point.soldBrooms), row.broomsSold],
        "Les balais vendus",
      );
    }
  }

  return {
    totals: {
      receivedKg: deliveriesReceivedKg,
      acceptedKg: deliveriesAcceptedKg,
      rejectedKg: deliveriesRejectedKg,
      materialUsedKg: productionMaterialUsedKg,
      lossKg: productionLossKg,
      broomsProduced: productionBrooms,
      broomsSold,
      totalProductionCost: productionTotalCost,
      averageCostPerBroom: calculateAverageProductionCostPerBroom(
        productionTotalCost,
        productionBrooms,
      ),
      revenue: salesRevenue,
      paymentsCollected: paymentRows[0]?.amount ?? "0.00",
      outstandingReceivables: calculateOutstandingReceivables(
        receivableRows,
      ),
      estimatedMargin: calculateEstimatedSalesMargin(
        salesRevenue,
        broomsSold,
        lifetimeProductionCost,
        lifetimeBroomsProduced,
      ),
    },
    materialStock,
    finishedProductStock,
    topCollectors: [...collectorsById.values()]
      .map((collector) => ({
        ...collector,
        acceptedKg: roundedKilograms(collector.acceptedKg),
      }))
      .filter((row) => row.acceptedKg > 0)
      .sort((left, right) => right.acceptedKg - left.acceptedKg)
      .slice(0, 5),
    monthly: [...monthly.values()],
  };
}
