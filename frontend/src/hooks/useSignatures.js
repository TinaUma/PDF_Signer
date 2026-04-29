import { useState, useCallback, useEffect } from 'react'

const API = '/api/signatures'

export function useSignatures() {
  const [signatures, setSignatures] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetch_ = useCallback(async () => {
    const res = await fetch(API)
    if (!res.ok) throw new Error('Failed to load signatures')
    return res.json()
  }, [])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setSignatures(await fetch_())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [fetch_])

  useEffect(() => { load() }, [load])

  const upload = useCallback(async (file, removeBg = true) => {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${API}?remove_bg=${removeBg}`, { method: 'POST', body: form })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.detail || 'Upload failed')
    }
    await load()
    return res.json()
  }, [load])

  const remove_ = useCallback(async (id) => {
    await fetch(`${API}/${id}`, { method: 'DELETE' })
    await load()
  }, [load])

  const imageUrl = (id) => `${API}/${id}/image`

  return { signatures, loading, error, upload, remove: remove_, imageUrl, reload: load }
}
