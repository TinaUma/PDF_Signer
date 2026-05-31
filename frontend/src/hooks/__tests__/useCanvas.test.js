import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCanvas } from '../useCanvas'

const SIG = { id: '00000000-0000-4000-8000-000000000000' }

describe('useCanvas', () => {
  it('addSignature clamps width/height to >= 20', () => {
    const { result } = renderHook(() => useCanvas())
    act(() => result.current.addSignature(SIG, 10, 10, 5, 3))
    const layer = result.current.layers[0]
    expect(layer.width).toBeGreaterThanOrEqual(20)
    expect(layer.height).toBeGreaterThanOrEqual(20)
    expect(layer.sigId).toBe(SIG.id)
  })

  it('updateLayer patches only the matching id', () => {
    const { result } = renderHook(() => useCanvas())
    act(() => result.current.addSignature(SIG, 0, 0, 40, 40))
    const id = result.current.layers[0].id
    act(() => result.current.updateLayer(id, { x: 123 }))
    expect(result.current.layers[0].x).toBe(123)
  })

  it('removeLayer(null) is a no-op; removeLayer(id) deletes', () => {
    const { result } = renderHook(() => useCanvas())
    act(() => result.current.addSignature(SIG, 0, 0, 40, 40))
    const id = result.current.layers[0].id
    act(() => result.current.removeLayer(null))
    expect(result.current.layers).toHaveLength(1)
    act(() => result.current.removeLayer(id))
    expect(result.current.layers).toHaveLength(0)
  })

  it('updateLayerLive does not add an undo step', () => {
    const { result } = renderHook(() => useCanvas())
    act(() => result.current.addSignature(SIG, 0, 0, 40, 40))  // 1 undo step
    const id = result.current.layers[0].id
    act(() => result.current.updateLayerLive(id, { x: 50 }))
    expect(result.current.layers[0].x).toBe(50)
    act(() => result.current.undo())  // removes the signature, not just the live x
    expect(result.current.layers).toHaveLength(0)
  })

  it('checkpoint + live edits = a single undo step back to the checkpoint', () => {
    const { result } = renderHook(() => useCanvas())
    act(() => result.current.addSignature(SIG, 0, 0, 40, 40))
    const id = result.current.layers[0].id
    act(() => result.current.checkpoint())
    act(() => result.current.updateLayerLive(id, { x: 99 }))
    act(() => result.current.updateLayerLive(id, { x: 123 }))
    expect(result.current.layers[0].x).toBe(123)
    act(() => result.current.undo())  // one undo reverts the whole edit session
    expect(result.current.layers[0].x).toBe(0)
    expect(result.current.layers).toHaveLength(1)
  })

  it('seeds from initialLayers', () => {
    const initial = [{ id: 'x', sigId: SIG.id, x: 1, y: 1, width: 30, height: 30, rotation: 0, opacity: 1 }]
    const { result } = renderHook(() => useCanvas(initial))
    expect(result.current.layers).toHaveLength(1)
  })
})
