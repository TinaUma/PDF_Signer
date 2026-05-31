import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useHistory } from '../useHistory'

describe('useHistory', () => {
  it('seeds present from initial and has no undo/redo', () => {
    const { result } = renderHook(() => useHistory([1]))
    expect(result.current.state).toEqual([1])
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
  })

  it('push/undo/redo moves through states', () => {
    const { result } = renderHook(() => useHistory(['a']))
    act(() => result.current.push(['b']))
    expect(result.current.state).toEqual(['b'])
    expect(result.current.canUndo).toBe(true)
    act(() => result.current.undo())
    expect(result.current.state).toEqual(['a'])
    act(() => result.current.redo())
    expect(result.current.state).toEqual(['b'])
  })

  it('push clears the redo future', () => {
    const { result } = renderHook(() => useHistory(['a']))
    act(() => result.current.push(['b']))
    act(() => result.current.undo())
    act(() => result.current.push(['c']))
    expect(result.current.canRedo).toBe(false)
    expect(result.current.state).toEqual(['c'])
  })

  it('caps history at 20 undo steps', () => {
    const { result } = renderHook(() => useHistory([0]))
    for (let i = 1; i <= 25; i++) act(() => result.current.push([i]))
    let undos = 0
    while (result.current.canUndo) {
      act(() => result.current.undo())
      undos++
    }
    expect(undos).toBe(20)
  })

  it('undo/redo on empty history are no-ops', () => {
    const { result } = renderHook(() => useHistory(['x']))
    act(() => result.current.undo())
    act(() => result.current.redo())
    expect(result.current.state).toEqual(['x'])
  })
})
