import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

export const { auth: proxy } = NextAuth(authConfig);

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|hors-ligne\\.html|offline-app\\.js|service-worker\\.js|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
