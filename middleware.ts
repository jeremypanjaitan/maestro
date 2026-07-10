import NextAuth from "next-auth";

import { authConfig } from "@/auth.config";

/**
 * Middleware runs on the Edge runtime, which cannot bundle bcrypt/Prisma.
 * Build a separate, providers-less NextAuth instance from the edge-safe
 * `authConfig` (split config pattern) instead of importing from
 * `@/lib/auth`, which pulls in the Credentials provider + Prisma client.
 */
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/admin/:path*", "/guru/:path*"],
};
