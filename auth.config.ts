import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe NextAuth config. No providers, no bcrypt/prisma imports here —
 * this file is consumed by middleware (edge runtime) as well as by
 * `lib/auth.ts` (Node runtime). Keep it free of anything that can't run
 * on the edge.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const role = auth?.user?.role;
      const { pathname } = request.nextUrl;

      const isAdminRoute = pathname.startsWith("/admin");
      const isGuruRoute = pathname.startsWith("/guru");

      if (!isAdminRoute && !isGuruRoute) {
        // Public routes (e.g. "/", "/login") are always allowed.
        return true;
      }

      if (!isLoggedIn) {
        // Not authenticated: send to /login (Next-Auth appends callbackUrl).
        return false;
      }

      if (isAdminRoute && role !== "ADMIN") {
        return Response.redirect(
          new URL(
            role === "GURU" ? "/guru/dashboard" : "/login",
            request.nextUrl,
          ),
        );
      }

      if (isGuruRoute && role !== "GURU") {
        return Response.redirect(
          new URL(
            role === "ADMIN" ? "/admin/dashboard" : "/login",
            request.nextUrl,
          ),
        );
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
