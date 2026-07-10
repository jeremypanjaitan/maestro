import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  CalendarRange,
  ClipboardList,
  History,
  LayoutDashboard,
  Users,
  GraduationCap,
  Wallet,
  FileBarChart,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon?: LucideIcon;
};

export const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Guru", href: "/admin/teachers", icon: GraduationCap },
  { label: "Murid", href: "/admin/students", icon: Users },
  { label: "Jadwal", href: "/admin/schedules", icon: CalendarDays },
  { label: "Kalender", href: "/admin/schedules/calendar", icon: CalendarRange },
  { label: "Sesi", href: "/admin/sessions", icon: ClipboardList },
  { label: "Payroll", href: "/admin/payroll", icon: Wallet },
  { label: "Laporan", href: "/admin/reports", icon: FileBarChart },
];

export const guruNav: NavItem[] = [
  { label: "Dashboard", href: "/guru/dashboard", icon: LayoutDashboard },
  { label: "Jadwal", href: "/guru/schedule", icon: CalendarDays },
  { label: "Sesi & Absensi", href: "/guru/sessions", icon: ClipboardList },
  { label: "Riwayat", href: "/guru/reports/history", icon: History },
  { label: "Payroll", href: "/guru/payroll", icon: Wallet },
];
