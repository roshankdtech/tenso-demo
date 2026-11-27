import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { listMailOutbox } from '@/api/mail'
import type { MailMessage } from '@/api/mail'
import { useAuthStore } from '@/stores/auth'

const STORAGE_PREFIX = 'tenso.mail.seen.'

/** The newest message id each person has seen, shared by every mailbox view in the app. */
const seenById = reactive<Record<string, number>>({})

function loadSeen(userId: string): void {
  if (userId in seenById) return
  let value = 0
  try {
    value = Number(window.localStorage.getItem(STORAGE_PREFIX + userId)) || 0
  } catch {
    // Storage unavailable: nothing is remembered between visits.
  }
  seenById[userId] = value
}

function saveSeen(userId: string, id: number): void {
  seenById[userId] = id
  try {
    window.localStorage.setItem(STORAGE_PREFIX + userId, String(id))
  } catch {
    // Storage unavailable: the count still works for this visit.
  }
}

/**
 * The signed-in person's mailbox, refreshed every `intervalMs`.
 * `unread` counts messages newer than the last ones they marked as seen.
 */
export function useMailbox(intervalMs = 5000) {
  const auth = useAuthStore()
  const userId = auth.user?.id ?? ''
  loadSeen(userId)

  const messages = ref<MailMessage[]>([])
  const error = ref('')
  const seenId = computed(() => seenById[userId] ?? 0)
  const unread = computed(() => messages.value.filter((m) => m.id > seenId.value).length)

  async function refresh(): Promise<void> {
    try {
      messages.value = await listMailOutbox()
      error.value = ''
    } catch {
      error.value = 'refresh-failed'
    }
  }

  /** Marks everything received so far as seen. */
  function markAllRead(): void {
    const newest = messages.value.reduce((max, m) => Math.max(max, m.id), 0)
    if (newest > seenId.value) saveSeen(userId, newest)
  }

  let timer: ReturnType<typeof setInterval> | undefined
  onMounted(() => {
    void refresh()
    timer = setInterval(() => void refresh(), intervalMs)
  })
  onBeforeUnmount(() => {
    if (timer !== undefined) clearInterval(timer)
  })

  return { messages, unread, seenId, error, refresh, markAllRead }
}
