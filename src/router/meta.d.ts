import type { Role } from '@/types'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    /** Sign-in pages: signed-in users are sent to their home page instead. */
    loginPage?: boolean
    /** Roles allowed to open the page. Omit for any signed-in user. */
    roles?: Role[]
  }
}
