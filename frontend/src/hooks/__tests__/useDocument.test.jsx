import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock pdf.js (and its worker URL import) before importing the hook.
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: 'worker.mjs' }))
vi.mock('pdfjs-dist', () => ({ GlobalWorkerOptions: {}, getDocument: vi.fn() }))

import * as pdfjsLib from 'pdfjs-dist'
import { I18nProvider } from '../../i18n/index.jsx'
import { MAX_FILE_SIZE } from '../../constants'
import { useDocument } from '../useDocument'

const wrapper = ({ children }) => <I18nProvider>{children}</I18nProvider>

const file = (name, type, size = 1000) => {
  const f = new File(['data'], name, { type })
  Object.defineProperty(f, 'size', { value: size })
  return f
}

beforeEach(() => {
  vi.restoreAllMocks()
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:doc')
  globalThis.URL.revokeObjectURL = vi.fn()
  // jsdom has no 2D context; the mocked page.render ignores it anyway.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({})
})

describe('useDocument', () => {
  it('rejects an oversize file', async () => {
    const { result } = renderHook(() => useDocument(), { wrapper })
    await act(async () => {
      await result.current.loadFile(file('big.pdf', 'application/pdf', MAX_FILE_SIZE + 1))
    })
    expect(result.current.error).toMatch(/слишком большой|too large/i)
    expect(result.current.pages).toHaveLength(0)
  })

  it('rejects an unsupported type', async () => {
    const { result } = renderHook(() => useDocument(), { wrapper })
    await act(async () => {
      await result.current.loadFile(file('notes.txt', 'text/plain'))
    })
    expect(result.current.error).toMatch(/Неподдерживаемый|Unsupported/i)
  })

  it('caps a PDF with too many pages (no render)', async () => {
    pdfjsLib.getDocument.mockReturnValue({ promise: Promise.resolve({ numPages: 600 }) })
    const { result } = renderHook(() => useDocument(), { wrapper })
    await act(async () => {
      await result.current.loadFile(file('huge.pdf', 'application/pdf'))
    })
    expect(result.current.error).toMatch(/слишком много|too many/i)
    expect(result.current.pages).toHaveLength(0)
  })

  it('renders a PDF: pages, real pageDims, loadId bump', async () => {
    const page = {
      getViewport: () => ({ width: 120, height: 160 }),
      render: () => ({ promise: Promise.resolve() }),
    }
    pdfjsLib.getDocument.mockReturnValue({
      promise: Promise.resolve({ numPages: 2, getPage: () => Promise.resolve(page) }),
    })
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,AA')

    const { result } = renderHook(() => useDocument(), { wrapper })
    await act(async () => {
      await result.current.loadFile(file('doc.pdf', 'application/pdf'))
    })
    expect(result.current.pages).toHaveLength(2)
    expect(result.current.pageDims).toEqual([
      { width: 120, height: 160 },
      { width: 120, height: 160 },
    ])
    expect(result.current.loadId).toBe(1)
  })

  it('bumps loadId on every load (even same name)', async () => {
    pdfjsLib.getDocument.mockReturnValue({ promise: Promise.resolve({ numPages: 1, getPage: () => Promise.resolve({ getViewport: () => ({ width: 10, height: 10 }), render: () => ({ promise: Promise.resolve() }) }) }) })
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,AA')
    const { result } = renderHook(() => useDocument(), { wrapper })
    await act(async () => { await result.current.loadFile(file('same.pdf', 'application/pdf')) })
    await act(async () => { await result.current.loadFile(file('same.pdf', 'application/pdf')) })
    expect(result.current.loadId).toBe(2)
  })

  it('image: falls back to A4 dims when the image fails to measure', async () => {
    class FakeImage {
      set src(_v) {
        queueMicrotask(() => this.onerror && this.onerror())
      }
    }
    vi.stubGlobal('Image', FakeImage)
    const { result } = renderHook(() => useDocument(), { wrapper })
    await act(async () => {
      await result.current.loadFile(file('p.png', 'image/png'))
    })
    expect(result.current.pages).toEqual(['blob:doc'])
    expect(result.current.pageDims).toEqual([{ width: 794, height: 1123 }])
  })
})
