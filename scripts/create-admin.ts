import { config as loadEnv } from "dotenv";
import { eq, sql } from "drizzle-orm";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { getDatabase } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth/passwords";
import { createUserSchema } from "@/lib/auth/validation";

loadEnv({ path: [".env.local", ".env"] });

async function readHidden(prompt: string): Promise<string> {
  if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
    throw new Error(
      "Cette commande doit être lancée depuis un terminal interactif pour protéger le mot de passe.",
    );
  }

  stdout.write(prompt);
  return new Promise((resolve, reject) => {
    let value = "";
    const cleanup = () => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
    };
    const onData = (key: Buffer) => {
      if (key[0] === 3) {
        cleanup();
        reject(new Error("Création annulée."));
        return;
      }

      if (key[0] === 13 || key[0] === 10) {
        cleanup();
        resolve(value);
        return;
      }

      if (key[0] === 8 || key[0] === 127) {
        value = value.slice(0, -1);
        return;
      }

      const character = key.toString("utf8");
      if (!/[\u0000-\u001f\u007f]/.test(character)) {
        value += character;
      }
    };

    stdin.setRawMode(true);
    stdin.resume();
    stdin.on("data", onData);
  });
}

async function main() {
  const readline = createInterface({ input: stdin, output: stdout });
  const identifier = await readline.question("Identifiant administrateur : ");
  const displayName = await readline.question("Nom affiché : ");
  readline.close();

  const password = await readHidden("Mot de passe (12 caractères minimum) : ");
  const confirmation = await readHidden("Confirmez le mot de passe : ");

  if (password !== confirmation) {
    throw new Error("Les mots de passe ne correspondent pas.");
  }

  const parsed = createUserSchema.safeParse({
    identifier,
    displayName,
    password,
    role: "administrateur",
  });
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "Les informations saisies sont invalides.",
    );
  }

  const database = getDatabase();
  const passwordHash = await hashPassword(parsed.data.password);

  try {
    await database.transaction(async (transaction) => {
      await transaction.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext('fernotech-user-management'))`,
      );
      const [existing] = await transaction
        .select({ id: users.id })
        .from(users)
        .where(eq(users.identifier, parsed.data.identifier))
        .limit(1);

      if (existing) {
        throw new Error("Cet identifiant est déjà utilisé.");
      }

      const [anyUser] = await transaction
        .select({ id: users.id })
        .from(users)
        .limit(1);

      if (anyUser) {
        throw new Error(
          "La création initiale est réservée à une base sans utilisateur. Demandez à un administrateur de créer ce compte.",
        );
      }

      const [admin] = await transaction
        .insert(users)
        .values({
          identifier: parsed.data.identifier,
          displayName: parsed.data.displayName,
          passwordHash,
          role: "administrateur",
        })
        .returning({ id: users.id });

      await transaction.insert(auditLogs).values({
        actorId: null,
        action: "user.initial_admin_created",
        entityType: "user",
        entityId: admin.id,
        details: { identifier: parsed.data.identifier, role: "administrateur" },
      });
    });
  } finally {
    await database.$client.end();
  }

  console.info("Le compte administrateur a été créé.");
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Erreur inattendue.";
  console.error(`Création administrateur impossible : ${message}`);
  process.exitCode = 1;
});
