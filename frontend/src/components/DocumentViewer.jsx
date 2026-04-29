import { useRef, useEffect, useCallback } from 'react'
import { useDocument } from '../hooks/useDocument'

export function DocumentViewer() {
  const { pages, currentPage, scale, loading, error, fileName, totalPages,
          setScale, goTo, loadFile } = useDocument()

  const containerRef = useRef(null)

  // Mouse wheel: scroll pages
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e) => {
      e.preventDefault()
      if (e.deltaY > 0) goTo(currentPage + 1)
      else goTo(currentPage - 1)
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [currentPage, goTo])

  // Drag-and-drop on the whole window
  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const file = e.dataTransfer?.files?.[0]
    if (file) loadFile(file)
  }, [loadFile])

  const handleDragOver = (e) => e.preventDefault()

  const handleFileInput = (e) => {
    const file = e.target.files?.[0]
    if (file) loadFile(file)
  }

  const handleZoomInput = (e) => {
    const val = parseInt(e.target.value, 10)
    if (!isNaN(val) && val >= 25 && val <= 400) setScale(val / 100)
  }

  return (
    <div
      className="flex flex-col h-screen bg-gray-100"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-white border-b shadow-sm flex-shrink-0">
        <label className="cursor-pointer bg-blue-600 text-white text-sm px-3 py-1.5 rounded hover:bg-blue-700">
          Открыть файл
          <input type="file" accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif,.webp" onChange={handleFileInput} className="hidden" />
        </label>

        {totalPages > 0 && (
          <>
            <span className="text-sm text-gray-500 ml-2">{fileName}</span>
            <div className="flex items-center gap-1 ml-auto">
              <button onClick={() => goTo(currentPage - 1)} disabled={currentPage === 0}
                className="px-2 py-1 text-sm rounded border disabled:opacity-40 hover:bg-gray-100">‹ Prev</button>
              <span className="text-sm px-2">{currentPage + 1} / {totalPages}</span>
              <button onClick={() => goTo(currentPage + 1)} disabled={currentPage === totalPages - 1}
                className="px-2 py-1 text-sm rounded border disabled:opacity-40 hover:bg-gray-100">Next ›</button>
            </div>
            <div className="flex items-center gap-1 ml-4">
              <button onClick={() => setScale('fit-width')} className="text-xs px-2 py-1 border rounded hover:bg-gray-100">Fit W</button>
              <button onClick={() => setScale('fit-page')} className="text-xs px-2 py-1 border rounded hover:bg-gray-100">Fit P</button>
              <input type="number" min={25} max={400} defaultValue={Math.round(scale * 100)}
                onBlur={handleZoomInput} onKeyDown={(e) => e.key === 'Enter' && handleZoomInput(e)}
                className="w-16 text-sm border rounded px-1 py-0.5 text-center" />
              <span className="text-sm text-gray-400">%</span>
            </div>
          </>
        )}
      </div>

      {/* Viewport */}
      <div ref={containerRef} className="flex-1 overflow-auto flex items-start justify-center p-6">
        {loading && <p className="text-gray-400 mt-20">Загрузка…</p>}
        {error && <p className="text-red-500 mt-20 max-w-md text-center">{error}</p>}
        {!loading && !error && pages.length === 0 && (
          <div className="text-center mt-20 text-gray-400">
            <p className="text-lg mb-2">Перетащите файл сюда</p>
            <p className="text-sm">или нажмите «Открыть файл» выше</p>
            <p className="text-xs mt-2">PDF, JPG, PNG, TIFF, WEBP · до 50 МБ</p>
          </div>
        )}
        {!loading && pages[currentPage] && (
          <PageCanvas src={pages[currentPage]} scale={scale} containerRef={containerRef} />
        )}
      </div>
    </div>
  )
}

function PageCanvas({ src, scale, containerRef }) {
  const imgRef = useRef(null)

  useEffect(() => {
    const img = imgRef.current
    if (!img) return
    if (scale === 'fit-width') {
      const w = containerRef.current?.clientWidth - 48
      img.style.width = w + 'px'
      img.style.height = 'auto'
    } else if (scale === 'fit-page') {
      const h = containerRef.current?.clientHeight - 48
      img.style.height = h + 'px'
      img.style.width = 'auto'
    } else {
      img.style.width = `${scale * 100}%`
      img.style.height = 'auto'
    }
  }, [scale, src, containerRef])

  return (
    <img
      ref={imgRef}
      src={src}
      alt="Document page"
      className="shadow-lg bg-white max-w-none"
      style={{ width: `${typeof scale === 'number' ? scale * 100 : 100}%`, height: 'auto' }}
    />
  )
}
