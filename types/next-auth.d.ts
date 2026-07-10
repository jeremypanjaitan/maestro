import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role: Role;
    teacherId: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      teacherId: string | null;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    sub?: string;
    role: Role;
    teacherId: string | null;
  }
}
