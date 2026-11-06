import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { getDatabase } from "@/db";
import {
  collectors,
  deliveries,
  finishedProductStockMovements,
  materialStockMovements,
  payments,
  productionOrderLines,
  productionOrders,
  products,
  saleLines,
  sales,
} from "@/db/schema";
import { availableMaterialKg } from "@/lib/sorting/calculations";
import {
  calculateAverageProductionCostPerBroom,
  calculateOutstandingReceivables,
  calculateProductSummaries,
  sumAmounts,
  sumKilograms,
  type ProductDashboardSummary,
} from "./calculations";
import { currentDoualaYear } from "./period";

export type MonthlyDashboardPoint = {
  month: string;
  acceptedKg: number;
  transformedKg: number;
  producedUnits: number;
  soldUnits: number;
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

export async function getAvailableYears(): Promise<number[]> {
  const database = getDatabase();
  const [deliveryYears, productionYears, salesYears, paymentYears] =
    await Promise.all([
    database
      .select({
        year: sql<number>`distinct extract(year from ${deliveries.deliveryDate})::int`,
      })
      .from(deliveries),
    database
      .select({
        year: sql<number>`distinct extract(year from ${productionOrders.productionDate})::int`,
      })
      .from(productionOrders),
    database
      .select({
        year: sql<number>`distinct extract(year from ${sales.saleDate})::int`,
      })
      .from(sales),
    database
      .select({
        year: sql<number>`distinct extract(year from ${payments.paidAt})::int`,
      })
      .from(payments),
  ]);

  const yearSet = new Set<number>([Number(currentDoualaYear())]);
  for (const row of [
    ...deliveryYears,
    ...productionYears,
    ...salesYears,
    ...paymentYears,
  ]) {
    if (row.year && row.year >= 2000 && row.year <= 2100) {
      yearSet.add(row.year);
    }
  }
  return [...yearSet].sort((a, b) => b - a);
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
    productRows,
    deliveryRows,
    productionRows,
    productProductionRows,
    salesRows,
    productSalesRows,
    monthlyProductionUnitsRows,
    monthlySalesUnitsRows,
    paymentRows,
    receivableRows,
    lifetimeProductProductionRows,
    materialRows,
    productStockRows,
  ] = await Promise.all([
    database
      .select({
        id: products.id,
        code: products.code,
        name: products.name,
        unitLabel: products.unitLabel,
        isActive: products.isActive,
      })
      .from(products)
      .orderBy(asc(products.name)),
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
        totalCost: sql<string>`coalesce(sum(${productionOrders.totalCost}::numeric), 0)::text`,
      })
      .from(productionOrders)
      .where(productionFilter)
      .groupBy(productionMonth)
      .orderBy(asc(productionMonth)),
    database
      .select({
        productId: productionOrderLines.productId,
        quantityProduced: sql<string>`coalesce(sum(${productionOrderLines.quantityProduced}), 0)::text`,
        bandsPreparedKg: sql<string>`coalesce(sum(${productionOrderLines.bandsPreparedKg}::numeric), 0)::text`,
        totalCost: sql<string>`coalesce(sum(${productionOrderLines.totalCost}::numeric), 0)::text`,
      })
      .from(productionOrderLines)
      .innerJoin(
        productionOrders,
        eq(productionOrderLines.productionOrderId, productionOrders.id),
      )
      .where(productionFilter)
      .groupBy(productionOrderLines.productId),
    database
      .select({
        month: salesMonth,
        revenue: sql<string>`coalesce(sum(${sales.totalAmount}::numeric), 0)::text`,
      })
      .from(sales)
      .where(salesFilter)
      .groupBy(salesMonth)
      .orderBy(asc(salesMonth)),
    database
      .select({
        productId: saleLines.productId,
        quantitySold: sql<string>`coalesce(sum(${saleLines.quantity}), 0)::text`,
        revenue: sql<string>`coalesce(sum(${saleLines.totalAmount}::numeric), 0)::text`,
      })
      .from(saleLines)
      .innerJoin(sales, eq(saleLines.saleId, sales.id))
      .where(salesFilter)
      .groupBy(saleLines.productId),
    database
      .select({
        month: productionMonth,
        quantityProduced: sql<string>`coalesce(sum(${productionOrderLines.quantityProduced}), 0)::text`,
      })
      .from(productionOrderLines)
      .innerJoin(
        productionOrders,
        eq(productionOrderLines.productionOrderId, productionOrders.id),
      )
      .where(productionFilter)
      .groupBy(productionMonth)
      .orderBy(asc(productionMonth)),
    database
      .select({
        month: salesMonth,
        quantitySold: sql<string>`coalesce(sum(${saleLines.quantity}), 0)::text`,
      })
      .from(saleLines)
      .innerJoin(sales, eq(saleLines.saleId, sales.id))
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
        productId: productionOrderLines.productId,
        totalCost: sql<string>`coalesce(sum(${productionOrderLines.totalCost}::numeric), 0)::text`,
        quantityProduced: sql<string>`coalesce(sum(${productionOrderLines.quantityProduced}), 0)::text`,
      })
      .from(productionOrderLines)
      .groupBy(productionOrderLines.productId),
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
        productId: finishedProductStockMovements.productId,
        movementType: finishedProductStockMovements.movementType,
        quantity: sql<string>`sum(${finishedProductStockMovements.quantity})::text`,
      })
      .from(finishedProductStockMovements)
      .groupBy(
        finishedProductStockMovements.productId,
        finishedProductStockMovements.movementType,
      ),
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
  const salesRevenue = sumAmounts(salesRows.map((row) => row.revenue));
  const lifetimeProductionByProduct = new Map(
    lifetimeProductProductionRows.map((row) => [
      row.productId,
      {
        totalCost: row.totalCost,
        quantityProduced: safeCount(
          row.quantityProduced,
          "La production historique",
        ),
      },
    ]),
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

  const stockByProductMap = new Map<string, number>();
  for (const row of productStockRows) {
    const qty = safeCount(row.quantity, "Le stock produit");
    const delta = row.movementType === "entree" ? qty : -qty;
    stockByProductMap.set(
      row.productId,
      (stockByProductMap.get(row.productId) ?? 0) + delta,
    );
  }

  const productionByProduct = new Map(
    productProductionRows.map((row) => [row.productId, row]),
  );
  const salesByProduct = new Map(
    productSalesRows.map((row) => [row.productId, row]),
  );

  const productsSummary: ProductDashboardSummary[] = calculateProductSummaries(
    productRows.map((product) => {
      const production = productionByProduct.get(product.id);
      const sale = salesByProduct.get(product.id);
      const lifetimeProduction = lifetimeProductionByProduct.get(product.id);
      return {
        product,
        producedQuantity: production
          ? safeCount(production.quantityProduced, "La production")
          : 0,
        producedCost: production?.totalCost ?? "0.00",
        soldQuantity: sale
          ? safeCount(sale.quantitySold, "La vente")
          : 0,
        revenue: sale?.revenue ?? "0.00",
        currentStock: stockByProductMap.get(product.id) ?? 0,
        historicalProductionCost: lifetimeProduction?.totalCost ?? "0.00",
        historicalProducedQuantity: lifetimeProduction?.quantityProduced ?? 0,
      };
    }),
  );

  const totalUnitsProduced = productsSummary.reduce(
    (sum, p) => sum + p.quantityProduced,
    0,
  );
  const totalUnitsSold = productsSummary.reduce(
    (sum, p) => sum + p.quantitySold,
    0,
  );
  const totalFinishedStock = productsSummary.reduce(
    (sum, p) => sum + p.currentStock,
    0,
  );

  const balaiSummary = productsSummary.find((p) => p.productCode === "BALAI");
  const broomsProduced = balaiSummary?.quantityProduced ?? 0;
  const broomsSold = balaiSummary?.quantitySold ?? 0;
  const estimatedMargin =
    productsSummary.some(
      (product) =>
        product.quantitySold > 0 && product.estimatedMargin === null,
    )
      ? null
      : sumAmounts(
          productsSummary.flatMap((product) =>
            product.estimatedMargin === null
              ? []
              : [product.estimatedMargin],
          ),
        );

  const monthly = new Map(
    monthKeys(from, to).map((month) => [
      month,
      {
        month,
        acceptedKg: 0,
        transformedKg: 0,
        producedUnits: 0,
        soldUnits: 0,
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
    }
  }
  for (const row of monthlyProductionUnitsRows) {
    const point = monthly.get(row.month);
    if (point) {
      const qty = safeCount(row.quantityProduced, "Les unités fabriquées");
      point.producedUnits = point.producedUnits + qty;
    }
  }
  for (const row of monthlySalesUnitsRows) {
    const point = monthly.get(row.month);
    if (point) {
      const qty = safeCount(row.quantitySold, "Les unités vendues");
      point.soldUnits = point.soldUnits + qty;
    }
  }

  return {
    totals: {
      receivedKg: deliveriesReceivedKg,
      acceptedKg: deliveriesAcceptedKg,
      rejectedKg: deliveriesRejectedKg,
      materialUsedKg: productionMaterialUsedKg,
      lossKg: productionLossKg,
      unitsProduced: totalUnitsProduced,
      unitsSold: totalUnitsSold,
      broomsProduced,
      broomsSold,
      totalProductionCost: productionTotalCost,
      averageCostPerBroom: calculateAverageProductionCostPerBroom(
        balaiSummary?.productionCost ?? "0.00",
        broomsProduced,
      ),
      revenue: salesRevenue,
      paymentsCollected: paymentRows[0]?.amount ?? "0.00",
      outstandingReceivables: calculateOutstandingReceivables(
        receivableRows,
      ),
      estimatedMargin,
    },
    materialStock,
    finishedProductStock: totalFinishedStock,
    productsSummary,
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
