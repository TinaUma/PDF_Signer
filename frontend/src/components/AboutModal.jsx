import { useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useI18n } from '../i18n/index.jsx'
import { APP_VERSION, GITHUB_URL, inTauri } from '../constants'

// Open the repository URL in the user's real browser. The webview CSP is
// default-src 'self', so a normal link can't navigate out — in the native app
// we hand off to the Rust `open_external` command; in the browser/Docker build
// a regular window.open works.
function openGithub() {
  if (inTauri()) {
    invoke('open_external', { url: GITHUB_URL }).catch(() => {})
  } else {
    window.open(GITHUB_URL, '_blank', 'noopener,noreferrer')
  }
}

const STEP_KEYS = ['steps.open', 'steps.upload', 'steps.drag', 'steps.save']

export function AboutModal({ onClose }) {
  const { t } = useI18n()

  // Close on Escape — matches the click-outside affordance.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h2 className="font-semibold text-gray-800">{t('about.title')}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none px-1"
            aria-label={t('about.close')}
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 text-sm text-gray-700 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <img src="/favicon.svg" alt="" className="w-12 h-12 rounded" />
            <div>
              <div className="font-semibold text-gray-900">{t('app.title')}</div>
              <div className="text-gray-500">{t('about.version')} {APP_VERSION}</div>
            </div>
          </div>

          <p className="text-gray-600">{t('about.description')}</p>

          <div>
            <div className="font-medium text-gray-700 mb-1">{t('about.howto')}</div>
            <ol className="list-decimal list-inside text-gray-600 space-y-0.5">
              {STEP_KEYS.map((k) => <li key={k}>{t(k)}</li>)}
            </ol>
          </div>

          <button
            onClick={openGithub}
            className="self-start text-blue-600 hover:text-blue-700 hover:underline break-all"
          >
            {t('about.github')} ↗
          </button>

          <p className="text-xs text-gray-400 border-t pt-3">{t('about.credits')}</p>
        </div>
      </div>
    </div>
  )
}
