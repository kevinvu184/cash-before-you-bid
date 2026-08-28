// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import i18n from '../i18n'
import { LANGS, type Lang } from '../logic/lang'
import { estimateMoney } from './shared/text'
import type { Display } from '../logic/display'
import { viewModelFixture } from '../testing/viewModelFixture'
import type { SkinModule } from '../types/skin'
import { SKINS } from './registry'

// The mixed-currency guard, in every skin and both locales.
//
// Converting the amounts alone would have rendered explanations like
//   ~749.300.000 ₫ × (~14.025.000.000 ₫ − 600.000 AUD) ÷ 150.000 AUD
// — an equation subtracting dollars from đồng. Every money figure a sentence
// quotes, statutory thresholds included, goes through the display; nothing is
// a literal in the locale files. This proves it, by reading the money surface
// of a rendered page and failing on any dollar marker left in it.
//
// The rate line is exempt and is not read here: it exists to say what one
// dollar is worth, so naming the base currency is its whole job.

const SKIN_LIST = Object.values(SKINS)
const modules = new Map<string, SkinModule>()

// Everything that carries a figure: the tiles, the table rows, the verdicts
// and the flags — labels, values, subtitles and workings alike. `td.m` catches
// the default skin's phone layout, where a row's working is in a continuation
// row beside the field rather than inside it.
const MONEY_SURFACE =
  '[data-field^="line"], [data-field^="stat"], [data-field^="verdict"], [data-field="flags"], td.m'

const DOLLAR_MARKER = /AUD|A\$/

beforeAll(async () => {
  for (const entry of SKIN_LIST) modules.set(entry.id, await entry.load())
})

afterEach(async () => {
  cleanup()
  await i18n.changeLanguage('vi')
})

async function renderSkin(id: string, locale: Lang) {
  await i18n.changeLanguage(locale)
  const vm = viewModelFixture({ locale })
  const module = modules.get(id)
  if (!module) throw new Error(`skin not loaded: ${id}`)
  const Root = module.components.Root
  const { container } = render(<Root vm={vm} />)
  return { container, vm }
}

describe.each(SKIN_LIST.map((entry) => entry.id))('skin %s, converting', (skinId) => {
  it.each(LANGS)('writes no figure in dollars while showing đồng, in %s', async (locale) => {
    const { container } = await renderSkin(skinId, locale)
    const written = [...container.querySelectorAll(MONEY_SURFACE)].map(
      (element) => element.textContent ?? '',
    )
    // A guard that read nothing would pass for the wrong reason.
    expect(written.length).toBeGreaterThan(10)
    expect(written.some((text) => text.includes('₫'))).toBe(true)
    for (const text of written) {
      expect(text).not.toMatch(DOLLAR_MARKER)
    }
  })

  it.each(LANGS)('quotes the duty thresholds converted, not as literals, in %s', async (locale) => {
    const { container, vm } = await renderSkin(skinId, locale)
    const display: Display = { locale, ...vm.display.settings }
    const duty = container.querySelector('[data-field="lineStampDuty"]')
    expect(duty).not.toBeNull()
    // The general-rate explanation quotes the dutiable value the fixture
    // carries; in đồng that is the converted, rounded figure.
    const surface = `${duty?.textContent ?? ''}${
      [...container.querySelectorAll('td.m')].map((cell) => cell.textContent).join('')
    }`
    expect(surface).toContain(estimateMoney(820_000, display))
  })
})
