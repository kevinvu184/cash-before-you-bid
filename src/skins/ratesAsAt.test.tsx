// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { RATES_AS_AT, SRO_DUTY_CALCULATOR_URL } from '../data/rates'
import i18n from '../i18n'
import { LANGS, type Lang } from '../logic/lang'
import { viewModelFixture } from '../testing/viewModelFixture'
import type { SkinModule } from '../types/skin'
import { SKINS } from './registry'

// "Rates current as at …", as a reader meets it. Parity proves the field is in
// the DOM in every skin; this proves it names the config's own date — not a
// date written separately, which is how an as-at line goes stale without
// anyone noticing — and that the link beside it goes to the State Revenue
// Office, where the figure can actually be checked.

const SKIN_LIST = Object.values(SKINS)
const modules = new Map<string, SkinModule>()

beforeAll(async () => {
  for (const entry of SKIN_LIST) modules.set(entry.id, await entry.load())
})

afterEach(async () => {
  cleanup()
  await i18n.changeLanguage('vi')
})

async function renderSkin(id: string, locale: Lang) {
  await i18n.changeLanguage(locale)
  const module = modules.get(id)
  if (!module) throw new Error(`skin not loaded: ${id}`)
  const Root = module.components.Root
  return render(<Root vm={viewModelFixture({ locale })} />).container
}

const YEAR = RATES_AS_AT.slice(0, 4)

describe.each(SKIN_LIST.map((entry) => entry.id))('the as-at line in skin %s', (skinId) => {
  it.each(LANGS)('names the config date in %s', async (locale) => {
    const container = await renderSkin(skinId, locale)
    const line = container.querySelector('[data-field="ratesAsAt"]')
    expect(line).not.toBeNull()

    const text = line?.textContent ?? ''
    // The day and year are locale-independent digits; the month name is not,
    // so the assertion stops where the locale takes over.
    expect(text).toContain(YEAR)
    expect(text).toContain(String(Number(RATES_AS_AT.slice(8, 10))))
    // Never the raw ISO string: that is the degraded fallback, not the output.
    expect(text).not.toContain(RATES_AS_AT)
  })

  it('links to the State Revenue Office calculator beside the date', async () => {
    const container = await renderSkin(skinId, 'en')
    const link = container.querySelector<HTMLAnchorElement>('[data-field="ratesAsAt"] a')
    expect(link?.getAttribute('href')).toBe(SRO_DUTY_CALCULATOR_URL)
    expect(link?.textContent?.length ?? 0).toBeGreaterThan(0)
  })
})
