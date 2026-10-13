import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { authConfig } from "@/auth.config";
import { getDatabase } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/auth/passwords";
import { loginSchema } from "@/lib/auth/validation";

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        identifier: { label: "Identifiant", type: "text" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const parsedCredentials = loginSchema.safeParse(credentials);
        if (!parsedCredentials.success) {
          return null;
        }

        const database = getDatabase();
        const [user] = await database
          .select()
          .from(users)
          .where(eq(users.identifier, parsedCredentials.data.identifier))
          .limit(1);

        if (!user || !user.isActive) {
          return null;
        }

        const passwordMatches = await verifyPassword(
          parsedCredentials.data.password,
          user.passwordHash,
        );
        if (!passwordMatches) {
          return null;
        }

        return {
          id: user.id,
          name: user.displayName,
          email: user.identifier,
          role: user.role,
        };
      },
    }),
  ],
});
