import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api'
import { describeError } from './errors'

// Returns the key itself, so each test shows which message was chosen.
const t = (key: string) => key

describe('describeError', () => {
  it('uses the network message when the server cannot be reached', () => {
    expect(describeError(new ApiError(0, ''), t, 'fallback')).toBe('errors.network')
  })

  it('uses the session message on 401 and the permission message on 403', () => {
    expect(describeError(new ApiError(401, ''), t, 'fallback')).toBe('errors.session')
    expect(describeError(new ApiError(403, ''), t, 'fallback')).toBe('errors.forbidden')
  })

  it('shows the server text for validation errors', () => {
    expect(describeError(new ApiError(422, 'Too small'), t, 'fallback')).toBe('Too small')
  })

  it('falls back to a generic validation message when the server sends no text', () => {
    expect(describeError(new ApiError(422, ''), t, 'fallback')).toBe('errors.invalid')
  })

  it('uses the server-error message for 5xx responses', () => {
    expect(describeError(new ApiError(503, ''), t, 'fallback')).toBe('errors.server')
  })

  it('uses the given fallback for other API errors and for non-API errors', () => {
    expect(describeError(new ApiError(400, ''), t, 'my.fallback')).toBe('my.fallback')
    expect(describeError(new Error('boom'), t, 'my.fallback')).toBe('my.fallback')
  })
})
