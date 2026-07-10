import type { ReactNode } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  GURU: "Guru",
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function NavUser({
  name,
  role,
  logoutSlot,
}: {
  name: string;
  role: string;
  /** Rendered by a Server Component parent (e.g. `<LogoutButton />`), passed
   * down through the client sidebar tree rather than imported here, since
   * `LogoutButton` wraps a server action and pulls in Prisma/bcrypt. */
  logoutSlot?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <Avatar>
        <AvatarFallback>{initials(name) || "?"}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-foreground">
          {name}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {ROLE_LABEL[role] ?? role}
        </span>
      </div>
      {logoutSlot}
    </div>
  );
}
