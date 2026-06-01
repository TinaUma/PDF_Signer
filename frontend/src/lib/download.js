import { inTauri } from '../constants'
import { blobToDataUrl } from './blobCodec'

// Build the saved filename from the original document name + a "_signed"
// postfix, e.g. "contract.pdf" -> "contract_signed.pdf". Falls back to
// "document" when the original name is missing.
export function signedName(original, ext) {
  const base = (original || 'document').replace(/\.[^./\\]+$/, '').trim() || 'document'
  return `${base}_signed.${ext || 'pdf'}`
}

// Save a Blob to disk. In the Tauri app the HTML `<a download>` trick is a no-op
// (WebView2 has no download handler), so we round-trip the bytes to a native
// Save dialog via the `save_file` command. In the browser / Docker build we use
// the anchor download as before. Returns false if the user cancels the dialog.
export async function saveBlob(filename, blob) {
  if (inTauri()) {
    const { invoke } = await import('@tauri-apps/api/core')
    const dataUrl = await blobToDataUrl(blob) // "data:<mime>;base64,XXXX"
    const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
    return invoke('save_file', { defaultName: filename, b64 })
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  // Defer revoke so the download isn't cancelled in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return true
}
