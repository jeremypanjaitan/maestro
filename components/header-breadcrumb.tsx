"use client";

import { usePathname } from "next/navigation";

import { adminNav, guruNav } from "@/lib/nav";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

function isActiveHref(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Header breadcrumb showing the app section and, when the current path
 * matches a nav item, that item's label (e.g. "Admin / Jadwal").
 *
 * Reads the nav list directly (rather than accepting it as a prop) since
 * this is a Client Component and `NavItem.icon` (a lucide component) isn't
 * serializable across the Server -> Client Component boundary. */
export function HeaderBreadcrumb({ role }: { role: "ADMIN" | "GURU" }) {
  const pathname = usePathname();
  const section = role === "ADMIN" ? "Admin" : "Guru";
  const items = role === "ADMIN" ? adminNav : guruNav;
  const current = items.find((item) => isActiveHref(pathname, item.href));

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden md:block">{section}</BreadcrumbItem>
        {current ? (
          <>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>{current.label}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        ) : null}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
