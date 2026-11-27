import { ref } from 'vue'

const message = ref('')
const visible = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

/** A short message shown at the bottom of the screen. One message at a time. */
export function useToast() {
  function show(text: string): void {
    message.value = text
    visible.value = true
    clearTimeout(timer)
    timer = setTimeout(() => {
      visible.value = false
    }, 3400)
  }
  return { message, visible, show }
}
