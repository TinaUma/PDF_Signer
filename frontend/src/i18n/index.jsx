import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'
import { ru } from './locales/ru'
import { en } from './locales/en'

const CATALOGS = { ru, en }
const STORAGE_KEY = 'pdfsigner.lang'
const DEFAULT_LANG = 'ru'  // product is Russian-first

function detectInitialLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && CATALOGS[saved]) return saved
  } catch {
    /* localStorage unavailable */
  }
  const nav = (typeof navigator !== 'undefined' && navigator.language || '').slice(0, 2)
  return CATALOGS[nav] ? nav : DEFAULT_LANG
}

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(detectInitialLang)

  const setLanguage = useCallback((next) => {
    if (!CATALOGS[next]) return  // ignore unknown languages
    setLang(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* localStorage unavailable */
    }
  }, [])

  // t(key, vars): looks up the current language, falls back to en, then the key
  // itself. {placeholders} in the template are replaced from vars.
  const t = useCallback((key, vars) => {
    const tpl = CATALOGS[lang]?.[key] ?? CATALOGS.en[key] ?? key
    if (!vars) return tpl
    return tpl.replace(/\{(\w+)\}/g, (_, name) => (name in vars ? vars[name] : `{${name}}`))
  }, [lang])

  // Reflect the active language on the document (a11y/SEO) and localize the title.
  useEffect(() => {
    document.documentElement.lang = lang
    document.title = CATALOGS[lang]?.['app.title'] ?? 'PDF Signer'
  }, [lang])

  const value = useMemo(
    () => ({ lang, setLanguage, t, languages: Object.keys(CATALOGS) }),
    [lang, setLanguage, t],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within an I18nProvider')
  return ctx
}

// Turn an API error `detail` into a user-facing string. ApiError sends
// {code, message}; map the code to a localized `error.<code>` string, falling
// back to the English message, then the generic error. Plain-string details and
// FastAPI validation lists are handled too.
export function resolveApiError(detail, t) {
  if (detail && typeof detail === 'object' && !Array.isArray(detail) && detail.code) {
    const key = `error.${detail.code}`
    const localized = t(key)
    if (localized !== key) return localized
    return detail.message || t('error.generic')
  }
  if (typeof detail === 'string') return detail
  return t('error.generic')
}
