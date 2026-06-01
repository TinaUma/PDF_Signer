import { useRef, useEffect, useState, useCallback } from 'react'
import { Stage, Layer, Image as KonvaImage, Transformer } from 'react-konva'
import { useCanvas } from '../hooks/useCanvas'
import { useI18n } from '../i18n/index.jsx'
import { MIN_LAYER_SIZE, DROP_MAX_WIDTH_FRACTION } from '../constants'
import { jitterParams, IDENTITY_JITTER } from '../lib/jitter'
import { TextNode } from './TextNode'
import { TextEditorOverlay } from './TextEditorOverlay'
import { TextProperties } from './TextProperties'

function PageBackground({ dataUrl, width, height }) {
  const [img, setImg] = useState(null)
  useEffect(() => {
    if (!dataUrl) return
    const image = new window.Image()
    image.src = dataUrl
    image.onload = () => setImg(image)
  }, [dataUrl])
  return img ? <KonvaImage image={img} x={0} y={0} width={width} height={height} listening={false} /> : null
}

function SignatureNode({ layer, page, index, isSelected, onSelect, onChange, imageUrl }) {
  const imgRef = useRef(null)
  const trRef = useRef(null)
  const [img, setImg] = useState(null)
  // Live preview of the per-instance uniquification, recomputed (deterministic,
  // matches the export) whenever the placement or its jitter changes.
  const [jit, setJit] = useState(IDENTITY_JITTER)

  useEffect(() => {
    const image = new window.Image()
    image.src = imageUrl(layer.sigId)
    image.onload = () => setImg(image)
  }, [layer.sigId, imageUrl])

  useEffect(() => {
    let alive = true
    jitterParams(layer.sigId, page, index, layer.jitter || 0).then((j) => {
      if (alive) setJit(j)
    })
    return () => {
      alive = false
    }
  }, [layer.sigId, page, index, layer.jitter])

  useEffect(() => {
    if (isSelected && trRef.current && imgRef.current) {
      trRef.current.nodes([imgRef.current])
      trRef.current.getLayer().batchDraw()
    }
  }, [isSelected])

  // Render with the deformation applied (non-uniform scale baked into the draw
  // size + skew + rotation + offset, exactly as the server composes it); editing
  // handlers divide/subtract it back out so the stored base coords stay clean (no
  // drift on repeated drag/transform).
  const sx = jit.scaleX || 1
  const sy = jit.scaleY || 1

  return (
    <>
      <KonvaImage
        ref={imgRef}
        image={img}
        x={layer.x + jit.dx}
        y={layer.y + jit.dy}
        width={layer.width * sx}
        height={layer.height * sy}
        skewX={jit.skewX}
        rotation={layer.rotation + jit.dAngle}
        opacity={Math.max(0, Math.min(1, layer.opacity * jit.opacity))}
        draggable
        onClick={() => onSelect(layer.id)}
        onTap={() => onSelect(layer.id)}
        onDragEnd={(e) =>
          onChange(layer.id, { x: e.target.x() - jit.dx, y: e.target.y() - jit.dy })
        }
        onTransformEnd={(e) => {
          const node = e.target
          onChange(layer.id, {
            x: node.x() - jit.dx,
            y: node.y() - jit.dy,
            width: Math.max(MIN_LAYER_SIZE, (node.width() * node.scaleX()) / sx),
            height: Math.max(MIN_LAYER_SIZE, (node.height() * node.scaleY()) / sy),
            rotation: node.rotation() - jit.dAngle,
          })
          node.scaleX(1)
          node.scaleY(1)
        }}
      />
      {isSelected && (
        <Transformer ref={trRef} keepRatio rotateEnabled boundBoxFunc={(old, nw) => ({
          ...nw,
          width: Math.max(MIN_LAYER_SIZE, nw.width),
          height: Math.max(MIN_LAYER_SIZE, nw.height),
        })} />
      )}
    </>
  )
}

