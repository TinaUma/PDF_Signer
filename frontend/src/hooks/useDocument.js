import { useState, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString()

const MAX_FILE_SIZE = 50 * 1024 * 1024
const SUPPORTED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/tiff',
  'image/webp',
])
const SUPPORTED_EXTS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.tif', '.webp'])

function getExt(name) {
  return name.slice(name.lastIndexOf('.')).toLowerCase()
}

export function useDocument() {
  const [pages, setPages] = useState([])   // array of ImageBitmap or canvas
  const [currentPage, setCurrentPage] = useState(0)
  const [scale, setScale] = useState(1.0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fileName, setFileName] = useState(null)

  const loadFile = useCallback(async (file) => {
    setError(null)

    if (file.size > MAX_FILE_SIZE) {
      setError(`Файл слишком большой (${(file.size / 1024 / 1024).toFixed(1)} МБ). Максимум — 50 МБ.`)
      return
    }

    const ext = getExt(file.name)
    if (!SUPPORTED_EXTS.has(ext) && !SUPPORTED_TYPES.has(file.type)) {
      setError(`Неподдерживаемый формат файла: "${ext}". Поддерживаются: PDF, JPG, PNG, TIFF, WEBP.`)
      return
    }

    setLoading(true)
    setPages([])
    setCurrentPage(0)
    setFileName(file.name)

    try {
      const arrayBuffer = await file.arrayBuffer()

      if (ext === '.pdf') {
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        const rendered = []
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const viewport = page.getViewport({ scale: 1.5 })
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
          rendered.push(canvas.toDataURL('image/png'))
        }
        setPages(rendered)
      } else {
        const url = URL.createObjectURL(file)
        setPages([url])
      }
    } catch (e) {
      setError(`Ошибка при открытии файла: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }, [])

  const goTo = useCallback((n) => {
    setCurrentPage((prev) => Math.max(0, Math.min(n, pages.length - 1)))
  }, [pages.length])

  return {
    pages, currentPage, scale, loading, error, fileName,
    setScale, goTo, loadFile,
    totalPages: pages.length,
  }
}
