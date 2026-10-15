import { asc, desc, eq, sql } from "drizzle-orm";
import { getDatabase } from "@/db";
import {
  collectors,
  customers,
  deliveries,
  finishedProductStockMovements,
  materialStockMovements,
  payments,
  productionOrders,
  sales,
  salesOrders,
  users,
} from "@/db/schema";
import { requirePermission } from "@/lib/auth/guards";
import { collectorTypeLabels } from "@/lib/auth/roles";
import type { Permission } from "@/lib/auth/roles";
import { serializeCsv, type CsvValue } from "@/lib/exports/csv";

const exportPermissions: Record<string, Permission> = {
  collecteurs: "collectors:manage",
  tri: "sorting:manage",
  production: "production:manage",
  clients: "customers:manage",
  ventes: "sales:manage",
  reglements: "sales:manage",
  "stock-matiere": "materials:read",
  "stock-produits": "products:read",
};

function formatDate(value: string | Date | null): string {
  if (!value) {
    return "";
  }
  if (typeof value === "string") {
    return value.split("-").reverse().join("/");
  }
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Africa/Douala",
  }).format(value);
}

function csvResponse(
  moduleName: string,
  headers: string[],
  rows: CsvValue[][],
): Response {
  const dateStamp = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Africa/Douala",
  })
    .format(new Date())
    .replaceAll("/", "-");
  const csv = serializeCsv(headers, rows);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fernotech-${moduleName}-${dateStamp}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ module: string }> },
) {
  const { module } = await context.params;
  const permission = exportPermissions[module];
  if (!permission) {
    return new Response("Export introuvable.", { status: 404 });
  }
  await requirePermission(permission);

  const database = getDatabase();
  if (module === "collecteurs") {
    const rows = await database
      .select({
        name: collectors.name,
        type: collectors.type,
        phone: collectors.phone,
        zone: collectors.zone,
        isActive: collectors.isActive,
        notes: collectors.notes,
        receivedKg: sql<number>`coalesce(sum(${deliveries.receivedKg}::numeric), 0)::float8`
          .mapWith(Number)
          .as("received_kg"),
        acceptedKg: sql<number>`coalesce(sum(${deliveries.acceptedKg}::numeric), 0)::float8`
          .mapWith(Number)
          .as("accepted_kg"),
      })
      .from(collectors)
      .leftJoin(deliveries, eq(deliveries.collectorId, collectors.id))
      .groupBy(collectors.id)
      .orderBy(asc(collectors.name));

    return csvResponse(
      module,
      [
        "Nom",
        "Type",
        "Téléphone",
        "Zone",
        "Statut",
        "Poids reçu (kg)",
        "Poids accepté (kg)",
        "Taux d’acceptation (%)",
        "Notes",
      ],
      rows.map((row) => [
        row.name,
        collectorTypeLabels[row.type],
        row.phone,
        row.zone,
        row.isActive ? "Actif" : "Inactif",
        row.receivedKg,
        row.acceptedKg,
        row.receivedKg === 0
          ? 0
          : Number(((row.acceptedKg / row.receivedKg) * 100).toFixed(1)),
        row.notes,
      ]),
    );
  }

  if (module === "tri") {
    const rows = await database
      .select({
        deliveryDate: deliveries.deliveryDate,
        collectorName: collectors.name,
        collectionPoint: deliveries.collectionPoint,
        plasticType: deliveries.plasticType,
        receivedKg: deliveries.receivedKg,
        acceptedKg: deliveries.acceptedKg,
        rejectedKg: deliveries.rejectedKg,
        rejectionReason: deliveries.rejectionReason,
        status: deliveries.status,
      })
      .from(deliveries)
      .innerJoin(collectors, eq(deliveries.collectorId, collectors.id))
      .orderBy(desc(deliveries.deliveryDate), desc(deliveries.createdAt));

    const statusLabels = {
      recue: "Reçue",
      triee: "Triée",
      integree_au_stock: "Intégrée au stock",
    } as const;
    return csvResponse(
      module,
      [
        "Date",
        "Collecteur",
        "Point de collecte",
        "Type de plastique",
        "Poids reçu (kg)",
        "Poids accepté (kg)",
        "Poids rejeté (kg)",
        "Motif du rejet",
        "Statut",
      ],
      rows.map((row) => [
        formatDate(row.deliveryDate),
        row.collectorName,
        row.collectionPoint,
        row.plasticType,
        row.receivedKg,
        row.acceptedKg,
        row.rejectedKg,
        row.rejectionReason,
        statusLabels[row.status],
      ]),
    );
  }

  if (module === "production") {
    const rows = await database
      .select({
        productionDate: productionOrders.productionDate,
        supervisorName: users.displayName,
        plasticType: productionOrders.plasticType,
        materialUsedKg: productionOrders.materialUsedKg,
        bandsPreparedKg: productionOrders.bandsPreparedKg,
        broomsProduced: productionOrders.broomsProduced,
        lossKg: productionOrders.lossKg,
        lossReason: productionOrders.lossReason,
        materialCostPerKg: productionOrders.materialCostPerKg,
        materialCost: productionOrders.materialCost,
        laborCost: productionOrders.laborCost,
        energyCost: productionOrders.energyCost,
        accessoriesCost: productionOrders.accessoriesCost,
        totalCost: productionOrders.totalCost,
      })
      .from(productionOrders)
      .innerJoin(users, eq(productionOrders.supervisorId, users.id))
      .orderBy(desc(productionOrders.productionDate), desc(productionOrders.createdAt));

    return csvResponse(
      module,
      [
        "Date",
        "Responsable",
        "Type de plastique",
        "Matière utilisée (kg)",
        "Bandes préparées (kg)",
        "Balais fabriqués",
        "Pertes (kg)",
        "Motif des pertes",
        "Coût matière par kg",
        "Coût matière",
        "Main-d’œuvre",
        "Énergie",
        "Accessoires",
        "Coût total",
        "Coût par balai",
      ],
      rows.map((row) => [
        formatDate(row.productionDate),
        row.supervisorName,
        row.plasticType,
        row.materialUsedKg,
        row.bandsPreparedKg,
        row.broomsProduced,
        row.lossKg,
        row.lossReason,
        row.materialCostPerKg,
        row.materialCost,
        row.laborCost,
        row.energyCost,
        row.accessoriesCost,
        row.totalCost,
        (Number(row.totalCost) / row.broomsProduced).toFixed(2),
      ]),
    );
  }

  if (module === "clients") {
    const rows = await database
      .select({
        name: customers.name,
        phone: customers.phone,
        address: customers.address,
        notes: customers.notes,
        createdAt: customers.createdAt,
      })
      .from(customers)
      .orderBy(desc(customers.createdAt));

    return csvResponse(
      module,
      ["Nom", "Téléphone", "Adresse", "Notes", "Créé le"],
      rows.map((row) => [
        row.name,
        row.phone,
        row.address,
        row.notes,
        formatDate(row.createdAt),
      ]),
    );
  }

  if (module === "ventes") {
    const [orders, paymentTotals] = await Promise.all([
      database
        .select({
          orderDate: salesOrders.orderDate,
          customerName: customers.name,
          status: salesOrders.status,
          quantity: salesOrders.quantity,
          unitPrice: salesOrders.unitPrice,
          totalAmount: salesOrders.totalAmount,
          saleId: sales.id,
        })
        .from(salesOrders)
        .innerJoin(customers, eq(salesOrders.customerId, customers.id))
        .leftJoin(sales, eq(sales.orderId, salesOrders.id))
        .orderBy(desc(salesOrders.orderDate), desc(salesOrders.createdAt)),
      database
        .select({
          saleId: payments.saleId,
          amount: sql<string>`coalesce(sum(${payments.amount}::numeric), 0)::text`.as(
            "paid_amount",
          ),
        })
        .from(payments)
        .groupBy(payments.saleId),
    ]);

    const paidBySale = new Map(
      paymentTotals.map((payment) => [payment.saleId, Number(payment.amount)]),
    );
    const statusLabels = {
      en_attente: "En attente",
      preparee: "Préparée",
      livree: "Livrée",
      annulee: "Annulée",
    } as const;
    return csvResponse(
      module,
      [
        "Date commande",
        "Client",
        "Statut",
        "Quantité (balais)",
        "Prix unitaire",
        "Montant total",
        "Montant encaissé",
        "Reste dû",
      ],
      orders.map((row) => {
        const total = Number(row.totalAmount);
        const paid = row.saleId ? (paidBySale.get(row.saleId) ?? 0) : null;
        return [
          formatDate(row.orderDate),
          row.customerName,
          statusLabels[row.status],
          row.quantity,
          row.unitPrice,
          row.totalAmount,
          paid,
          paid === null ? null : Math.max(0, total - paid).toFixed(2),
        ];
      }),
    );
  }

  if (module === "reglements") {
    const rows = await database
      .select({
        paidAt: payments.paidAt,
        customerName: customers.name,
        amount: payments.amount,
        method: payments.method,
        reference: payments.reference,
      })
      .from(payments)
      .innerJoin(sales, eq(payments.saleId, sales.id))
      .innerJoin(customers, eq(sales.customerId, customers.id))
      .orderBy(desc(payments.paidAt), desc(payments.createdAt));

    const methodLabels = {
      especes: "Espèces",
      mobile_money: "Mobile money",
      virement: "Virement",
    } as const;
    return csvResponse(
      module,
      ["Date", "Client", "Montant", "Mode de règlement", "Référence"],
      rows.map((row) => [
        formatDate(row.paidAt),
        row.customerName,
        row.amount,
        methodLabels[row.method],
        row.reference,
      ]),
    );
  }

  if (module === "stock-matiere") {
    const rows = await database
      .select({
        createdAt: materialStockMovements.createdAt,
        plasticType: materialStockMovements.plasticType,
        movementType: materialStockMovements.movementType,
        quantityKg: materialStockMovements.quantityKg,
        reason: materialStockMovements.reason,
        collectorName: collectors.name,
      })
      .from(materialStockMovements)
      .leftJoin(deliveries, eq(materialStockMovements.deliveryId, deliveries.id))
      .leftJoin(collectors, eq(deliveries.collectorId, collectors.id))
      .orderBy(desc(materialStockMovements.createdAt));

    return csvResponse(
      module,
      [
        "Date du mouvement",
        "Type de plastique",
        "Mouvement",
        "Quantité (kg)",
        "Collecteur",
        "Motif",
      ],
      rows.map((row) => [
        formatDate(row.createdAt),
        row.plasticType,
        row.movementType === "entree" ? "Entrée" : "Sortie",
        row.quantityKg,
        row.collectorName,
        row.reason,
      ]),
    );
  }

  const finishedRows = await database
    .select({
      createdAt: finishedProductStockMovements.createdAt,
      movementType: finishedProductStockMovements.movementType,
      quantity: finishedProductStockMovements.quantity,
      reason: finishedProductStockMovements.reason,
      saleId: finishedProductStockMovements.saleId,
      customerName: customers.name,
    })
    .from(finishedProductStockMovements)
    .leftJoin(sales, eq(finishedProductStockMovements.saleId, sales.id))
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .orderBy(desc(finishedProductStockMovements.createdAt));

  return csvResponse(
    module,
    ["Date du mouvement", "Mouvement", "Quantité (balais)", "Client", "Motif"],
    finishedRows.map((row) => [
      formatDate(row.createdAt),
      row.movementType === "entree" ? "Entrée" : "Sortie",
      row.quantity,
      row.customerName,
      row.reason,
    ]),
  );
}
