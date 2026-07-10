import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Formats an integer amount as Indonesian Rupiah, e.g. `formatRupiah(150000)` -> "Rp 150.000". */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/** Indonesian month names, index 0 = Januari .. 11 = Desember. */
export const MONTH_NAMES_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
]

/** Formats a payroll period, e.g. `formatPeriod(7, 2026)` -> "Juli 2026". */
export function formatPeriod(month: number, year: number): string {
  return `${MONTH_NAMES_ID[month - 1] ?? month} ${year}`
}
