import { describe, it, expect } from 'vitest'
import { toMinutes, rangesOverlap } from './time'

describe('toMinutes', () => {
  it('parses HH:mm', () => { expect(toMinutes('09:30')).toBe(570) })
})

describe('rangesOverlap', () => {
  it('detects overlap', () => { expect(rangesOverlap('09:00',60,'09:30',60)).toBe(true) })
  it('adjacent not overlap', () => { expect(rangesOverlap('09:00',60,'10:00',60)).toBe(false) })
  it('disjoint', () => { expect(rangesOverlap('09:00',60,'11:00',30)).toBe(false) })
})
