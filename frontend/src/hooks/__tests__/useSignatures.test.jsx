import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { I18nProvider } from '../../i18n/index.jsx'
import { useSignatures } from '../useSignatures'

const wrapper = ({ children }) => <I18nProvider>{children}</I18nProvider>

const res = (ok, body, status = ok ? 200 : 400) =>
  Promise.resolve({ ok, status, json: () => Promise.resolve(body) })

const pngFile = () => new File(['x'], 'sig.png', { type: 'image/png' })

beforeEach(() => {
  globalThis.fetch = vi.fn(() => res(true, [])) // default: empty signature list
})

describe('useSignatures', () => {
  it('loads signatures on mount', async () => {
    globalThis.fetch = vi.fn(() => res(true, [{ id: 's1', filename: 's1.png', size: 1 }]))
    const { result } = renderHook(() => useSignatures(), { wrapper })
    await waitFor(() => expect(result.current.signatures).toHaveLength(1))
    expect(result.current.signatures[0].id).toBe('s1')
  })

  it('sets a localized error when the load fails', async () => {
    globalThis.fetch = vi.fn(() => res(false, {}, 500))
    const { result } = renderHook(() => useSignatures(), { wrapper })
    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(result.current.error).toMatch(/загрузить|load/i)
  })

  it('upload returns the new id on success', async () => {
    globalThis.fetch = vi.fn((url, opts) =>
      opts?.method === 'POST'
        ? res(true, { id: 'new', filename: 'new.png', size: 2 })
        : res(true, []),
    )
    const { result } = renderHook(() => useSignatures(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    let out
    await act(async () => {
      out = await result.current.upload(pngFile(), true)
    })
    expect(out.id).toBe('new')
  })

  it('upload throws (localized) on an API error', async () => {
    globalThis.fetch = vi.fn((url, opts) =>
      opts?.method === 'POST'
        ? res(false, { detail: { code: 'signature_not_detected', message: 'X' } }, 422)
        : res(true, []),
    )
    const { result } = renderHook(() => useSignatures(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    await expect(
      act(async () => {
        await result.current.upload(pngFile(), true)
      }),
    ).rejects.toThrow()
  })
})
