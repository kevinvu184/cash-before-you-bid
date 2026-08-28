// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../i18n'
import { BASE_CURRENCY } from '../logic/currencyConfig'
import { displayAmount, displaySettings } from '../logic/display'
import { estimateMoney } from '../skins/shared/text'
import { viewModelFixture } from '../testing/viewModelFixture'
import type { ResultsViewModel, VerdictField } from '../types/viewModel'
import { ResultsAnnouncer } from './ResultsAnnouncer'
import { SETTLE_MS } from './useSettledAnnouncement'

// What the live region is for, as behaviour: it reports the settled outcome
// and nothing else. Every "does not announce" case here is a case where the
// naive implementation — aria-live on the verdict itself — would have spoken.

const base = () => viewModelFixture({ locale: 'en', skinId: 'default', resolvedMode: 'light' })

/** Dollars at par: the announcement is about the figures, not the currency. */
const DISPLAY = displaySettings(BASE_CURRENCY, 1)

function withResults(change: (results: ResultsViewModel) => ResultsViewModel): ResultsViewModel {
  return change(base().results)
}

/**
 * The same results with the first verdict set to `status`, as an edit that
 * moved it would leave them. It asserts the flip is real rather than trusting
 * the fixture's starting state: setting a verdict to what it already says
 * would change no signature, and every "it announced" case below would pass
 * for the wrong reason.
 */
function verdictSetTo(results: ResultsViewModel, status: VerdictField['status']) {
  expect(results.verdicts[0].status).not.toBe(status)
  return {
    ...results,
    verdicts: results.verdicts.map((verdict, index) =>
      index === 0 ? { ...verdict, status, value: status === 'covered' ? 0 : 12_345 } : verdict,
    ),
  }
}

/** Whichever way the fixture's first verdict currently reads, the other one. */
const flipped = (results: ResultsViewModel) =>
  verdictSetTo(results, results.verdicts[0].status === 'covered' ? 'short' : 'covered')

const region = () => document.querySelector('p[role="status"]') as HTMLElement

const settle = async (ms = SETTLE_MS) => {
  await act(async () => {
    vi.advanceTimersByTime(ms)
  })
}

beforeEach(async () => {
  vi.useFakeTimers()
  await i18n.changeLanguage('en')
})

afterEach(async () => {
  cleanup()
  vi.useRealTimers()
  await i18n.changeLanguage('vi')
})

