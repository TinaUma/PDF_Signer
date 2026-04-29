import { useRef, useState } from 'react'
import { useSignatures } from '../hooks/useSignatures'

export function SignatureLibrary({ onSelect }) {
  const { signatures, loading, error, upload, remove, imageUrl } = useSignatures()
  const [uploading, setUploading] = useState(false)
  const [removeBg, setRemoveBg] = useState(true)
  const [uploadError, setUploadError] = useState(null)
  const inputRef = useRef(null)

  const handleFile = async (file) => {
    if (!file) return
    setUploadError(null)
    setUploading(true)
    try {
      await upload(file, removeBg)
    } catch (e) {
      setUploadError(e.message)
    } finally {
      setUploading(false)
    }
  }

  const handleInput = (e) => handleFile(e.target.files?.[0])
  const handleDrop = (e) => { e.preventDefault(); handleFile(e.dataTransfer?.files?.[0]) }

  return (
    <div className="w-64 bg-white border-r flex flex-col h-full">
      <div className="px-3 py-2 border-b font-medium text-sm text-gray-700">Подписи</div>

      {/* Upload zone */}
      <div
        className="m-2 border-2 border-dashed border-gray-300 rounded p-3 text-center text-xs text-gray-400 cursor-pointer hover:border-blue-400 transition-colors"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? 'Обработка…' : 'Перетащи подпись\nили нажми'}
        <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.tiff,.tif,.webp"
          onChange={handleInput} className="hidden" />
      </div>

      <label className="flex items-center gap-2 px-3 pb-2 text-xs text-gray-500 cursor-pointer">
        <input type="checkbox" checked={removeBg} onChange={(e) => setRemoveBg(e.target.checked)} />
        Удалить фон (rembg)
      </label>

      {uploadError && <p className="text-red-500 text-xs px-3 pb-2">{uploadError}</p>}
      {error && <p className="text-red-500 text-xs px-3 pb-2">{error}</p>}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading && <p className="text-xs text-gray-400 px-3 py-2">Загрузка…</p>}
        {!loading && signatures.length === 0 && (
          <p className="text-xs text-gray-400 px-3 py-2">Нет сохранённых подписей</p>
        )}
        {signatures.map((sig) => (
          <div key={sig.id}
            className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 group cursor-pointer"
            onClick={() => onSelect?.(sig)}
          >
            <img src={imageUrl(sig.id)} alt="sig" className="w-16 h-10 object-contain bg-gray-100 rounded" />
            <span className="text-xs text-gray-500 flex-1 truncate">{sig.id.slice(0, 8)}…</span>
            <button
              onClick={(e) => { e.stopPropagation(); remove(sig.id) }}
              className="text-red-400 opacity-0 group-hover:opacity-100 text-xs px-1"
            >✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}
