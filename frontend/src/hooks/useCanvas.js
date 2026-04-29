import { useCallback } from 'react'
import { useHistory } from './useHistory'

export function useCanvas() {
  const { state: layers, push, undo, redo, canUndo, canRedo } = useHistory([])

  const addSignature = useCallback((sig, x = 100, y = 100) => {
    push([...layers, {
      id: `${sig.id}-${Date.now()}`,
      sigId: sig.id,
      x, y,
      width: 200,
      height: 100,
      rotation: 0,
      opacity: 1,
    }])
  }, [layers, push])

  const updateLayer = useCallback((id, props) => {
    push(layers.map((l) => l.id === id ? { ...l, ...props } : l))
  }, [layers, push])

  const removeLayer = useCallback((id) => {
    if (!id) return  // graceful: no selection
    push(layers.filter((l) => l.id !== id))
  }, [layers, push])

  const copyToAllPages = useCallback((totalPages) => {
    return Array.from({ length: totalPages }, () => [...layers])
  }, [layers])

  return { layers, addSignature, updateLayer, removeLayer, copyToAllPages, undo, redo, canUndo, canRedo }
}
