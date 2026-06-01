import { useState, useRef, useEffect } from 'react'
import { useI18n } from '../i18n/index.jsx'

// Transparent-checker backdrop so a signature's transparency is visible in the
// thumbnail. Kept here (not in App) so the row is self-contained.
const CHECKER = {
  backgroundImage: `linear-gradient(45deg,#ccc 25%,transparent 25%),
    linear-gradient(-45deg,#ccc 25%,transparent 25%),
    linear-gradient(45deg,transparent 75%,#ccc 75%),
    linear-gradient(-45deg,transparent 75%,#ccc 75%)`,
  backgroundSize: '8px 8px',
  backgroundPosition: '0 0,0 4px,4px -4px,-4px 0',
}

// One row in the signature library: a multi-select checkbox, thumbnail, an
// inline-editable name, rename and delete buttons. Draggable onto the document —
// except while the name is being edited (an editable input must not start a drag).
export function SignatureItem({ sig, imageUrl, onRename, onRemove, selected, onToggleSelect }) {
  const { t } = useI18n()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const inputRef = useRef(null)

  const displayName = sig.name || `${sig.id.slice(0, 6)}…`

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const committedRef = useRef(false)

  const startEdit = () => {
    committedRef.current = false
    setValue(sig.name || '')
    setEditing(true)
  }

  // Idempotent: Enter then a blur (or any double trigger) must rename only once.
  const commit = () => {
    if (committedRef.current) return
    committedRef.current = true
    setEditing(false)
    const next = value.trim()
    if (next && next !== sig.name) onRename(sig.id, next)
  }

  return (
    <div
      draggable={!editing}
      onDragStart={(e) => e.dataTransfer.setData('application/signature', JSON.stringify(sig))}
      title={editing ? '' : t('app.dragToDoc')}
      className={`flex items-center gap-2 px-2 py-1.5 cursor-grab group ${selected ? 'bg-blue-50' : 'hover:bg-blue-50'}`}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggleSelect(sig.id)}
        onClick={(e) => e.stopPropagation()}
        aria-label={t('app.select')}
        className={`flex-shrink-0 ${selected ? '' : 'opacity-40 group-hover:opacity-100'}`}
      />

      <div style={CHECKER} className="w-14 h-8 rounded flex-shrink-0 flex items-center justify-center">
        <img src={imageUrl(sig.id)} alt="" className="w-14 h-8 object-contain" />
      </div>

      {editing ? (
        <input
          ref={inputRef}
          value={value}
          maxLength={80}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') setEditing(false)
          }}
          className="flex-1 min-w-0 border rounded px-1 py-0.5 text-gray-700"
        />
      ) : (
        <span
          onDoubleClick={startEdit}
          title={t('app.renameHint')}
          className="flex-1 text-gray-600 truncate cursor-text"
        >
          {displayName}
        </span>
      )}

      {!editing && (
        <button
          onClick={startEdit}
          title={t('app.rename')}
          aria-label={t('app.rename')}
          className="text-gray-400 opacity-0 group-hover:opacity-100 px-1 hover:text-blue-500"
        >
          ✎
        </button>
      )}
      <button
        onClick={() => onRemove(sig.id)}
        title={t('props.delete')}
        aria-label={t('props.delete')}
        className="text-red-400 opacity-0 group-hover:opacity-100 px-1"
      >
        ✕
      </button>
    </div>
  )
}
