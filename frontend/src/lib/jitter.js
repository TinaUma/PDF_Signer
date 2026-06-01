// Frontend mirror of backend services/composer._jitter_params — keep in sync.
// Lets the canvas preview the per-instance DEFORMATION exactly as the server
// will burn it into the exported file: rotation, non-uniform scale and skew
// (slant) match to the digit (Konva applies translate·rotate·skew·scale, which
// the backend reproduces with the same matrix); the ±px offset is in stage space
// here vs raster space on export, so it is visually representative.
//
// Deterministic: seeded by `${sigId}:${page}:${index}` via SHA-256, same bytes
// and formulas as Python's hashlib.sha256, so a placement always renders the
// same deformation as its export.

const IDENTITY = { dAngle: 0, scaleX: 1, scaleY: 1, skewX: 0, opacity: 1, dx: 0, dy: 0 }

export async function jitterParams(sigId, page, index, intensity) {
  // Neutral when off, or when the platform has no SubtleCrypto (non-secure
  // context): the preview shows the pristine signature, never throws.
  if (!intensity || intensity <= 0 || !globalThis.crypto?.subtle) return { ...IDENTITY }

  const i = Math.min(intensity, 1)
  const bytes = new TextEncoder().encode(`${sigId}:${page}:${index}`)
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
  const unit = (n) => (digest[n] / 255) * 2 - 1 // byte -> [-1, 1]

  return {
    dAngle: unit(0) * 5.0 * i, // ±5°
    scaleX: 1 + unit(1) * 0.1 * i, // ±10% (independent axes -> reshape)
    scaleY: 1 + unit(5) * 0.1 * i, // ±10%
    skewX: unit(2) * 0.18 * i, // ±0.18 ≈ ±10° slant
    opacity: 1 - (digest[6] / 255) * 0.08 * i, // 0..-8%
    dx: Math.round(unit(3) * 4 * i), // ±4 px
    dy: Math.round(unit(4) * 4 * i),
  }
}

export const IDENTITY_JITTER = IDENTITY
