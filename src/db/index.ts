import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@/db/schema";

neonConfig.webSocketConstructor = ws;

type AppDatabase = NeonDatabase<typeof schema> & { $client: Pool };

const globalForDatabase = globalThis as typeof globalThis & {
  fernotechDatabase?: AppDatabase;
};

export function getDatabase(): AppDatabase {
  if (globalForDatabase.fernotechDatabase) {
    return globalForDatabase.fernotechDatabase;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL est absente. Vérifiez la connexion Neon dans Vercel ou votre fichier .env.local.",
    );
  }

  const pool = new Pool({ connectionString });
  const database = drizzle(pool, { schema });
  globalForDatabase.fernotechDatabase = database;

  return database;
}
