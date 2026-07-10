import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { LogoutButton } from "@/components/logout-button";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/guru/dashboard");

  return (
    <div className="min-h-svh">
      <AppSidebar
        role="ADMIN"
        userName={session.user.name ?? session.user.email ?? "Admin"}
        logoutSlot={<LogoutButton />}
      />
      <main className="md:pl-64">
        <div className="mx-auto max-w-6xl p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
