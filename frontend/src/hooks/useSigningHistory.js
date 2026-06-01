import { useState, useCallback, useEffect } from 'react'
import { useI18n } from '../i18n/index.jsx'
import { getApiBase } from '../constants'

// Signing history: each export persists the original + result + layout server
// side (history_service). This hook lists entries, fetches one full entry (with
// its `pages` layout for re-editing), and deletes one or many.
const api = () => `${getApiBase()}/api/history`

export function useSigningHistory() {
  const { t } = useI18n()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(api())
      if (!res.ok) throw new Error(t('error.history_load_failed'))
      setEntries(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [t])

  // Fetch one full entry, including the `pages` layout used to restore signatures.
  const getEntry = useCallback(async (id) => {
    const res = await fetch(`${api()}/${id}`)
    if (!res.ok) throw new Error(t('error.history_load_failed'))
    return res.json()
  }, [t])

  const remove = useCallback(async (id) => {
    await fetch(`${api()}/${id}`, { method: 'DELETE' })
    await load()
  }, [load])

  // Multi-delete: fire the deletes, then reload once. Failures are ignored per
  // entry (a concurrently-removed entry 404s); the reload reflects reality.
  const removeMany = useCallback(async (ids) => {
    await Promise.all(
      ids.map((id) => fetch(`${api()}/${id}`, { method: 'DELETE' }).catch(() => {})),
    )
    await load()
  }, [load])

  // Auto-load once on mount so the header badge/count is correct.
  useEffect(() => { load() }, [load])

  return { entries, loading, error, reload: load, getEntry, remove, removeMany }
}
