import type { NextAuthConfig } from "next-auth";
import { appRoles } from "@/lib/auth/roles";

export const authConfig = {
  pages: {
    signIn: "/connexion",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8,
  },
  callbacks: {
    authorized({ auth, request }) {
      const path = request.nextUrl.pathname;
      if (path === "/connexion" || path === "/acces-refuse") {
        return true;
      }

      return Boolean(auth?.user);
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        const id = typeof token.id === "string" ? token.id : token.sub;
        const role = appRoles.find((candidate) => candidate === token.role);

        if (!id || !role) {
          throw new Error("La session utilisateur est invalide.");
        }

        session.user.id = id;
        session.user.role = role;
      }

      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
