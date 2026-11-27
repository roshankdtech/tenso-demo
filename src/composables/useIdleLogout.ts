import { onBeforeUnmount, onMounted, ref } from 'vue'

/** Signed-in users are logged out after this long without activity. */
export const IDLE_LIMIT_MS = 30 * 60 * 1000

/** A warning is shown this long before the logout. */
export const WARNING_MS = 60 * 1000

/** How often the idle check runs. Keeps the countdown and the logout on time. */
const CHECK_EVERY_MS = 1000

/** Events that count as activity. */
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart', 'mousemove'] as const

export type IdleState = {
  state: 'active' | 'warning' | 'expired'
  /** Seconds until the logout, rounded up. */
  secondsLeft: number
}

/** Where the user stands in the 30-minute window at time `now`. */
export function idleStatus(
  lastActivity: number,
  now: number,
  limitMs: number = IDLE_LIMIT_MS,
  warningMs: number = WARNING_MS,
): IdleState {
  const remaining = limitMs - (now - lastActivity)
  if (remaining <= 0) return { state: 'expired', secondsLeft: 0 }
  const secondsLeft = Math.ceil(remaining / 1000)
  return { state: remaining <= warningMs ? 'warning' : 'active', secondsLeft }
}

/**
 * Tracks activity and calls `onIdle` once the user has been inactive for IDLE_LIMIT_MS.
 * In the last WARNING_MS, `warning` is true and `secondsLeft` counts down.
 * `stayActive` restarts the timer (the warning's button uses it).
 * Must be used inside a component; the timer stops when it unmounts.
 */
export function useIdleLogout(onIdle: () => void) {
  let lastActivity = Date.now()
  let timer: ReturnType<typeof setInterval> | undefined
  let expired = false

  const warning = ref(false)
  const secondsLeft = ref(IDLE_LIMIT_MS / 1000)

  const stayActive = (): void => {
    lastActivity = Date.now()
    warning.value = false
  }

  const onActivity = (): void => {
    lastActivity = Date.now()
    warning.value = false
  }

  const tick = (): void => {
    const status = idleStatus(lastActivity, Date.now())
    secondsLeft.value = status.secondsLeft
    warning.value = status.state === 'warning'
    if (status.state === 'expired' && !expired) {
      expired = true
      onIdle()
    }
  }

  onMounted(() => {
    for (const name of ACTIVITY_EVENTS) window.addEventListener(name, onActivity, { passive: true })
    timer = setInterval(tick, CHECK_EVERY_MS)
  })

  onBeforeUnmount(() => {
    for (const name of ACTIVITY_EVENTS) window.removeEventListener(name, onActivity)
    if (timer !== undefined) clearInterval(timer)
  })

  return { warning, secondsLeft, stayActive }
}
