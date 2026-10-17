import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { getDatabase } from "@/db";
import {
  collectors,
  deliveries,
  materialStockMovements,
  users,
} from "@/db/schema";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json(
      { error: "Connectez-vous pour préparer l’espace hors ligne." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
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

  if (!actor?.isActive || !["administrateur", "responsable_atelier"].includes(actor.role)) {
    return Response.json(
      { error: "Seuls l’administrateur et le responsable d’atelier peuvent préparer les saisies hors ligne." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const [collectorRows, deliveryRows, movementRows] = await Promise.all([
    database
      .select({
        id: collectors.id,
        name: collectors.name,
      })
      .from(collectors)
      .where(eq(collectors.isActive, true))
      .orderBy(asc(collectors.name)),
    database
      .select({
        id: deliveries.id,
        collectorId: deliveries.collectorId,
        collectorName: collectors.name,
        deliveryDate: deliveries.deliveryDate,
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
      .where(
        inArray(deliveries.status, ["recue", "triee"]),
      )
      .orderBy(desc(deliveries.deliveryDate), desc(deliveries.createdAt))
      .limit(500),
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
      )
      .orderBy(asc(materialStockMovements.plasticType)),
  ]);

  const stockByType = new Map<string, number>();
  for (const movement of movementRows) {
    const balance = stockByType.get(movement.plasticType) ?? 0;
    const quantity = Number(movement.quantityKg);
    stockByType.set(
      movement.plasticType,
      balance + (movement.movementType === "entree" ? quantity : -quantity),
    );
  }

  return Response.json(
    {
      ownerId: actor.id,
      preparedAt: new Date().toISOString(),
      collectors: collectorRows,
      deliveries: deliveryRows,
      materialStock: [...stockByType.entries()]
        .map(([plasticType, quantityKg]) => ({ plasticType, quantityKg }))
        .filter((row) => row.quantityKg > 0)
        .sort((left, right) => left.plasticType.localeCompare(right.plasticType)),
      limitedDeliveries: deliveryRows.length === 500,
    },
    {
      headers: {
        "Cache-Control": "private, no-store",
        "Vary": "Cookie",
      },
    },
  );
}
