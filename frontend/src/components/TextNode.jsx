import { useRef, useEffect } from 'react'
import { Text, Transformer } from 'react-konva'
import { cssFamily, fontStyle } from '../lib/fonts'

// A text annotation on the canvas. Width is the wrap box (resized via the
// side anchors); height follows the content. Double-click opens the inline
// editor (onEdit). fontSize/family/style come from the properties panel.
export function TextNode({ layer, isSelected, onSelect, onChange, onEdit }) {
  const ref = useRef(null)
  const trRef = useRef(null)
  const css = cssFamily(layer.fontFamily)

  useEffect(() => {
    if (isSelected && trRef.current && ref.current) {
      trRef.current.nodes([ref.current])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [isSelected])

  // Canvas text does NOT reflow when a webfont finishes loading — wait for the
  // exact face, then force a redraw so the preview uses the chosen font.
  useEffect(() => {
    const weight = layer.bold ? 700 : 400
    const spec = `${layer.italic ? 'italic ' : ''}${weight} ${layer.fontSize}px ${css}`
    document.fonts?.load(spec).then(() => ref.current?.getLayer()?.batchDraw()).catch(() => {})
  }, [css, layer.bold, layer.italic, layer.fontSize, layer.text])

  return (
    <>
      <Text
        ref={ref}
        // No `width` (no auto-wrap): lines break only on explicit newlines, so
        // the canvas matches the server render exactly (PIL doesn't soft-wrap).
        // A space keeps an empty box clickable/editable; export skips blank text.
        text={layer.text || ' '}
        x={layer.x}
        y={layer.y}
        fontSize={layer.fontSize}
        fontFamily={css}
        fontStyle={fontStyle(layer.bold, layer.italic)}
        fill={layer.color}
        align={layer.align}
        opacity={layer.opacity}
        rotation={layer.rotation}
        draggable
        onClick={() => onSelect(layer.id)}
        onTap={() => onSelect(layer.id)}
        onDblClick={() => onEdit(layer.id)}
        onDblTap={() => onEdit(layer.id)}
        onDragEnd={(e) => onChange(layer.id, { x: e.target.x(), y: e.target.y() })}
        onTransformEnd={(e) => {
          // Rotate-only transformer (font size is set in the panel), so just
          // persist the new rotation; scale stays 1.
          const node = e.target
          onChange(layer.id, { x: node.x(), y: node.y(), rotation: node.rotation() })
        }}
      />
      {isSelected && (
        <Transformer ref={trRef} rotateEnabled enabledAnchors={[]} />
      )}
    </>
  )
}
