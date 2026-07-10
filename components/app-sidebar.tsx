"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Music } from "lucide-react";

import { cn } from "@/lib/utils";
import { adminNav, guruNav } from "@/lib/nav";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

type Role = "ADMIN" | "GURU";

/** Returns the single most-specific (longest) nav href that matches the
 * current pathname, so a parent route (e.g. /admin/schedules) is NOT marked
 * active when a more specific child (e.g. /admin/schedules/calendar) matches. */
function bestActiveHref(pathname: string, hrefs: string[]) {
  return hrefs
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
}

export function AppSidebar({
  role,
  user,
  logoutSlot,
}: {
  role: Role;
  user: { name: string; role: string };
  /** `<LogoutButton />` rendered by the server layout and passed down,
   * since it wraps a server action and cannot be imported into this
   * client component's module graph. */
  logoutSlot?: ReactNode;
}) {
  const pathname = usePathname();
  const items = role === "ADMIN" ? adminNav : guruNav;
  const activeHref = bestActiveHref(
    pathname,
    items.map((i) => i.href),
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={role === "ADMIN" ? "/admin/dashboard" : "/guru/dashboard"}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Music className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Maestro</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Music School
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = item.href === activeHref;
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      className={cn(
                        "data-[active=true]:bg-sidebar-primary data-[active=true]:font-medium data-[active=true]:text-sidebar-primary-foreground data-[active=true]:hover:bg-sidebar-primary data-[active=true]:hover:text-sidebar-primary-foreground",
                      )}
                    >
                      <Link href={item.href}>
                        {Icon ? <Icon /> : null}
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} logoutSlot={logoutSlot} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
