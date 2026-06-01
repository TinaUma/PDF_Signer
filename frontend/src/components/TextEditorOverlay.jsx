import { useRef, useEffect } from 'react'
import { cssFamily } from '../lib/fonts'

// HTML textarea overlaid on a text layer for inline editing. Positioned over the
// Konva node in screen coordinates (position:fixed, so page scroll of the canvas
// area is already reflected in the stage container's rect). Commits on blur or
// Enter (Shift+Enter inserts a newline); Escape cancels.
export function TextEditorOverlay({ layer, stage, onCommit, onCancel }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus()
    el.select()
  }, [])

  if (!stage) return null
  const rect = stage.container().getBoundingClientRect()
  const commit = () => onCommit(ref.current ? ref.current.value : layer.text)

  return (
    <textarea
      ref={ref}
      defaultValue={layer.text}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          commit()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          onCancel()
        }
      }}
      style={{
        position: 'fixed',
        left: `${rect.left + layer.x}px`,
        top: `${rect.top + layer.y}px`,
        width: `${layer.width}px`,
        fontSize: `${layer.fontSize}px`,
        fontFamily: cssFamily(layer.fontFamily),
        fontWeight: layer.bold ? 700 : 400,
        fontStyle: layer.italic ? 'italic' : 'normal',
        color: layer.color,
        textAlign: layer.align,
        transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
        transformOrigin: 'top left',
        lineHeight: 1.25,
        margin: 0,
        padding: 0,
        border: '1px dashed #2563eb',
        outline: 'none',
        background: 'rgba(255,255,255,0.92)',
        resize: 'none',
        overflow: 'hidden',
        zIndex: 50,
      }}
    />
  )
}
