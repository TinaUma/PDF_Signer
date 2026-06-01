import { describe, it, expect, vi, afterEach } from 'vitest'

// constants.js imports `invoke` from the Tauri core at module load; mock it so
// we can drive the three port-resolution branches without a real runtime.
const { mockInvoke } = vi.hoisted(() => ({ mockInvoke: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: mockInvoke }))

// apiBase is module-level state mutated by resolveApiBase(); re-import fresh per
// test so one case can't leak its resolved base into the next.
async function freshConstants() {
  vi.resetModules()
  return import('../constants')
}

afterEach(() => {
  delete window.__TAURI_INTERNALS__
  mockInvoke.mockReset()
})

describe('resolveApiBase / getApiBase', () => {
  it('builds an absolute 127.0.0.1 base from the resolved port inside Tauri', async () => {
    window.__TAURI_INTERNALS__ = {}
    mockInvoke.mockResolvedValue(54321)
    const { resolveApiBase, getApiBase } = await freshConstants()

    const base = await resolveApiBase()
    expect(mockInvoke).toHaveBeenCalledWith('api_port')
    expect(base).toBe('http://127.0.0.1:54321')
    expect(getApiBase()).toBe('http://127.0.0.1:54321')
  })

  it('falls back to the relative base WITHOUT throwing when invoke fails', async () => {
    window.__TAURI_INTERNALS__ = {}
    mockInvoke.mockRejectedValue(new Error('command not found'))
    const { resolveApiBase, getApiBase } = await freshConstants()

    await expect(resolveApiBase()).resolves.toBe('')
    expect(getApiBase()).toBe('')
  })

  it('stays relative and never calls invoke outside Tauri', async () => {
    // No __TAURI_INTERNALS__ on window → inTauri() is false.
    const { resolveApiBase, getApiBase, inTauri } = await freshConstants()

    expect(inTauri()).toBe(false)
    await expect(resolveApiBase()).resolves.toBe('')
    expect(mockInvoke).not.toHaveBeenCalled()
    expect(getApiBase()).toBe('')
  })
})
