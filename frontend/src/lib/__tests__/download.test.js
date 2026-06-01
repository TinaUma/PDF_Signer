import { describe, it, expect } from 'vitest'
import { signedName } from '../download'

describe('signedName', () => {
  it('appends _signed before the new extension', () => {
    expect(signedName('contract.pdf', 'pdf')).toBe('contract_signed.pdf')
    expect(signedName('photo.JPG', 'jpg')).toBe('photo_signed.jpg')
  })

  it('keeps inner dots, stripping only the last extension', () => {
    expect(signedName('my.report.pdf', 'pdf')).toBe('my.report_signed.pdf')
  })

  it('handles a name without an extension', () => {
    expect(signedName('scan', 'png')).toBe('scan_signed.png')
  })

  it('falls back to "document" for an empty/missing name', () => {
    expect(signedName('', 'pdf')).toBe('document_signed.pdf')
    expect(signedName(undefined, 'pdf')).toBe('document_signed.pdf')
  })
})
