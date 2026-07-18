import type { LucideIcon } from "lucide-react";
import {
  CalendarRange,
  ClipboardList,
  History,
  LayoutDashboard,
  Users,
  GraduationCap,
  FileBarChart,
  Wallet,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon?: LucideIcon;
};

// The old monthly-payroll nav entries (/admin/payroll, /guru/payroll) remain
// intentionally omitted (see `.superpowers/sdd/hide-tarif.md`) — those routes
// still exist but are unlinked. The "Pembayaran Honor" entries below are the
// current honor-payment feature (/admin/honor, /guru/honor), which replaces
// payroll in the UI.
export const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Guru", href: "/admin/teachers", icon: GraduationCap },
  { label: "Murid", href: "/admin/students", icon: Users },
  { label: "Kalender", href: "/admin/schedules/calendar", icon: CalendarRange },
  { label: "Sesi", href: "/admin/sessions", icon: ClipboardList },
  { label: "Pembayaran Honor", href: "/admin/honor", icon: Wallet },
  { label: "Laporan", href: "/admin/reports", icon: FileBarChart },
];

export const guruNav: NavItem[] = [
  { label: "Dashboard", href: "/guru/dashboard", icon: LayoutDashboard },
  { label: "Kalender", href: "/guru/schedule", icon: CalendarRange },
  { label: "Sesi & Absensi", href: "/guru/sessions", icon: ClipboardList },
  { label: "Pembayaran Honor", href: "/guru/honor", icon: Wallet },
  { label: "Riwayat", href: "/guru/reports/history", icon: History },
];
