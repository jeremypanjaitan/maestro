/**
 * Computes the per-session pay for a package-based enrollment: the package
 * price split evenly across its sessions, rounded to the nearest Rupiah
 * (Int) since money is never fractional.
 *
 * Returns 0 when `packageSessions` is zero or negative (division by zero /
 * nonsensical input) — callers should treat that as "no rate configured"
 * rather than crashing.
 */
export function perSessionRate(packagePrice: number, packageSessions: number): number {
  if (packageSessions <= 0) return 0;
  return Math.round(packagePrice / packageSessions);
}
