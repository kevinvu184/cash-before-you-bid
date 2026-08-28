// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import i18n from '../i18n'
import { LANGS, type Lang } from '../logic/lang'
import { SAFE_MAX_BID_CEILING } from '../logic/safeMaxBid'
import { BASE_CURRENCY } from '../logic/currencyConfig'
import type { Display } from '../logic/display'
import { estimateMoney, exactMoney, quotedRate, refText } from '../skins/shared/text'
import { viewModelFixture, type FixtureOptions } from '../testing/viewModelFixture'
import { PrintSheet } from './PrintSheet'

// The artefact that travels to the auction. The stylesheet decides what it
// looks like on paper; this decides what is on it — which is the part that
// matters, because a page that reaches an auction without its caveats is
// worse than no page at all.

afterEach(async () => {
  cleanup()
  await i18n.changeLanguage('vi')
})

async function renderSheet(locale: Lang, options: FixtureOptions = {}) {
  await i18n.changeLanguage(locale)
  const vm = viewModelFixture({ ...options, locale })
  const { container } = render(<PrintSheet vm={vm} />)
  const sheet = container.querySelector<HTMLElement>('.print-sheet')
  if (sheet === null) throw new Error('no print sheet rendered')
  return { sheet, vm }
}

// Every figure is written through the display the fixture carries — currency
// and rate — with the locale added at the point of use, exactly as the sheet
// does. Asserting against a bare locale would pass while the sheet printed
// dollars to a reader who asked for đồng.
function displayFor(locale: Lang, options: FixtureOptions = {}): Display {
  return { locale, ...viewModelFixture({ ...options, locale }).display.settings }
}

const bandSubtotal = (vm: ReturnType<typeof viewModelFixture>, band: string) => {
  const group = vm.results.lineGroups.find((candidate) => candidate.band === band)
  if (group === undefined) throw new Error(`fixture has no ${band} band`)
  return group.subtotal.value
}

describe('the three numbers that matter', () => {
  it.each(LANGS)('carries the deposit, the ceiling and settlement in %s', async (locale) => {
    const { sheet, vm } = await renderSheet(locale)
    const headline = sheet.querySelector('.print-headline')?.textContent ?? ''

    expect(headline).toContain(estimateMoney(bandSubtotal(vm, 'auctionDay'), displayFor(locale)))
    expect(headline).toContain(estimateMoney(vm.results.safeMaxBid.value, displayFor(locale)))
    expect(headline).toContain(estimateMoney(bandSubtotal(vm, 'atSettlement'), displayFor(locale)))
  })

  it.each(LANGS)('says what the bid ceiling is bounded by, in %s', async (locale) => {
    const { sheet } = await renderSheet(locale)
    const note = sheet.querySelector('.print-bid-note')?.textContent ?? ''

    expect(note.length).toBeGreaterThan(0)
    // A missing translation renders as the key itself.
    expect(note).not.toContain('safeMaxBid.')
  })

  it('prints no ceiling figure when no price is affordable', async () => {
    const { sheet } = await renderSheet('en', {
      safeMaxBid: { price: 0, exact: 0, binding: 'cash', status: 'unaffordable', iterations: 0 },
    })
    const figures = [...sheet.querySelectorAll('.print-headline-figure')].map(
      (element) => element.textContent,
    )

    // The two band subtotals still headline; the bid does not invent a price.
    expect(figures).toHaveLength(2)
    expect(figures).not.toContain(estimateMoney(0, displayFor('en')))
    expect(sheet.querySelector('.print-bid-note')?.textContent).not.toContain('safeMaxBid.')
  })

  it('prints no ceiling figure when nothing caps the bid', async () => {
    const { sheet } = await renderSheet('en', {
      safeMaxBid: {
        price: SAFE_MAX_BID_CEILING,
        exact: SAFE_MAX_BID_CEILING,
        binding: 'none',
        status: 'unbounded',
        iterations: 0,
      },
    })

    expect(sheet.querySelectorAll('.print-headline-figure')).toHaveLength(2)
  })
})

describe('the currency the reader asked for', () => {
  it.each(LANGS)('writes the figures in the display currency, not the base one, in %s', async (locale) => {
    const { sheet, vm } = await renderSheet(locale)
    const deposit = bandSubtotal(vm, 'auctionDay')
    const text = sheet.textContent ?? ''

    // The fixture displays đồng at a rate, so a sheet that ignored the display
    // would print the unconverted dollar figure. Both assertions are needed:
    // the first alone would pass on a sheet that printed both.
    expect(text).toContain(estimateMoney(deposit, displayFor(locale)))
    expect(text).not.toContain(
      estimateMoney(deposit, { locale, currency: BASE_CURRENCY, rate: 1 }),
    )
  })

  it.each(LANGS)('says what rate it converted at, and where the rate came from, in %s', async (locale) => {
    const { sheet, vm } = await renderSheet(locale)
    const rate = vm.display.rate
    const caveats = sheet.querySelector('.print-caveats')?.textContent ?? ''

    // A printed page in đồng with no rate on it is a page nobody can check.
    expect(rate).not.toBeNull()
    expect(caveats).toContain(quotedRate(rate?.value ?? 0, displayFor(locale)))
    expect(caveats).toContain(refText(rate?.source ?? { key: '', params: {} }, i18n.t, displayFor(locale)))
    expect(caveats).not.toContain('currency.')
  })
})