describe('the results announcer', () => {
  it('says nothing about the figures the page was loaded with', async () => {
    render(<ResultsAnnouncer display={DISPLAY} results={base().results} />)
    await settle(SETTLE_MS * 4)
    expect(region().textContent).toBe('')
  })

  it('announces the settled verdicts and total once the figures stop moving', async () => {
    const results = base().results
    const { rerender } = render(<ResultsAnnouncer display={DISPLAY} results={results} />)
    rerender(<ResultsAnnouncer display={DISPLAY} results={flipped(results)} />)
    await settle()

    const spoken = region().textContent ?? ''
    expect(spoken).toContain(i18n.t('verdicts.auctionDayLabel'))
    expect(spoken).toContain(i18n.t('verdicts.atSettlementLabel'))
    expect(spoken).toContain(i18n.t('stats.totalLabel'))
    // The total is a figure, not a label, so it has to be in there formatted.
    expect(spoken).toMatch(/111/)
  })

  it('stays silent while the figures are still moving', async () => {
    const results = base().results
    const { rerender } = render(<ResultsAnnouncer display={DISPLAY} results={results} />)
    // Three edits inside one settle window: a keystroke every 300ms, which is
    // what typing a price looks like. The totals are a display unit apart, so
    // each one is a real change to the figure on screen and genuinely restarts
    // the debounce — steps too small to survive the rounding would collapse
    // into one edit and the test would pass without exercising anything.
    for (const amount of [1, 2, 3]) {
      rerender(
        <ResultsAnnouncer
          display={DISPLAY}
          results={{
            ...flipped(results),
            stats: results.stats.map((stat) =>
              stat.id === 'statTotal' ? { ...stat, value: amount * 25_000 } : stat,
            ),
          }}
        />,
      )
      await settle(300)
      expect(region().textContent).toBe('')
    }
    await settle()
    expect(region().textContent).not.toBe('')
  })

  // The signature is figures and outcomes only, so a control that rewrites the
  // words without touching the numbers must not make the region speak.
  it('does not announce when only the language changes', async () => {
    const results = base().results
    const { rerender } = render(<ResultsAnnouncer display={DISPLAY} results={results} />)
    await act(async () => {
      await i18n.changeLanguage('vi')
    })
    rerender(<ResultsAnnouncer display={DISPLAY} results={results} />)
    await settle(SETTLE_MS * 2)
    expect(region().textContent).toBe('')
  })

  it('speaks the language in force when the timer fires, not when it was set', async () => {
    const results = base().results
    const { rerender } = render(<ResultsAnnouncer display={DISPLAY} results={results} />)
    rerender(<ResultsAnnouncer display={DISPLAY} results={flipped(results)} />)
    await settle(SETTLE_MS / 2)
    await act(async () => {
      await i18n.changeLanguage('vi')
    })
    rerender(<ResultsAnnouncer display={DISPLAY} results={flipped(results)} />)
    await settle()
    expect(region().textContent).toContain(i18n.t('verdicts.auctionDayLabel', { lng: 'vi' }))
  })

  // The other side of the language case: a currency switch is not words, it is
  // a different figure for the reader to act on, so it is worth one sentence.
  it('announces the total again when the display currency changes', async () => {
    const results = base().results
    const { rerender } = render(<ResultsAnnouncer display={DISPLAY} results={results} />)
    rerender(
      <ResultsAnnouncer display={displaySettings('VND', 18_700)} results={results} />,
    )
    await settle()

    const spoken = region().textContent ?? ''
    expect(spoken).not.toBe('')
    expect(spoken).toContain(i18n.t('stats.totalLabel'))
    // Converted, not the dollar figure read out under a different symbol.
    expect(spoken).not.toContain(String(base().results.stats[0].value))
  })

  // The rate moves on its own: the quote fetched after a switch to đồng
  // replaces the bundled fallback, and an override replaces either. None of
  // that touches the base-currency amount, so a signature keyed on the amount
  // let the figure on screen change in silence.
  it('announces when the exchange rate moves the figure on screen', async () => {
    const results = base().results
    const vnd = displaySettings('VND', 18_700)
    const { rerender } = render(<ResultsAnnouncer display={vnd} results={results} />)
    rerender(
      <ResultsAnnouncer display={displaySettings('VND', 25_000)} results={results} />,
    )
    await settle()

    const spoken = region().textContent ?? ''
    expect(spoken).not.toBe('')
    expect(spoken).toContain(
      estimateMoney(results.stats[0].value, { ...displaySettings('VND', 25_000), locale: 'en' }),
    )
  })

  // The other half of the same rule, and the reason it is the *rounded* figure
  // that goes in: a re-quote too small to move the đồng's own display unit has
  // not changed what the reader would act on.
  it('stays silent when a new rate rounds to the same figure', async () => {
    const results = base().results
    const rate = 18_700
    const nudged = rate + 0.0001
    const settings = displaySettings('VND', rate)
    expect(displayAmount(results.stats[0].value, displaySettings('VND', nudged))).toBe(
      displayAmount(results.stats[0].value, settings),
    )

    const { rerender } = render(<ResultsAnnouncer display={settings} results={results} />)
    rerender(
      <ResultsAnnouncer display={displaySettings('VND', nudged)} results={results} />,
    )
    await settle(SETTLE_MS * 2)
    expect(region().textContent).toBe('')
  })

  it('is polite and atomic, so the whole sentence is read and nothing is cut off', () => {
    render(<ResultsAnnouncer display={DISPLAY} results={base().results} />)
    expect(region().getAttribute('aria-live')).toBe('polite')
    expect(region().getAttribute('aria-atomic')).toBe('true')
  })

  it('reports a verdict that goes from short to covered', async () => {
    const short = withResults((results) => verdictSetTo(results, 'short'))
    const { rerender } = render(<ResultsAnnouncer display={DISPLAY} results={short} />)
    rerender(<ResultsAnnouncer display={DISPLAY} results={verdictSetTo(short, 'covered')} />)
    await settle()
    expect(region().textContent).toContain(i18n.t('verdicts.covered'))
  })
})
