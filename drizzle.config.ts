import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

loadEnv({ path: [".env.local", ".env"] });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL est manquante. Récupérez les variables Neon du projet Vercel dans .env.local.",
  );
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});
