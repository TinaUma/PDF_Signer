import { useState } from 'react'
import { useI18n } from '../i18n/index.jsx'

// Blocking screen shown when the local API sidecar could not be reached at
// startup (port resolution failed, or /health never came up). Without this the
// app would mount a UI whose every request silently fails. onRetry re-runs the
// boot sequence (resolve port → poll /health); it's awaited so the button shows
// a spinner instead of letting the user mash it.
export function BackendError({ onRetry }) {
  const { t } = useI18n()
  const [retrying, setRetrying] = useState(false)

  const handleRetry = async () => {
    setRetrying(true)
    try {
      await onRetry()
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100 p-6">
      <div className="max-w-md text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-lg font-semibold text-gray-800 mb-2">{t('backend.title')}</h1>
        <p className="text-sm text-gray-500 mb-6">{t('backend.message')}</p>
        <button
          onClick={handleRetry}
          disabled={retrying}
          className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {retrying ? t('backend.retrying') : t('backend.retry')}
        </button>
      </div>
    </div>
  )
}
