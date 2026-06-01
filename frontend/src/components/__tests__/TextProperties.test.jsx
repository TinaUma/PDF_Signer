import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../../i18n/index.jsx'
import { TextProperties } from '../TextProperties'

const baseLayer = {
  id: 't1', fontFamily: 'sans', fontSize: 32, bold: false, italic: false,
  color: '#000000', align: 'left',
}

function setup(over = {}) {
  const onLive = vi.fn()
  const checkpoint = vi.fn()
  render(
    <I18nProvider>
      <TextProperties layer={{ ...baseLayer, ...over }} onLive={onLive} checkpoint={checkpoint} />
    </I18nProvider>,
  )
  return { onLive, checkpoint }
}

describe('TextProperties', () => {
  it('toggling bold checkpoints and updates the layer', () => {
    const { onLive, checkpoint } = setup()
    fireEvent.click(screen.getByText('B'))
    expect(checkpoint).toHaveBeenCalled()
    expect(onLive).toHaveBeenCalledWith('t1', { bold: true })
  })

  it('changing the font family updates fontFamily', () => {
    const { onLive } = setup()
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'serif' } })
    expect(onLive).toHaveBeenCalledWith('t1', { fontFamily: 'serif' })
  })

  it('the align buttons set alignment', () => {
    const { onLive } = setup()
    fireEvent.click(screen.getByText('R'))
    expect(onLive).toHaveBeenCalledWith('t1', { align: 'right' })
  })
})
