// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import i18n from '../i18n'
import { LANGS } from '../logic/lang'
import { viewModelFixture } from '../testing/viewModelFixture'
import type { SkinModule } from '../types/skin'
import { SKINS } from './registry'

// The auction-day guidance, as a reader meets it. Parity proves the field is
// in the DOM in every skin; this proves it says something in both locales and
// that a phone can open it — a tap target and a keyboard-operable control, no
// hover anywhere in the path.

const SKIN_LIST = Object.values(SKINS)
const modules = new Map<string, SkinModule>()

beforeAll(async () => {
  for (const entry of SKIN_LIST) modules.set(entry.id, await entry.load())
})

afterEach(async () => {
  cleanup()
  await i18n.changeLanguage('vi')
})

async function renderSkin(id: string, locale: (typeof LANGS)[number]) {
  await i18n.changeLanguage(locale)
  const module = modules.get(id)
  if (!module) throw new Error(`skin not loaded: ${id}`)
  const Root = module.components.Root
  return render(<Root vm={viewModelFixture({ locale })} />).container
}

describe.each(SKIN_LIST.map((entry) => entry.id))('deposit guidance in skin %s', (skinId) => {
  it.each(LANGS)('spells out the four payment points in %s', async (locale) => {
    const container = await renderSkin(skinId, locale)
    const guidance = container.querySelector('[data-field="guidanceAuctionDay"]')
    expect(guidance).not.toBeNull()

    const text = guidance?.textContent ?? ''
    // The legislation name is left in English in both locales, and the reason
    // a bond is different is the part worth checking has survived.
    expect(text).toContain('Section 27')
    expect(text).toContain('Sale of Land Act 1962')
    expect(guidance?.querySelectorAll('li').length).toBeGreaterThanOrEqual(4)
  })

  it('sits inside the auction-day band, after its subtotal', async () => {
    const container = await renderSkin(skinId, 'en')
    const group = container.querySelector('[data-field="guidanceAuctionDay"]')?.closest('tbody')
    expect(group?.querySelector('[data-field="lineSubtotalAuctionDay"]')).not.toBeNull()
    expect(group?.querySelector('[data-field="lineDeposit"]')).not.toBeNull()
  })

  it('is opened by a control, or by nothing at all — never by hover', async () => {
    const container = await renderSkin(skinId, 'en')
    const guidance = container.querySelector('[data-field="guidanceAuctionDay"]')
    const details = guidance?.closest('details')
    if (details === null || details === undefined) {
      // A skin may simply show the points; then there is nothing to open.
      expect(guidance?.textContent?.length ?? 0).toBeGreaterThan(0)
      return
    }
    // `<summary>` is focusable and activates on Enter and Space natively, so
    // the disclosure needs neither a pointer nor a hover state.
    expect(details.querySelector('summary')?.textContent?.length ?? 0).toBeGreaterThan(0)
  })
})
