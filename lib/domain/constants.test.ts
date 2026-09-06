import { describe, expect, it } from 'vitest'

import { NON_HONOR_STATUSES } from './constants'

describe('NON_HONOR_STATUSES', () => {
  it('covers exactly the statuses that carry no honor', () => {
    expect([...NON_HONOR_STATUSES].sort()).toEqual(['CANCEL', 'RESCHEDULE'])
  })

  it('does not exclude attended sessions', () => {
    expect(NON_HONOR_STATUSES).not.toContain('HADIR')
  })
})
