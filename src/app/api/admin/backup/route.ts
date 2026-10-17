import { eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { getDatabase } from "@/db";
import {
  auditLogs,
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
import { encryptBackup } from "@/lib/backups/encryption";
import { z } from "zod";

const requestSchema = z.object({
  passphrase: z
    .string()
    .min(12, "La phrase de chiffrement doit contenir au moins 12 caractères.")
    .max(128, "La phrase de chiffrement ne peut pas dépasser 128 caractères."),
});

function jsonError(message: string, status: number) {
  return Response.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": "no-store, private",
        "Pragma": "no-cache",
      },
    },
  );
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Votre session a expiré. Reconnectez-vous.", 401);
  }

  const database = getDatabase();
  const [actor] = await database
    .select({
      id: users.id,
      role: users.role,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  if (!actor?.isActive || actor.role !== "administrateur") {
    return jsonError("Seul un administrateur actif peut créer une sauvegarde.", 403);
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 8_192) {
    return jsonError("La demande de sauvegarde dépasse la taille autorisée.", 413);
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return jsonError("La demande de sauvegarde doit être au format JSON.", 415);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return jsonError("La demande de sauvegarde est invalide.", 400);
    }
    throw error;
  }
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message ??
        "La phrase de chiffrement n’est pas valide.",
      400,
    );
  }

  const tables = await database.transaction(async (transaction) => {
    await transaction.execute(sql`set transaction isolation level repeatable read`);
    const [
      userRows,
      collectorRows,
      deliveryRows,
      productionRows,
      materialMovementRows,
      customerRows,
      orderRows,
      saleRows,
      finishedMovementRows,
      paymentRows,
      auditRows,
    ] = await Promise.all([
      transaction.select().from(users),
      transaction.select().from(collectors),
      transaction.select().from(deliveries),
      transaction.select().from(productionOrders),
      transaction.select().from(materialStockMovements),
      transaction.select().from(customers),
      transaction.select().from(salesOrders),
      transaction.select().from(sales),
      transaction.select().from(finishedProductStockMovements),
      transaction.select().from(payments),
      transaction.select().from(auditLogs),
    ]);

    return {
      users: userRows,
      collectors: collectorRows,
      deliveries: deliveryRows,
      productionOrders: productionRows,
      materialStockMovements: materialMovementRows,
      customers: customerRows,
      salesOrders: orderRows,
      sales: saleRows,
      finishedProductStockMovements: finishedMovementRows,
      payments: paymentRows,
      auditLogs: auditRows,
    };
  });

  const archive = {
    format: "fernotech-postgresql-json",
    version: 1,
    createdAt: new Date().toISOString(),
    source: "FERNOTECH ECO-TRACK · PostgreSQL/Neon",
    containsPasswordHashes: true,
    tables,
  };
  const encrypted = encryptBackup(
    JSON.stringify(archive),
    parsed.data.passphrase,
  );
  await database.insert(auditLogs).values({
    actorId: actor.id,
    action: "database.backup.created",
    entityType: "database_backup",
    entityId: crypto.randomUUID(),
    details: {
      format: "fernotech-postgresql-json",
      encryption: "AES-256-GCM",
    },
  });
  const dateStamp = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Douala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .replaceAll("/", "-");

  return new Response(JSON.stringify(encrypted), {
    headers: {
      "Content-Type": "application/vnd.fernotech.backup+json; charset=utf-8",
      "Content-Disposition": `attachment; filename="fernotech-sauvegarde-${dateStamp}.fernotech-backup.json"`,
      "Cache-Control": "no-store, private",
      "Pragma": "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
