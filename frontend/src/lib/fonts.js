// Text-annotation font families. The logical key (sans/serif/handwriting) is
// what we store on a layer and send to the backend (services/text_render maps
// the same keys to the same physical fonts). `css` is the @font-face family used
// by Konva on the canvas, so the preview matches the exported PIL render.
export const TEXT_FAMILIES = [
  { key: 'sans', labelKey: 'text.fontSans', css: 'PDFSans' },
  { key: 'serif', labelKey: 'text.fontSerif', css: 'PDFSerif' },
  { key: 'handwriting', labelKey: 'text.fontHand', css: 'PDFHand' },
]

const DEFAULT = TEXT_FAMILIES[0]

export function cssFamily(key) {
  return (TEXT_FAMILIES.find((f) => f.key === key) || DEFAULT).css
}

// Konva fontStyle string ('normal' | 'bold' | 'italic' | 'italic bold').
export function fontStyle(bold, italic) {
  return [italic && 'italic', bold && 'bold'].filter(Boolean).join(' ') || 'normal'
}
