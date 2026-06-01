import { FALLBACK_DIMS } from '../constants'

// Build the /api/export `pages` payload from the per-page layer map. Only pages
// that have signatures AND are not marked for deletion are included; each uses
// its own real dimensions (so the backend's sx == sy).
//
// Uniquification ("jitter") is per placed signature: each layer carries its own
// `jitter` (0..1), so the user can uniquify one specific placement and leave the
// rest pixel-exact. It is sent on each signature, not on the page.
export function buildExportPayload({ layersByPage, pageDims, deletedPages }) {
  return Object.keys(layersByPage)
    .map(Number)
    .filter((idx) => layersByPage[idx]?.length > 0 && !deletedPages.has(idx))
    .map((idx) => {
      const dims = pageDims[idx] || FALLBACK_DIMS
      const layers = layersByPage[idx]
      // Signatures and text are distinct layer types but share the per-page
      // store; the export payload keeps them in separate lists.
      const signatures = layers
        .filter((l) => l.type !== 'text')
        .map((l) => ({
          id: l.sigId,
          x: l.x,
          y: l.y,
          w: l.width,
          h: l.height,
          angle: l.rotation,
          opacity: l.opacity,
          jitter: l.jitter ?? 0,
        }))
      const texts = layers
        .filter((l) => l.type === 'text' && l.text && l.text.trim())
        .map((l) => ({
          text: l.text,
          x: l.x,
          y: l.y,
          fontSize: l.fontSize,
          family: l.fontFamily,
          bold: !!l.bold,
          italic: !!l.italic,
          color: l.color,
          align: l.align,
          angle: l.rotation,
          opacity: l.opacity,
        }))
      return { page_idx: idx, stage_w: dims.width, stage_h: dims.height, signatures, texts }
    })
}

// Copy the given layers onto every non-deleted page, giving each layer a unique
// id per (page, index) so React keys don't collide. Returns a {pageIdx: layers}
// map to merge into the per-page store.
export function signAllPages(layers, totalPages, deletedPages) {
  const out = {}
  for (let i = 0; i < totalPages; i++) {
    if (deletedPages.has(i)) continue
    out[i] = layers.map((l, j) => ({ ...l, id: `${l.sigId}-p${i}-${j}` }))
  }
  return out
}
