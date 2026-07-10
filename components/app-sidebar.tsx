"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { MenuIcon } from "lucide-react";

import { adminNav, guruNav, type NavItem } from "@/lib/nav";
import { NavUser } from "@/components/nav-user";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type Role = "ADMIN" | "GURU";

function isActiveHref(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
      {items.map((item) => {
        const active = isActiveHref(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {Icon ? <Icon className="size-4 shrink-0" /> : null}
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppSidebar({
  role,
  userName,
  logoutSlot,
}: {
  role: Role;
  userName: string;
  /** `<LogoutButton />` rendered by the server layout and passed down,
   * since it wraps a server action and cannot be imported into this
   * client component's module graph. */
  logoutSlot?: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = role === "ADMIN" ? adminNav : guruNav;

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-muted/40 md:flex">
        <div className="flex h-16 items-center px-4">
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Maestro
          </span>
        </div>
        <Separator />
        <NavList items={items} pathname={pathname} />
        <Separator />
        <div className="p-3">
          <NavUser name={userName} role={role} logoutSlot={logoutSlot} />
        </div>
      </aside>

      {/* Mobile header + drawer */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 md:hidden">
        <span className="text-lg font-semibold tracking-tight text-foreground">
          Maestro
        </span>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Buka menu">
              <MenuIcon />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex w-64 flex-col p-0">
            <SheetHeader className="h-16 justify-center border-b">
              <SheetTitle>Maestro</SheetTitle>
            </SheetHeader>
            <NavList
              items={items}
              pathname={pathname}
              onNavigate={() => setOpen(false)}
            />
            <Separator />
            <div className="p-3">
              <NavUser name={userName} role={role} logoutSlot={logoutSlot} />
            </div>
          </SheetContent>
        </Sheet>
      </header>
    </>
  );
}
