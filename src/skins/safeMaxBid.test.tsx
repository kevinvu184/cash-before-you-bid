// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import i18n from '../i18n'
import { LANGS, type Lang } from '../logic/lang'
import { SAFE_MAX_BID_CEILING } from '../logic/safeMaxBid'
import { viewModelFixture, type FixtureOptions } from '../testing/viewModelFixture'
import type { Display } from '../logic/display'
import type { SkinModule } from '../types/skin'
import { SKINS } from './registry'
import { estimateMoney } from './shared/text'

// The safe maximum bid, as a reader meets it. Parity proves the field is in the
// DOM in every skin; this proves the figure is actually shown where there is
// one, that no figure is invented where there is not, and that both locales
// have the sentence rather than falling back to the key.

const SKIN_LIST = Object.values(SKINS)
const modules = new Map<string, SkinModule>()

beforeAll(async () => {
  for (const entry of SKIN_LIST) modules.set(entry.id, await entry.load())
})

afterEach(async () => {
  cleanup()
  await i18n.changeLanguage('vi')
})

// Every figure is written through the display the fixture carries, currency
// and rate included — a skin that formatted the bid ceiling in dollars under a
// ₫ page would otherwise pass this suite.
function displayFor(locale: Lang, options: FixtureOptions = {}): Display {
  return { locale, ...viewModelFixture({ ...options, locale }).display.settings }
}

async function renderSkin(id: string, locale: Lang, options: FixtureOptions = {}) {
  await i18n.changeLanguage(locale)
  const module = modules.get(id)
  if (!module) throw new Error(`skin not loaded: ${id}`)
  const Root = module.components.Root
  const { container } = render(<Root vm={viewModelFixture({ ...options, locale })} />)
  const field = container.querySelector('[data-field="safeMaxBid"]')
  if (field === null) throw new Error(`skin ${id} rendered no safe maximum bid`)
  return field
}

describe.each(SKIN_LIST.map((entry) => entry.id))('safe maximum bid in skin %s', (skinId) => {
  it.each(LANGS)('shows the figure and the sentence that explains it in %s', async (locale) => {
    const field = await renderSkin(skinId, locale)
    const text = field.textContent ?? ''
    const display = displayFor(locale)

    expect(text).toContain(estimateMoney(690_000, display))
    // A missing translation renders as the key itself.
    expect(text).not.toContain('safeMaxBid.')
    expect(text.length).toBeGreaterThan(estimateMoney(690_000, display).length)
  })

  it.each(LANGS)('names the rounding it applied, in %s', async (locale) => {
    const field = await renderSkin(skinId, locale)
    // The unit is quoted exactly, from the constant the search rounds by.
    expect(field.textContent).toContain(estimateMoney(1000, displayFor(locale)))
  })

  it('states no price when no price is affordable', async () => {
    const field = await renderSkin(skinId, 'en', {
      safeMaxBid: { price: 0, exact: 0, binding: 'cash', status: 'unaffordable', iterations: 0 },
    })
    const text = field.textContent ?? ''

    expect(text).not.toContain(estimateMoney(0, displayFor('en')))
    expect(text.length).toBeGreaterThan(0)
    expect(text).not.toContain('safeMaxBid.')
  })

  it('states no price when nothing caps the bid', async () => {
    const field = await renderSkin(skinId, 'en', {
      safeMaxBid: {
        price: SAFE_MAX_BID_CEILING,
        exact: SAFE_MAX_BID_CEILING,
        binding: 'none',
        status: 'unbounded',
        iterations: 0,
      },
    })
    // The ceiling appears in the sentence, never as a headline figure.
    expect(field.querySelector('.max-bid-figure, .plain-figure')).toBeNull()
    expect(field.textContent).not.toContain('safeMaxBid.')
  })
})
