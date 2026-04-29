import { useState, useCallback } from 'react'

const MAX_HISTORY = 20

export function useHistory(initial = []) {
  const [past, setPast] = useState([])
  const [present, setPresent] = useState(initial)
  const [future, setFuture] = useState([])

  const push = useCallback((newState) => {
    setPast((p) => [...p.slice(-(MAX_HISTORY - 1)), present])
    setPresent(newState)
    setFuture([])
  }, [present])

  const undo = useCallback(() => {
    if (past.length === 0) return
    const prev = past[past.length - 1]
    setPast((p) => p.slice(0, -1))
    setFuture((f) => [present, ...f])
    setPresent(prev)
  }, [past, present])

  const redo = useCallback(() => {
    if (future.length === 0) return
    const next = future[0]
    setFuture((f) => f.slice(1))
    setPast((p) => [...p, present])
    setPresent(next)
  }, [future, present])

  return { state: present, push, undo, redo, canUndo: past.length > 0, canRedo: future.length > 0 }
}
