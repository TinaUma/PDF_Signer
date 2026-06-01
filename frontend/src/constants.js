import { invoke } from '@tauri-apps/api/core'

// App version, injected at build time from package.json via Vite `define`
// (see vite.config.js). Falls back to 'dev' when the define is absent (e.g. a
// raw test runner without the config). Shown in the About dialog.
export const APP_VERSION =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'

// Public source repository — linked from the About dialog.
export const GITHUB_URL = 'https://github.com/TinaUma/PDF_Signer'

// A4 @ ~96dpi — fallback stage size when a page's real pixel size is unknown.
// Mirrors backend/constants.py (STAGE_FALLBACK_W/H); keep both in sync.
export const FALLBACK_DIMS = { width: 794, height: 1123 }

export const MAX_FILE_SIZE = 50 * 1024 * 1024  // 50 MB (mirror backend/nginx)
export const MAX_PAGES = 500  // mirror backend MAX_PAGES — cap client-side render
export const MIN_LAYER_SIZE = 20  // min signature width/height in px
export const DROP_MAX_WIDTH_FRACTION = 0.25  // dropped signature ≤ 25% of page width
export const PDF_RENDER_SCALE = 1.5  // pdf.js viewport scale for page rendering

// API origin. Empty = relative (Docker/browser: nginx proxies /api same-origin).
//
// In the Tauri native app there is no proxy and the bundled FastAPI sidecar
// binds to a DYNAMIC free port (Rust picks one to avoid clashing with whatever
// already holds 8000 on the user's machine). The webview origin
// (tauri://localhost) can't reach it with a relative path, so we ask Rust which
// port it chose via the `api_port` command and build an absolute base.
let apiBase = import.meta.env.VITE_API_BASE ?? ''

// True only inside the Tauri webview. __TAURI_INTERNALS__ is injected by the
// runtime regardless of withGlobalTauri, so detection still works with the
// global API surface turned off (we import `invoke` explicitly instead).
export function inTauri() {
  return typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__
}

// Resolve the API base once at startup; call before mounting the app. A no-op
// in the browser/Docker build (stays relative). Never throws — on failure it
// keeps the default so the app still renders with a clear error path.
export async function resolveApiBase() {
  if (inTauri()) {
    try {
      const port = await invoke('api_port')
      apiBase = `http://127.0.0.1:${port}`
    } catch (e) {
      console.error('Failed to resolve API port from Tauri:', e)
    }
  }
  return apiBase
}

// Current resolved API base. Read at request time (not module-load) so callers
// observe the port resolved by resolveApiBase().
export function getApiBase() {
  return apiBase
}

// Poll the sidecar's /health until it answers 200, or give up after timeoutMs.
// The bundled FastAPI process is spawned by Rust and takes a moment to bind its
// port; firing the first real request too early yields a connection-refused that
// surfaces as a blank "working" UI. Returns true once healthy, false on timeout.
// Browser/Docker callers should skip this (nginx may not proxy /health).
export async function waitForBackend(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs
  let delay = 100  // ms, exponential backoff capped at 1s
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${getApiBase()}/health`)
      if (res.ok) return true
    } catch {
      /* not up yet — keep polling */
    }
    await new Promise((r) => setTimeout(r, delay))
    delay = Math.min(delay * 2, 1000)
  }
  return false
}
