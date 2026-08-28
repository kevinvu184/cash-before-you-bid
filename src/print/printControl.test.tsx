// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import App from '../App'
import i18n from '../i18n'
import { LANGS, type Lang } from '../logic/lang'
import { SKINS } from '../skins/registry'
import { viewModelFixture } from '../testing/viewModelFixture'
import type { SkinModule } from '../types/skin'

// The affordance. A one-pager nobody can find the way to print is not a
// deliverable on a phone, where the print command is buried in a share sheet —
// so every skin carries the control, and it hands the page to the browser's
// own print pipeline rather than to anything that leaves the device.

const SKIN_LIST = Object.values(SKINS)
const modules = new Map<string, SkinModule>()

beforeAll(async () => {
  for (const entry of SKIN_LIST) modules.set(entry.id, await entry.load())
})

afterEach(async () => {
  cleanup()
  vi.restoreAllMocks()
  // Unstubbed here rather than at the end of the test body: an assertion that
  // throws would otherwise leak the stub into whatever runs next.
  vi.unstubAllGlobals()
  await i18n.changeLanguage('vi')
})

async function renderSkin(id: string, locale: Lang, onActivate: () => void) {
  await i18n.changeLanguage(locale)
  const base = viewModelFixture({ locale })
  const vm = {
    ...base,
    controls: { ...base.controls, print: { ...base.controls.print, onActivate } },
  }
  const module = modules.get(id)
  if (!module) throw new Error(`skin not loaded: ${id}`)
  const { container } = render(<module.components.Root vm={vm} />)
  const field = container.querySelector('[data-field="print"]')
  if (field === null) throw new Error(`skin ${id} rendered no print control`)
  return field
}

describe.each(SKIN_LIST.map((entry) => entry.id))('the print control in skin %s', (skinId) => {
  it.each(LANGS)('is a button named in %s, not a key', async (locale) => {
    const button = (await renderSkin(skinId, locale, () => {})).querySelector('button')

    expect(button).not.toBeNull()
    expect(button?.textContent).toBe(i18n.t('print.action'))
    expect(button?.textContent).not.toContain('print.')
  })

  it('activates the action on click', async () => {
    const activate = vi.fn()
    const field = await renderSkin(skinId, 'en', activate)

    fireEvent.click(field.querySelector('button') as HTMLButtonElement)
    expect(activate).toHaveBeenCalledTimes(1)
  })
})

describe('the wiring', () => {
  it('hands the page to the browser’s own print pipeline, and nothing else', async () => {
    // jsdom does not implement window.print; the stub is also the assertion.
    const print = vi.fn()
    vi.stubGlobal('print', print)
    const fetchSpy = vi.spyOn(globalThis, 'fetch' as never)

    const { container } = render(<App />)
    await waitFor(() => expect(document.getElementById('price')).not.toBeNull())
    const control = container.querySelector('[data-field="print"] button')
    expect(control).not.toBeNull()
    fireEvent.click(control as HTMLButtonElement)

    expect(print).toHaveBeenCalledTimes(1)
    // No server round trip: the one-pager is rendered by the browser from the
    // page it already has, so the figures never leave the device.
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
