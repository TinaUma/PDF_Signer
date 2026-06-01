import { useI18n } from '../i18n/index.jsx'
import { SignatureItem } from './SignatureItem'

const STEPS = [
  { n: 1, key: 'steps.open' },
  { n: 2, key: 'steps.upload' },
  { n: 3, key: 'steps.drag' },
  { n: 4, key: 'steps.save' },
]

// Left sidebar: the step guide, upload settings (bg removal), the upload button,
// a bulk-select bar, and the draggable signature list. Pure presentation — all
// state and handlers come from App via props.
export function SignatureLibrary({
  step,
  removeBg, onToggleRemoveBg,
  uploading, onUpload, sigInputRef, sigError,
  sigs,
  selectedSigs, onClearSelection, onDeleteSelected, onToggleSelect,
}) {
  const { t } = useI18n()

  return (
    <aside className="w-56 bg-white border-r flex flex-col text-xs">
      <div className="px-3 py-2 border-b font-semibold text-gray-700">{t('app.signaturesTitle')}</div>

      {/* Step guide */}
      <div className="px-3 pt-2 pb-1 border-b">
        {STEPS.map(({ n, key }) => (
          <div key={n} className={`flex items-center gap-2 py-0.5 ${step === n ? 'text-blue-600 font-medium' : step > n ? 'text-gray-300 line-through' : 'text-gray-400'}`}>
            <span className={`w-4 h-4 rounded-full text-center leading-4 flex-shrink-0 text-[10px] ${step === n ? 'bg-blue-600 text-white' : step > n ? 'bg-gray-200 text-gray-400' : 'border border-gray-300 text-gray-400'}`}>{n}</span>
            <span>{t(key)}</span>
          </div>
        ))}
      </div>

      {/* Upload settings */}
      <div className="px-3 pt-2 pb-1">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div
            onClick={onToggleRemoveBg}
            className={`w-8 h-4 rounded-full transition-colors flex-shrink-0 relative ${removeBg ? 'bg-blue-500' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${removeBg ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
          <span className={removeBg ? 'text-blue-600 font-medium' : 'text-gray-400'}>
            {t('app.removeBg')}
          </span>
        </label>
      </div>

      {/* Upload button */}
      <div className="px-3 pb-2">
        <button
          onClick={() => sigInputRef.current?.click()}
          disabled={uploading}
          className="w-full border-2 border-dashed border-gray-300 rounded p-2 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors disabled:opacity-50 text-center"
        >
          {uploading ? t('app.processing') : t('app.uploadSignature')}
        </button>
        <input ref={sigInputRef} type="file" accept=".jpg,.jpeg,.png,.tiff,.tif,.webp" onChange={onUpload} className="hidden" />
        {sigError && <p className="text-red-500 mt-1">{sigError}</p>}
      </div>

      {/* Bulk-select bar — shown when one or more signatures are checked */}
      {selectedSigs.size > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-t bg-blue-50 text-blue-700">
          <span className="flex-1">{t('app.selectedCount', { n: selectedSigs.size })}</span>
          <button onClick={onClearSelection} className="px-1 hover:underline">
            {t('app.clearSelection')}
          </button>
          <button onClick={onDeleteSelected} className="px-2 py-0.5 rounded border border-red-200 text-red-500 hover:bg-red-100">
            {t('app.deleteSelected')}
          </button>
        </div>
      )}

      {/* Signatures list */}
      <div className="flex-1 overflow-y-auto border-t">
        {sigs.error && (
          <p className="px-3 py-2 text-red-500">{sigs.error}</p>
        )}
        {sigs.signatures.map((sig) => (
          <SignatureItem
            key={sig.id}
            sig={sig}
            imageUrl={sigs.imageUrl}
            onRename={sigs.rename}
            onRemove={sigs.remove}
            selected={selectedSigs.has(sig.id)}
            onToggleSelect={onToggleSelect}
          />
        ))}
        {!sigs.loading && sigs.signatures.length === 0 && (
          <p className="px-3 py-2 text-gray-400 italic">{t('app.noSignatures')}</p>
        )}
      </div>
    </aside>
  )
}
