import axios, { AxiosError } from 'axios'
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import type { components } from '@/types/api'

type ValidationError = components['schemas']['ValidationError'] & {
  code?: string
  left?: number
  params?: Record<string, string | number>
}

/**
 * Error shape the rest of the app works with. `message` is the server's own text, if any.
 * Translated messages are chosen in src/i18n/errors.ts.
 */
export class ApiError extends Error {
  readonly status: number
  readonly field: string | null
  /** Machine-readable reason from the server, e.g. 'wrong' or 'locked'. Null when none is sent. */
  readonly code: string | null
  /** Tries left before a lockout, when the server sends it. */
  readonly left: number | null
  /** Values for the translated message, e.g. the lot size. */
  readonly params: Record<string, string | number> | null

  constructor(
    status: number,
    message: string,
    field: string | null = null,
    code: string | null = null,
    left: number | null = null,
    params: Record<string, string | number> | null = null,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.field = field
    this.code = code
    this.left = left
    this.params = params
  }
}

let authToken: string | null = null
let unauthorizedHandler: (() => void) | null = null

/** Set or clear the token sent in the Authorization header. Kept in memory only. */
export function setAuthToken(token: string | null): void {
  authToken = token
}

/** Called when the API returns 401, so the app can send the user to login. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler
}

const UNSAFE_METHODS = new Set(['post', 'put', 'patch', 'delete'])

function readCookie(name: string): string | null {
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null
}

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export const apiClient: AxiosInstance = axios.create({
  baseURL,
  timeout: 15000,
  headers: { Accept: 'application/json' },
  withCredentials: true,
})

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (authToken) {
    config.headers.set('Authorization', `Bearer ${authToken}`)
  }
  // Django session auth requires this header on unsafe requests.
  const method = (config.method ?? 'get').toLowerCase()
  if (UNSAFE_METHODS.has(method)) {
    const csrf = readCookie('csrftoken')
    if (csrf) config.headers.set('X-CSRFToken', csrf)
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (!(error instanceof AxiosError)) {
      return Promise.reject(new ApiError(0, ''))
    }

    const status = error.response?.status ?? 0

    if (status === 401 && unauthorizedHandler) {
      unauthorizedHandler()
    }

    const data = error.response?.data as Partial<ValidationError> | undefined
    const message = data?.detail ?? ''
    const field = data?.field ?? null
    const code = data?.code ?? null
    const left = typeof data?.left === 'number' ? data.left : null
    const params = data?.params ?? null

    return Promise.reject(new ApiError(status, message, field, code, left, params))
  },
)