describe('the caveats, which are the requirement not to compromise on', () => {
  it.each(LANGS)('carries the rates as-at date and the SRO link in %s', async (locale) => {
    const { sheet, vm } = await renderSheet(locale)
    const caveats = sheet.querySelector('.print-caveats')
    const text = caveats?.textContent ?? ''
    const rates = vm.results.ratesAsAt.value

    expect(text).toContain(i18n.t(rates.linkKey))
    // The year of the as-at date, whichever way the locale writes the date.
    expect(text).toContain(rates.asAt.slice(0, 4))
    expect(caveats?.querySelector(`a[href="${rates.href}"]`)).not.toBeNull()
  })

  it.each(LANGS)('carries the estimate and not-advice disclaimers in %s', async (locale) => {
    const { sheet, vm } = await renderSheet(locale)
    const text = sheet.querySelector('.print-caveats')?.textContent ?? ''

    const note = vm.results.estimateNote.value
      .map((ref) => refText(ref, i18n.t, displayFor(locale)))
      .join(' ')

    expect(text).toContain(note)
    expect(text).toContain(i18n.t(vm.results.sources.value.afterKey))
    // Neither a bare key nor an unfilled placeholder reaches the paper.
    expect(text).not.toContain('money.')
    expect(text).not.toContain('notes.')
    expect(text).not.toContain('{{')
  })

  it('puts the caveats ahead of the line table, so a long table cannot push them off', async () => {
    const { sheet } = await renderSheet('en')
    const caveats = sheet.querySelector('.print-caveats')
    const lines = sheet.querySelector('.print-lines')

    expect(caveats).not.toBeNull()
    expect(lines).not.toBeNull()
    // DOCUMENT_POSITION_FOLLOWING: the table comes after the caveats.
    expect(caveats?.compareDocumentPosition(lines as Node)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })
})

describe('the page the numbers belong to', () => {
  it.each(LANGS)('names the calculator and the price the figures are for, in %s', async (locale) => {
    const { sheet, vm } = await renderSheet(locale)
    const masthead = sheet.querySelector('.print-masthead')?.textContent ?? ''
    const price = vm.inputs.price.value

    expect(masthead).toContain(i18n.t(vm.chrome.title.labelKey))
    expect(price).not.toBeNull()
    // The price is the user's own figure, so it is quoted exactly.
    expect(masthead).toContain(exactMoney(price as number, displayFor(locale)))
    expect(masthead).not.toContain('print.')
  })
})

describe('what the sheet leaves behind', () => {
  it('is hidden on screen, and out of the accessibility tree with it', async () => {
    const { sheet } = await renderSheet('en')
    expect(sheet.hasAttribute('hidden')).toBe(true)
  })

  it('carries no interactive control: no inputs, no switchers, no buttons', async () => {
    const { sheet } = await renderSheet('en')
    expect(sheet.querySelectorAll('input, select, textarea, button, details')).toHaveLength(0)
  })

  it('claims no field of its own, so parity still counts the skin', async () => {
    const { sheet } = await renderSheet('en')
    expect(sheet.querySelectorAll('[data-field]')).toHaveLength(0)
  })
})

describe('the full line table', () => {
  it('follows the figures, one row group per band, ending in the grand total', async () => {
    const { sheet, vm } = await renderSheet('en')
    const bodies = sheet.querySelectorAll('.print-lines tbody')

    // One per band, plus the grand total's own group.
    expect(bodies).toHaveLength(vm.results.lineGroups.length + 1)
    expect(sheet.querySelector('.print-lines tbody:last-child')?.textContent).toContain(
      i18n.t(vm.results.total.labelKey),
    )
  })

  it('prints the auction-day payment guidance, disclosed rather than folded away', async () => {
    const { sheet, vm } = await renderSheet('en')
    const guidance = vm.results.lineGroups.find((group) => group.guidance !== null)?.guidance

    expect(guidance).toBeDefined()
    expect(sheet.querySelector('.print-guidance')?.textContent).toContain(
      i18n.t(guidance?.labelKey ?? ''),
    )
  })
})

describe('the same sheet from every skin', () => {
  it('renders identical markup whichever skin is on screen', async () => {
    const { sheet: fromDefault } = await renderSheet('en', { skinId: 'default' })
    const defaultHtml = fromDefault.outerHTML
    cleanup()
    const { sheet: fromPlain } = await renderSheet('en', { skinId: 'plain' })

    expect(fromPlain.outerHTML).toBe(defaultHtml)
  })
})
