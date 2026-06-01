import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { waitForBackend } from '../constants'

// Covers the startup readiness poll (H6). Port resolution / inTauri branches
// are exercised by the dedicated port-resolution suite.

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const ok = () => Promise.resolve({ ok: true })
const fail = () => Promise.reject(new Error('connection refused'))

describe('waitForBackend', () => {
  it('returns true once /health answers 200', async () => {
    globalThis.fetch = vi.fn(ok)
    await expect(waitForBackend(5000)).resolves.toBe(true)
    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/health'))
  })

  it('retries on connection failure, then succeeds when the sidecar comes up', async () => {
    // First two probes refuse the connection, the third succeeds — the backoff
    // loop must keep polling rather than give up on the first error.
    globalThis.fetch = vi.fn().mockImplementationOnce(fail).mockImplementationOnce(fail).mockImplementation(ok)
    const p = waitForBackend(5000)
    await vi.advanceTimersByTimeAsync(1000)
    await expect(p).resolves.toBe(true)
    expect(globalThis.fetch.mock.calls.length).toBeGreaterThanOrEqual(3)
  })

  it('returns false after the timeout when the backend never comes up', async () => {
    globalThis.fetch = vi.fn(fail)
    const p = waitForBackend(1000)
    await vi.advanceTimersByTimeAsync(2000)
    await expect(p).resolves.toBe(false)
  })
})
