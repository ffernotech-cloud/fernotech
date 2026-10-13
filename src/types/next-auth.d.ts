import type { DefaultSession } from "next-auth";
import type { AppRole } from "@/lib/auth/roles";

declare module "next-auth" {
  interface User {
    role: AppRole;
  }

  interface Session {
    user: {
      id: string;
      role: AppRole;
    } & NonNullable<DefaultSession["user"]>;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: AppRole;
  }
}
