import { useI18n } from '../i18n/index.jsx'
import { TEXT_FAMILIES } from '../lib/fonts'

// Styling controls for a selected text layer: font family, size, bold, italic,
// color, alignment. `onLive` is updateLayerLive (no per-keystroke history);
// checkpoint() is called once at the start of each change for a clean undo.
export function TextProperties({ layer, onLive, checkpoint }) {
  const { t } = useI18n()
  const set = (patch) => {
    checkpoint()
    onLive(layer.id, patch)
  }

  return (
    <>
      <label className="flex items-center gap-2">
        <span className="w-12 text-gray-500">{t('text.font')}</span>
        <select
          value={layer.fontFamily}
          onChange={(e) => set({ fontFamily: e.target.value })}
          className="flex-1 border rounded px-1 py-0.5"
        >
          {TEXT_FAMILIES.map((f) => (
            <option key={f.key} value={f.key}>{t(f.labelKey)}</option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2">
        <span className="w-12 text-gray-500">{t('text.size')}</span>
        <input
          type="number" min={6} max={400} value={Math.round(layer.fontSize)}
          onFocus={checkpoint}
          onChange={(e) => onLive(layer.id, { fontSize: Math.max(6, Number(e.target.value) || 6) })}
          className="flex-1 border rounded px-1 py-0.5 w-0"
        />
      </label>

      <div className="flex items-center gap-1">
        <button
          onClick={() => set({ bold: !layer.bold })} title={t('text.bold')}
          className={`px-2 py-0.5 border rounded font-bold ${layer.bold ? 'bg-blue-50 border-blue-300 text-blue-700' : ''}`}
        >B</button>
        <button
          onClick={() => set({ italic: !layer.italic })} title={t('text.italic')}
          className={`px-2 py-0.5 border rounded italic ${layer.italic ? 'bg-blue-50 border-blue-300 text-blue-700' : ''}`}
        >I</button>
        <input
          type="color" value={layer.color} title={t('text.color')}
          onChange={(e) => set({ color: e.target.value })}
          className="ml-auto w-7 h-6 border rounded p-0 cursor-pointer"
        />
      </div>

      <div className="flex items-center gap-1" title={t('text.align')}>
        {['left', 'center', 'right'].map((a) => (
          <button
            key={a}
            onClick={() => set({ align: a })}
            className={`flex-1 px-1 py-0.5 border rounded ${layer.align === a ? 'bg-blue-50 border-blue-300 text-blue-700' : ''}`}
          >
            {a === 'left' ? 'L' : a === 'center' ? 'C' : 'R'}
          </button>
        ))}
      </div>
    </>
  )
}
