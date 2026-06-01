import { useI18n } from './index'

export function LanguageSwitcher() {
  const { lang, setLanguage, languages } = useI18n()
  return (
    <div className="flex items-center border rounded overflow-hidden text-xs">
      {languages.map((code) => (
        <button
          key={code}
          onClick={() => setLanguage(code)}
          className={`px-2 py-1 uppercase ${lang === code ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-100'}`}
        >
          {code}
        </button>
      ))}
    </div>
  )
}
