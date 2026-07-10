export function toMinutes(hhmm: string): number {
  const [hours, minutes] = hhmm.split(':').map(Number)
  return hours * 60 + minutes
}

export function rangesOverlap(
  startA: string,
  durA: number,
  startB: string,
  durB: number
): boolean {
  const startAMin = toMinutes(startA)
  const endAMin = startAMin + durA
  const startBMin = toMinutes(startB)
  const endBMin = startBMin + durB

  return startAMin < endBMin && startBMin < endAMin
}