export function CanvasEditor({ pageDataUrl, pageWidth = 794, pageHeight = 1123, pageIndex = 0, imageUrl, initialLayers = [], onLayersChange, onUndoStateChange }) {
  const { t } = useI18n()
  const { layers, addSignature, addText, updateLayer, updateLayerLive, checkpoint, removeLayer, undo, redo, canUndo, canRedo } = useCanvas(initialLayers)
  const [selectedId, setSelectedId] = useState(null)
  const [editingId, setEditingId] = useState(null)  // text layer being edited inline
  const stageRef = useRef(null)

  const handleAddText = () => {
    const id = addText()
    setSelectedId(id)
    setEditingId(id)  // open the inline editor immediately
  }

  // Finish an inline edit. An empty/whitespace result drops the box (so adding
  // text then typing nothing / Escaping leaves no stray layer). `cancelled`
  // keeps the layer's existing text rather than the textarea value.
  const finishEdit = (text, cancelled = false) => {
    const id = editingId
    setEditingId(null)
    if (!id) return
    const current = layers.find((l) => l.id === id)
    const finalText = (cancelled ? current?.text : text) || ''
    if (!finalText.trim()) {
      removeLayer(id)
      setSelectedId((c) => (c === id ? null : c))
      return
    }
    if (!cancelled) {
      checkpoint()
      updateLayerLive(id, { text: finalText })
    }
  }

  useEffect(() => { onLayersChange?.(layers) }, [layers, onLayersChange])

  useEffect(() => { onUndoStateChange?.({ undo, redo, canUndo, canRedo }) }, [canUndo, canRedo, undo, redo, onUndoStateChange])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      // Don't hijack Delete/Backspace while typing in the properties inputs.
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        removeLayer(selectedId)  // graceful if null
        setSelectedId(null)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo() }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedId, removeLayer, undo, redo])

  // Drop signature from library — load image to get natural aspect ratio, cap at 25% page width
  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()  // prevent bubbling to App's file-drop handler
    const data = e.dataTransfer.getData('application/signature')
    if (!data) return
    // A foreign/garbled drag can carry our MIME type with non-JSON data; an
    // unguarded parse would throw out of the event handler. Ignore bad payloads.
    let sig
    try {
      sig = JSON.parse(data)
    } catch {
      return
    }
    const stage = stageRef.current
    if (!stage) return
    const rect = stage.container().getBoundingClientRect()
    const dropX = e.clientX - rect.left
    const dropY = e.clientY - rect.top

    const img = new window.Image()
    img.src = imageUrl(sig.id)
    img.onload = () => {
      if (!img.naturalWidth) { addSignature(sig, dropX, dropY); return }
      const maxW = pageWidth * DROP_MAX_WIDTH_FRACTION
      const scale = Math.min(maxW / img.naturalWidth, 1)
      const w = Math.max(MIN_LAYER_SIZE, Math.round(img.naturalWidth * scale))
      const h = Math.max(MIN_LAYER_SIZE, Math.round(img.naturalHeight * scale))
      addSignature(sig, dropX - w / 2, dropY - h / 2, w, h)
    }
    img.onerror = () => addSignature(sig, dropX, dropY)
  }, [addSignature, imageUrl, pageWidth])

  const selectedLayer = layers.find((l) => l.id === selectedId)
  const editingLayer = layers.find((l) => l.id === editingId)

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Canvas area */}
      <div
        className="flex-1 overflow-auto bg-gray-200 flex items-start justify-center p-4"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <Stage
          ref={stageRef}
          width={pageWidth}
          height={pageHeight}
          style={{ background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
          onMouseDown={(e) => { if (e.target === e.target.getStage()) setSelectedId(null) }}
        >
          <Layer>
            <PageBackground dataUrl={pageDataUrl} width={pageWidth} height={pageHeight} />
            {layers.map((layer, index) =>
              layer.type === 'text' ? (
                <TextNode
                  key={layer.id}
                  layer={layer}
                  isSelected={layer.id === selectedId}
                  onSelect={setSelectedId}
                  onChange={updateLayer}
                  onEdit={(id) => { setSelectedId(id); setEditingId(id) }}
                />
              ) : (
                <SignatureNode
                  key={layer.id}
                  layer={layer}
                  page={pageIndex}
                  index={index}
                  isSelected={layer.id === selectedId}
                  onSelect={setSelectedId}
                  onChange={updateLayer}
                  imageUrl={imageUrl}
                />
              ),
            )}
          </Layer>
        </Stage>
      </div>

      {/* Properties panel */}
      <div className="w-52 bg-white border-l flex flex-col text-xs">
        <div className="px-3 py-2 border-b font-medium text-gray-700 flex items-center justify-between gap-2">
          <span>{t('props.title')}</span>
          <button
            onClick={handleAddText}
            title={t('text.add')}
            className="text-blue-600 border border-blue-200 rounded px-1.5 py-0.5 hover:bg-blue-50 font-normal"
          >
            + {t('text.addShort')}
          </button>
        </div>

        {selectedLayer ? (
          <div className="px-3 py-2 flex flex-col gap-2">
            {(selectedLayer.type === 'text'
              ? [['X', 'x'], ['Y', 'y'], ['W', 'width']]
              : [['X', 'x'], ['Y', 'y'], ['W', 'width'], ['H', 'height']]
            ).map(([label, key]) => (
              <label key={key} className="flex items-center gap-2">
                <span className="w-4 text-gray-500">{label}</span>
                <input type="number" value={Math.round(selectedLayer[key])}
                  onFocus={checkpoint}
                  onChange={(e) => updateLayerLive(selectedLayer.id, { [key]: Number(e.target.value) })}
                  className="flex-1 border rounded px-1 py-0.5 w-0" />
              </label>
            ))}
            <label className="flex items-center gap-2">
              <span className="w-8 text-gray-500">{t('props.angle')}</span>
              <input type="number" value={Math.round(selectedLayer.rotation)}
                onFocus={checkpoint}
                onChange={(e) => updateLayerLive(selectedLayer.id, { rotation: Number(e.target.value) })}
                className="flex-1 border rounded px-1 py-0.5 w-0" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-gray-500">{t('props.opacity')} {Math.round(selectedLayer.opacity * 100)}%</span>
              <input type="range" min={0} max={100} value={Math.round(selectedLayer.opacity * 100)}
                onPointerDown={checkpoint}
                onChange={(e) => updateLayerLive(selectedLayer.id, { opacity: Number(e.target.value) / 100 })}
                className="w-full" />
            </label>
            {selectedLayer.type !== 'text' && (
              <label className="flex flex-col gap-1" title={t('props.uniquifyHint')}>
                <span className={(selectedLayer.jitter || 0) > 0 ? 'text-blue-600 font-medium' : 'text-gray-500'}>
                  {t('props.uniquify')} {Math.round((selectedLayer.jitter || 0) * 100)}%
                </span>
                <input type="range" min={0} max={100} value={Math.round((selectedLayer.jitter || 0) * 100)}
                  onPointerDown={checkpoint}
                  onChange={(e) => updateLayerLive(selectedLayer.id, { jitter: Number(e.target.value) / 100 })}
                  className="w-full" />
              </label>
            )}
            {selectedLayer.type === 'text' && (
              <>
                <TextProperties
                  layer={selectedLayer}
                  onLive={updateLayerLive}
                  checkpoint={checkpoint}
                />
                <button onClick={() => setEditingId(selectedLayer.id)}
                  className="border border-gray-200 rounded py-1 text-gray-600 hover:bg-gray-50">
                  {t('text.edit')}
                </button>
              </>
            )}
            <button onClick={() => { removeLayer(selectedLayer.id); setSelectedId(null) }}
              className="mt-2 text-red-500 border border-red-200 rounded py-1 hover:bg-red-50">
              {t('props.delete')}
            </button>
          </div>
        ) : (
          <p className="text-gray-400 px-3 py-3">{t('props.selectHint')}</p>
        )}
      </div>

      {editingId && editingLayer && (
        <TextEditorOverlay
          layer={editingLayer}
          stage={stageRef.current}
          onCommit={(t) => finishEdit(t)}
          onCancel={() => finishEdit(null, true)}
        />
      )}
    </div>
  )
}
