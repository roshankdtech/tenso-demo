import { AxiosError } from 'axios'
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { createMockResponse, handleMockRequest } from './handler'

/** Cookies set by the mock (the session), kept for this page only. */
const cookies: Record<string, string> = {}

function queryOf(params: unknown): string {
  if (!params || typeof params !== 'object') return ''
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    if (value !== undefined && value !== null) search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

function rememberCookie(setCookie: string): void {
  const [pair, ...attributes] = setCookie.split(';')
  const index = pair.indexOf('=')
  const name = pair.slice(0, index).trim()
  const value = pair.slice(index + 1)
  if (attributes.some((a) => a.trim() === 'Max-Age=0')) delete cookies[name]
  else cookies[name] = value
}

/** Answers axios requests from the in-browser mock, in place of the network (demo build only). */
export const mockAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
  const fullPath = `${config.url ?? ''}`.replace(/^\/api/, '')
  const out = createMockResponse()
  await handleMockRequest(
    {
      method: (config.method ?? 'get').toUpperCase(),
      url: `${fullPath}${queryOf(config.params)}`,
      cookie: Object.entries(cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join('; '),
      bodyText:
        typeof config.data === 'string'
          ? config.data
          : config.data
            ? JSON.stringify(config.data)
            : '',
    },
    out,
  )
  const result = out.result()
  const setCookie = result.headers['Set-Cookie']
  if (setCookie) rememberCookie(setCookie)

  const response: AxiosResponse = {
    data: result.body ? JSON.parse(result.body) : '',
    status: result.status,
    statusText: String(result.status),
    headers: {},
    config,
    request: {},
  }
  if (result.status >= 400) {
    throw new AxiosError(
      `Request failed with status ${result.status}`,
      String(result.status),
      config,
      null,
      response,
    )
  }
  return response
}
