import { describe, expect, it } from 'vitest'
import { IDLE_LIMIT_MS, idleStatus } from '@/composables/useIdleLogout'

describe('idleStatus', () => {
  const start = 1_000_000

  it('is active until the warning window', () => {
    expect(idleStatus(start, start).state).toBe('active')
    expect(idleStatus(start, start + IDLE_LIMIT_MS - 61_000).state).toBe('active')
  })

  it('warns in the last minute, with the seconds left', () => {
    const status = idleStatus(start, start + IDLE_LIMIT_MS - 30_000)
    expect(status.state).toBe('warning')
    expect(status.secondsLeft).toBe(30)
  })

  it('expires at 30 minutes', () => {
    expect(idleStatus(start, start + IDLE_LIMIT_MS - 1).state).toBe('warning')
    expect(idleStatus(start, start + IDLE_LIMIT_MS)).toEqual({ state: 'expired', secondsLeft: 0 })
  })
})
