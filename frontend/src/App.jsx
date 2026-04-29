import { useState, useRef, useCallback } from 'react'
import './index.css'
import { useDocument } from './hooks/useDocument'
import { useSignatures } from './hooks/useSignatures'
import { CanvasEditor } from './components/CanvasEditor'

const ALLOWED = '.pdf,.jpg,.jpeg,.png,.tiff,.tif,.webp'

export default function App() {
  const doc = useDocument()
  const sigs = useSignatures()
  const [mode, setMode] = useState('view')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState(null)
  const canvasLayersRef = useRef([])   // current page layers from CanvasEditor
  const sourceFileRef = useRef(null)   // original File object

  const handleFileInput = (e) => {
    const f = e.target.files?.[0]
    if (f) { sourceFileRef.current = f; doc.loadFile(f); setMode('view') }
  }
  const handleDrop = (e) => {
    e.preventDefault()
    const f = e.dataTransfer?.files?.[0]
    if (f) { sourceFileRef.current = f; doc.loadFile(f); setMode('view') }
  }

  const handleSigUpload = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    try { await sigs.upload(f, true) } catch (err) { alert(err.message) }
  }

  const handleLayersChange = useCallback((layers) => {
    canvasLayersRef.current = layers
  }, [])

  const handleExport = async () => {
    if (!sourceFileRef.current) return
    setExporting(true)
    setExportError(null)
    try {
      const layers = canvasLayersRef.current
      const pagesPayload = layers.length > 0
        ? [{ page_idx: doc.currentPage, signatures: layers.map((l) => ({
            id: l.sigId, x: l.x, y: l.y, w: l.width, h: l.height,
            angle: l.rotation, opacity: l.opacity,
          })) }]
        : [{ page_idx: doc.currentPage, signatures: [] }]

      const form = new FormData()
      form.append('file', sourceFileRef.current)
      form.append('pages', JSON.stringify(pagesPayload))

      const res = await fetch('/api/export', { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Export failed')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'signed.' + (sourceFileRef.current.name.endsWith('.pdf') ? 'pdf' : 'jpg')
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setExportError(e.message)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>

      {/* Left: Signature Library */}
      <aside className="w-56 bg-white border-r flex flex-col text-xs">
        <div className="px-3 py-2 border-b font-semibold text-gray-700">Подписи</div>
        <label className="m-2 flex items-center justify-center border-2 border-dashed border-gray-300 rounded p-2 text-gray-400 cursor-pointer hover:border-blue-400 text-center">
          + Загрузить подпись
          <input type="file" accept=".jpg,.jpeg,.png,.tiff,.tif,.webp" onChange={handleSigUpload} className="hidden" />
        </label>
        {sigs.loading && <p className="px-3 py-1 text-gray-400">Загрузка…</p>}
        <div className="flex-1 overflow-y-auto">
          {sigs.signatures.map((sig) => (
            <div key={sig.id}
              draggable
              onDragStart={(e) => e.dataTransfer.setData('application/signature', JSON.stringify(sig))}
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-blue-50 cursor-grab group"
            >
              <img src={sigs.imageUrl(sig.id)} alt="" className="w-14 h-8 object-contain bg-gray-100 rounded" />
              <span className="flex-1 text-gray-400 truncate">{sig.id.slice(0, 6)}…</span>
              <button onClick={() => sigs.remove(sig.id)} className="text-red-400 opacity-0 group-hover:opacity-100 px-1">✕</button>
            </div>
          ))}
          {!sigs.loading && sigs.signatures.length === 0 && (
            <p className="px-3 py-2 text-gray-400">Нет подписей</p>
          )}
        </div>
      </aside>

      {/* Center */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Toolbar */}
        <header className="flex items-center gap-2 px-4 py-2 bg-white border-b shadow-sm text-sm flex-shrink-0">
          <label className="cursor-pointer bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 text-sm">
            Открыть документ
            <input type="file" accept={ALLOWED} onChange={handleFileInput} className="hidden" />
          </label>

          {doc.totalPages > 0 && (
            <>
              <span className="text-gray-400 text-xs ml-1">{doc.fileName}</span>
              <div className="flex items-center gap-1 ml-auto">
                <button onClick={() => doc.goTo(doc.currentPage - 1)} disabled={doc.currentPage === 0}
                  className="px-2 py-1 border rounded disabled:opacity-40 hover:bg-gray-100">‹</button>
                <span className="text-xs px-2">{doc.currentPage + 1} / {doc.totalPages}</span>
                <button onClick={() => doc.goTo(doc.currentPage + 1)} disabled={doc.currentPage === doc.totalPages - 1}
                  className="px-2 py-1 border rounded disabled:opacity-40 hover:bg-gray-100">›</button>
              </div>
              <div className="flex gap-2 ml-4">
                <button onClick={() => setMode(mode === 'sign' ? 'view' : 'sign')}
                  className={`px-3 py-1 rounded text-sm ${mode === 'sign' ? 'bg-green-600 text-white' : 'border hover:bg-gray-100'}`}>
                  {mode === 'sign' ? '✎ Режим подписи' : 'Подписать'}
                </button>
                {mode === 'sign' && (
                  <button onClick={handleExport} disabled={exporting}
                    className="px-3 py-1 rounded text-sm bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50">
                    {exporting ? 'Экспорт…' : '💾 Вплавить и сохранить'}
                  </button>
                )}
              </div>
            </>
          )}
        </header>

        {exportError && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-red-600 text-sm">{exportError}</div>
        )}

        {/* Main area */}
        <main className="flex-1 overflow-auto flex items-start justify-center p-6 bg-gray-100">
          {doc.loading && <p className="text-gray-400 mt-20">Загрузка документа…</p>}
          {doc.error && <p className="text-red-500 mt-20 max-w-md text-center">{doc.error}</p>}

          {!doc.loading && doc.totalPages === 0 && !doc.error && (
            <div className="text-center mt-20 text-gray-400">
              <p className="text-xl mb-2">Перетащите документ сюда</p>
              <p className="text-sm">PDF, JPG, PNG, TIFF, WEBP · до 50 МБ</p>
            </div>
          )}

          {!doc.loading && doc.pages[doc.currentPage] && mode === 'view' && (
            <img src={doc.pages[doc.currentPage]} alt="page"
              className="shadow-lg bg-white max-w-full"
              style={{ width: `${doc.scale * 100}%`, height: 'auto' }} />
          )}

          {!doc.loading && doc.pages[doc.currentPage] && mode === 'sign' && (
            <CanvasEditor
              pageDataUrl={doc.pages[doc.currentPage]}
              pageWidth={794}
              pageHeight={1123}
              imageUrl={sigs.imageUrl}
              onLayersChange={handleLayersChange}
            />
          )}
        </main>
      </div>
    </div>
  )
}
