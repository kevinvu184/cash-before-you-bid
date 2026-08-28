// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import i18n from './i18n'
import { URL_DEBOUNCE_MS } from './hooks/useUrlState'
import { calculate } from './logic/calculate'
import { APP_CURRENCY } from './logic/currencyConfig'
import { formatMoney } from './logic/format'
import { roundForDisplay } from './logic/rounding'
import { FHB_CONCESSION_CEILING, FHB_EXEMPTION_CEILING } from './data/rates'
import { PRICE_MAX, parseParams } from './logic/urlState'
import { SKINS } from './skins/registry'

// Skins are React.lazy, so the first render resolves a dynamic import before
// anything is on the page. Preloading them here keeps that to a microtask, and
// renderApp awaits it so every assertion below stays as it was.
beforeAll(async () => {
  await Promise.all(Object.values(SKINS).map((skin) => skin.load()))
})

async function renderApp() {
  const result = render(<App />)
  await waitFor(() => expect(document.getElementById('price')).not.toBeNull())
  return result
}

// Fields are found by id: labels are translated, ids are stable.
const input = (id: string) => document.getElementById(id) as HTMLInputElement
const select = (id: string) => document.getElementById(id) as HTMLSelectElement
// Skins mark every rendered field with its FieldId; that is the stable handle.
const field = (id: string) => document.querySelector(`[data-field="${id}"]`)

beforeEach(async () => {
  window.history.replaceState(null, '', '/')
  // The i18n instance is a singleton; put it back on the default language so
  // tests are order-independent.
  await i18n.changeLanguage('vi')
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('loading state from the URL', () => {
  it('renders the state matching a preset query string', async () => {
    window.history.replaceState(
      null,
      '',
      '/?caplmi=1&dep=12&price=820000&region=regional&route=lmi',
    )
    await renderApp()
    expect(input('price').value).toBe('820000')
    expect(input('dep').value).toBe('12')
    expect(select('route').value).toBe('lmi')
    expect(select('region').value).toBe('regional')
    expect(input('caplmi').checked).toBe(true)
    // Derived output reflects the URL state on first render (vi locale).
    expect(screen.getAllByText(/12% của 820\.000/).length).toBeGreaterThan(0)
  })

  it('falls back to defaults for invalid params and rewrites the URL cleaned', async () => {
    window.history.replaceState(null, '', '/?price=abc&junk=1&route=lmi')
    await renderApp()
    expect(input('price').value).toBe('750000')
    expect(select('route').value).toBe('lmi')
    await waitFor(() => expect(window.location.search).toBe('?route=lmi'))
  })
})

describe('writing state to the URL', () => {
  it('debounces number input changes into the query string with replace', async () => {
    await renderApp()
    // Fake timers only once the skin is on the page: the lazy import that puts
    // it there resolves on the real clock.
    vi.useFakeTimers()
    fireEvent.change(input('price'), { target: { value: '900000' } })
    // The input reflects the change immediately, the URL only after ~300ms.
    expect(input('price').value).toBe('900000')
    expect(window.location.search).toBe('')
    act(() => {
      vi.advanceTimersByTime(299)
    })
    expect(window.location.search).toBe('')
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(window.location.search).toBe('?price=900000')
  })

  it('collapses rapid keystrokes into a single URL update', async () => {
    await renderApp()
    // Fake timers only once the skin is on the page: the lazy import that puts
    // it there resolves on the real clock.
    vi.useFakeTimers()
    for (const value of ['9', '90', '900', '9000', '90000', '900000']) {
      fireEvent.change(input('price'), { target: { value } })
      act(() => {
        vi.advanceTimersByTime(100)
      })
    }
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(window.location.search).toBe('?price=900000')
  })

  it('updates the query string immediately for discrete choices', async () => {
    await renderApp()
    fireEvent.change(select('route'), { target: { value: 'htb' } })
    // Route change resets the deposit to the route default (2% for HTB).
    expect(window.location.search).toBe('?route=htb')
    fireEvent.click(input('newhome'))
    expect(window.location.search).toBe('?newhome=1&route=htb')
  })
})

describe('history behaviour', () => {
  it('steps back and forward through discrete choices and re-renders', async () => {
    await renderApp()
    fireEvent.change(select('route'), { target: { value: 'htb' } })
    fireEvent.change(select('region'), { target: { value: 'regional' } })
    expect(window.location.search).toBe('?region=regional&route=htb')

    window.history.back()
    await waitFor(() => expect(window.location.search).toBe('?route=htb'))
    expect(select('region').value).toBe('metro')
    expect(select('route').value).toBe('htb')

    window.history.back()
    await waitFor(() => expect(window.location.search).toBe(''))
    expect(select('route').value).toBe('scheme')
    expect(input('dep').value).toBe('5')

    window.history.forward()
    await waitFor(() => expect(window.location.search).toBe('?route=htb'))
    expect(select('route').value).toBe('htb')
    expect(input('dep').value).toBe('2')
  })

  it('discards a pending debounced write when navigating back before it flushes', async () => {
    await renderApp()
    fireEvent.change(select('route'), { target: { value: 'htb' } })
    expect(window.location.search).toBe('?route=htb')

    // Start a debounced write, then navigate back before the flush.
    fireEvent.change(input('price'), { target: { value: '900000' } })
    window.history.back()
    await waitFor(() => expect(window.location.search).toBe(''))
    expect(input('price').value).toBe('750000')

    // The stale write must not fire once the debounce window passes.
    await new Promise((resolve) => setTimeout(resolve, URL_DEBOUNCE_MS + 100))
    expect(window.location.search).toBe('')
    expect(input('price').value).toBe('750000')
  })
})

describe('rounded estimates', () => {
  it('keeps the full-precision price in the URL after the user enters 1234.56', async () => {
    await renderApp()
    // Fake timers only once the skin is on the page: the lazy import that puts
    // it there resolves on the real clock.
    vi.useFakeTimers()
    fireEvent.change(input('price'), { target: { value: '1234.56' } })
    act(() => {
      vi.advanceTimersByTime(URL_DEBOUNCE_MS)
    })
    // Rounding is display-only: the URL and the input keep what was typed.
    expect(window.location.search).toBe('?price=1234.56')
    expect(input('price').value).toBe('1234.56')
  })

  it('rounds the displayed total from the exact total, not the sum of rounded parts', async () => {
    window.history.replaceState(null, '', '/?dep=12&price=820500&route=lmi')
    await renderApp()
    const state = parseParams(new URLSearchParams(window.location.search))
    const { total } = calculate(state).tiles
    const sumOfRoundedParts =
      roundForDisplay(total.deposit, APP_CURRENCY) +
      roundForDisplay(total.costs, APP_CURRENCY) +
      roundForDisplay(total.moving, APP_CURRENCY) +
      roundForDisplay(total.buffer, APP_CURRENCY)
    // These inputs are chosen so the two roundings actually diverge; the
    // display must follow the exact total.
    expect(roundForDisplay(total.value, APP_CURRENCY)).not.toBe(sumOfRoundedParts)
    expect(
      document.querySelector('[data-field="statTotal"] .stat-value')?.textContent,
    ).toBe(formatMoney(total.value, APP_CURRENCY, 'vi'))
  })

  it('quotes the entered price exactly in the deposit subtitle, but estimates the deposit', async () => {
    // 820,550 rounds up to 820,600 for display, so an estimate and an exact
    // rendering of the same price cannot be confused for one another.
    window.history.replaceState(null, '', '/?price=820550')
    await renderApp()
    const stat = document.querySelector('[data-field="statDeposit"]')
    const exactPrice = formatMoney(820_550, APP_CURRENCY, 'vi', { round: false })
    const roundedPrice = formatMoney(820_550, APP_CURRENCY, 'vi')
    expect(roundedPrice).not.toBe(exactPrice)
    // The price is the user's own input, so the subtitle quotes it exactly...
    expect(stat?.querySelector('.stat-sub')?.textContent).toContain(exactPrice)
    expect(stat?.querySelector('.stat-sub')?.textContent).not.toContain(roundedPrice)
    // ...while the deposit derived from it is a rounded estimate.
    const { deposit } = calculate(parseParams(new URLSearchParams('price=820550'))).tiles
    expect(stat?.querySelector('.stat-value')?.textContent).toBe(
      formatMoney(deposit.value, APP_CURRENCY, 'vi'),
    )
  })

  it('renders negative rows with a typographic minus and no estimate marker', async () => {
    // The First Home Owner Grant row is -10,000 with a new home at the
    // default price. Estimates carry no per-figure "~"; the disclaimer says it.
    window.history.replaceState(null, '', '/?newhome=1')
    await renderApp()
    const cells = Array.from(document.querySelectorAll('td.n')).map((c) => c.textContent)
    expect(cells).toContain('\u221210.000\u00a0AUD')
    expect(cells.some((cell) => cell?.includes('~'))).toBe(false)
  })

  it('shows the estimate disclaimer with the currency rounding unit', async () => {
    await renderApp()
    const note = document.querySelector('.estimate-note')
    expect(note?.textContent).toContain('làm tròn đến 100 AUD gần nhất')
    expect(note?.textContent).toContain(
      'Số tiền dưới 1.000\u00a0AUD được làm tròn đến 10\u00a0AUD gần nhất',
    )
    expect(note?.textContent).toContain('không khớp với tổng do làm tròn')
  })
})

describe('pre-auction spend', () => {
  it('reads ?bids= into the field and the whole-search figure', async () => {
    window.history.replaceState(null, '', '/?bids=5&lang=en')
    await renderApp()
    expect(input('bids').value).toBe('5')
    // 1,600 conveyancing + 550 inspection = 2,150 per property and 10,750
    // across five, each shown as the page's rounded estimate.
    expect(field('statSunkPerProperty')?.textContent).toContain('A$2,200')
    expect(field('statSunkSearch')?.textContent).toContain('A$10,800')
  })

  it('offers the numeric keypad for a count of properties', async () => {
    await renderApp()
    expect(input('bids').inputMode).toBe('numeric')
    expect(input('price').inputMode).toBe('decimal')
  })

  it('quotes a fractional count exactly, not rounded to two decimals', async () => {
    // A hand-edited URL can carry more precision than a two-decimal format
    // shows. The sentence must not disagree with the field or the maths:
    // 2.3333 x 2,150 is what is actually multiplied.
    window.history.replaceState(null, '', '/?bids=2.3333')
    await renderApp()
    // Asserted against the field's own text rather than a literal, so the
    // locale's decimal separator is not baked into the test: the point is
    // that the two never disagree.
    const shown = input('bids').value
    expect(shown).toMatch(/^2[.,]3333$/)
    expect(field('statSunkSearch')?.textContent).toContain(`${shown} `)
  })

  it('leaves the total cash figure alone when the count changes', async () => {
    // Rendered before switching to fake timers: renderApp waits on the lazy
    // skin, and waitFor cannot resolve once the clock is frozen.
    await renderApp()
    vi.useFakeTimers()
    const total = () => field('statTotal')?.textContent
    const before = total()
    expect(before).toBeTruthy()
    fireEvent.change(input('bids'), { target: { value: '9' } })
    act(() => {
      vi.advanceTimersByTime(URL_DEBOUNCE_MS)
    })
    expect(window.location.search).toBe('?bids=9')
    expect(total()).toBe(before)
  })

  it('renders the panel in Vietnamese too', async () => {
    window.history.replaceState(null, '', '/?bids=3')
    await renderApp()
    expect(field('statSunkSearch')?.textContent).toContain('3 căn ×')
    expect(field('sunkFraming')?.textContent).toContain('dù bạn thắng hay thua')
    // The research is cited beside the figures, not presented as ours.
    expect(field('sunkResearch')?.textContent).toContain('Consumer Policy Research Centre')
  })
})

describe('localisation', () => {
  it('renders Vietnamese with ?lang=vi', async () => {
    window.history.replaceState(null, '', '/?lang=vi')
    await renderApp()
    expect(screen.getAllByText('Tổng tiền mặt trước khi trả giá').length).toBeGreaterThan(0)
    expect(screen.getByText('Hình thức đặt cọc')).toBeTruthy()
    await waitFor(() => expect(document.documentElement.lang).toBe('vi'))
    // ?lang=vi is the default, so the canonical URL omits it.
    await waitFor(() => expect(window.location.search).toBe(''))
  })

  it('renders English with ?lang=en', async () => {
    window.history.replaceState(null, '', '/?lang=en')
    await renderApp()
    await waitFor(() =>
      expect(screen.getAllByText('Total cash before you bid').length).toBeGreaterThan(0),
    )
    expect(screen.getByText('Deposit route')).toBeTruthy()
    await waitFor(() => expect(document.documentElement.lang).toBe('en'))
    expect(window.location.search).toBe('?lang=en')
  })

  it('switching language updates ?lang= in the URL and <html lang>', async () => {
    await renderApp()
    expect(screen.getByText('Hình thức đặt cọc')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(window.location.search).toBe('?lang=en')
    await waitFor(() => expect(document.documentElement.lang).toBe('en'))
    await waitFor(() => expect(screen.getByText('Deposit route')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Tiếng Việt' }))
    expect(window.location.search).toBe('')
    await waitFor(() => expect(document.documentElement.lang).toBe('vi'))
    await waitFor(() => expect(screen.getByText('Hình thức đặt cọc')).toBeTruthy())
  })

  it('does not push a history entry when the active language is re-tapped', async () => {
    await renderApp()
    const before = window.history.length
    fireEvent.click(screen.getByRole('button', { name: 'Tiếng Việt' }))
    expect(window.history.length).toBe(before)
    expect(window.location.search).toBe('')
  })

  it('keeps calculator params when the language changes', async () => {
    window.history.replaceState(null, '', '/?price=820000&route=lmi')
    await renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(window.location.search).toBe('?lang=en&price=820000&route=lmi')
  })
})

describe('timing bands in the line table', () => {
  // matchMedia reports no match under jsdom, so these run on the phone layout:
  // two columns, the working behind a per-row disclosure.
  const renderEnglish = async () => {
    window.history.replaceState(null, '', '/?lang=en')
    await renderApp()
    await waitFor(() => expect(screen.getByText('Before the auction')).toBeTruthy())
  }

  it('groups the rows into the four bands, in the order the purchase runs', async () => {
    await renderEnglish()
    const headings = Array.from(document.querySelectorAll('.lines .band-name')).map(
      (el) => el.textContent,
    )
    expect(headings).toEqual([
      'Before the auction',
      'On auction day',
      'At settlement',
      'After settlement',
    ])
    expect(screen.getByText('Spent win or lose')).toBeTruthy()
  })

  it('puts each band in its own row group, headed and closed by its own subtotal', async () => {
    await renderEnglish()
    const bodies = Array.from(document.querySelectorAll('.lines tbody'))
    // Four bands plus the group holding the grand total.
    expect(bodies).toHaveLength(5)
    const auctionDay = bodies[1]
    expect(auctionDay.querySelector('.band-name')?.textContent).toBe('On auction day')
    // The deposit is the only auction-day line: 5% of $750,000.
    expect(auctionDay.querySelector('td.n')?.textContent).toBe(
      formatMoney(37_500, APP_CURRENCY, 'en'),
    )
    expect(auctionDay.querySelector('.band-subtotal td')?.textContent).toBe(
      'Subtotal — on auction day',
    )
    expect(auctionDay.querySelector('.band-subtotal td.n')?.textContent).toBe(
      formatMoney(37_500, APP_CURRENCY, 'en'),
    )
  })

  it('keeps the grand total and drops the flat costs subtotal the bands replace', async () => {
    await renderEnglish()
    const { rows, tiles } = calculate(parseParams(new URLSearchParams(window.location.search)))
    expect(rows.some((row) => row.code === 'costsSubtotal')).toBe(true)
    expect(screen.queryByText('Purchase costs subtotal')).toBeNull()

    const totalRow = document.querySelector('.lines tr.total')
    expect(totalRow?.textContent).toContain('Total cash before you bid')
    expect(totalRow?.querySelector('td.n')?.textContent).toBe(
      formatMoney(tiles.total.value, APP_CURRENCY, 'en'),
    )
  })

  it('bands the conveyancing fee before the auction and says so in the working', async () => {
    await renderEnglish()
    const preAuction = document.querySelectorAll('.lines tbody')[0]
    const conveyancing = screen.getByRole('button', { name: 'Conveyancing incl. disbursements' })
    expect(preAuction.contains(conveyancing)).toBe(true)
    expect(document.getElementById('how-lineConveyancing')?.textContent).toContain(
      'contract review and settlement work, committed before you bid',
    )
  })

  it('keeps a row expandable inside its band, and open across a recalculation', async () => {
    await renderEnglish()
    const disclosure = screen.getByRole('button', { name: 'Stamp duty (land transfer duty)' })
    const formula = document.getElementById('how-lineStampDuty')

    // Rendered whether or not it is open, so aria-controls always resolves.
    expect(disclosure.getAttribute('aria-controls')).toBe('how-lineStampDuty')
    expect(formula).toBeTruthy()
    expect(disclosure.getAttribute('aria-expanded')).toBe('false')
    expect(formula?.closest('tr')?.className).toBe('formula')

    fireEvent.click(disclosure)
    expect(disclosure.getAttribute('aria-expanded')).toBe('true')
    expect(formula?.closest('tr')?.className).toBe('formula shown')

    // A recalculation must not collapse it: the open set is keyed by row code.
    fireEvent.change(input('price'), { target: { value: '900000' } })
    const after = screen.getByRole('button', { name: 'Stamp duty (land transfer duty)' })
    expect(after.getAttribute('aria-expanded')).toBe('true')
    expect(document.getElementById('how-lineStampDuty')?.closest('tr')?.className).toBe(
      'formula shown',
    )
  })
})

describe('the verdict', () => {
  const renderEnglish = async (query = '') => {
    window.history.replaceState(null, '', `/?lang=en${query}`)
    await renderApp()
    await waitFor(() => expect(screen.getByText('Can you cover it?')).toBeTruthy())
  }

  const verdict = (id: string) =>
    document.querySelector(`[data-field='${id}']`) as HTMLElement | null

  it('asks for savings and a pre-approval as primary fields, in front of the assumptions', async () => {
    await renderEnglish()
    // Both are outside the disclosure: the verdict is not reachable without
    // them, so they are not an assumption to be edited if you have quotes.
    expect(document.querySelector('details')?.contains(input('save'))).toBe(false)
    expect(document.querySelector('details')?.contains(input('loan'))).toBe(false)
    // The decimal keypad, not type=number, so a vi user can type separators.
    expect(input('save').getAttribute('inputmode')).toBe('decimal')
    expect(input('loan').getAttribute('inputmode')).toBe('decimal')
    // Labels are visible and bound, not placeholders.
    expect(document.querySelector("label[for='save']")?.textContent).toContain('Savings')
    expect(document.querySelector("label[for='loan']")?.textContent).toContain('Pre-approved')
  })

  it('reports both moments short when nothing has been entered', async () => {
    await renderEnglish()
    expect(verdict('verdictAuctionDay')?.dataset.status).toBe('short')
    expect(verdict('verdictAtSettlement')?.dataset.status).toBe('short')
    // The deposit on the default $750,000 at 5%.
    expect(verdict('verdictAuctionDay')?.textContent).toContain(
      formatMoney(37_500, APP_CURRENCY, 'en'),
    )
  })

  it('turns the day covered once the savings reach the deposit', async () => {
    await renderEnglish('&save=40000')
    expect(verdict('verdictAuctionDay')?.dataset.status).toBe('covered')
    expect(verdict('verdictAuctionDay')?.textContent).toContain('Covered')
    // Settlement is still short: the loan does not fund duty and fees.
    expect(verdict('verdictAtSettlement')?.dataset.status).toBe('short')
  })

  it('leaves the finance check unrun, and says so, with no pre-approval', async () => {
    await renderEnglish('&save=200000')
    const settlement = verdict('verdictAtSettlement')
    expect(settlement?.textContent).toContain('Finance not checked')
    expect(document.querySelector('.flags')?.textContent).toMatch(
      /no pre-approved loan amount entered/i,
    )
  })

  it('runs the finance check once a pre-approval is entered, and names the loan pocket', async () => {
    await renderEnglish('&save=200000&loan=600000')
    const settlement = verdict('verdictAtSettlement')
    expect(settlement?.textContent).not.toContain('Finance not checked')
    expect(settlement?.textContent).toContain('Loan:')
    // The reason it matters at an auction rides along as a flag.
    expect(document.querySelector('.flags')?.textContent).toMatch(
      /no finance clause and no cooling-off period/i,
    )
  })

  it('writes both figures to the query string and reads them back', async () => {
    await renderEnglish()
    vi.useFakeTimers()
    fireEvent.change(input('save'), { target: { value: '95000' } })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(window.location.search).toBe('?lang=en&save=95000')
    fireEvent.change(input('loan'), { target: { value: '700000' } })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(window.location.search).toBe('?lang=en&loan=700000&save=95000')

    // Clearing the pre-approval drops the param rather than writing a zero.
    fireEvent.change(input('loan'), { target: { value: '' } })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(window.location.search).toBe('?lang=en&save=95000')
    expect(input('loan').value).toBe('')
  })
})

describe('the price slider and its duty cliffs', () => {
  const slider = () => input('price-slider')

  // Read from the rate config, never written here: a threshold that moves in
  // src/data/rates.ts must move these assertions with it, or the suite would
  // fail on a config change the feature is designed to follow.
  const threshold = (value: number) =>
    formatMoney(value, APP_CURRENCY, 'en', { round: false })

  const renderAt = async (query: string) => {
    window.history.replaceState(null, '', query)
    await renderApp()
  }

  it('starts on the same price the number field holds', async () => {
    await renderAt('/?lang=en&price=620000')

    expect(slider().value).toBe('620000')
    expect(input('price').value).toBe('620000')
  })

  it('moves the price, and the field and the duty follow it', async () => {
    await renderAt('/?lang=en&fhb=1&ppr=1&price=745000')
    const underTheCliff = field('lineStampDuty')?.textContent

    // Across the concession ceiling, which is the whole reason the markers
    // are there: the same two thousand dollars of bid, either side of it.
    fireEvent.change(slider(), { target: { value: '755000' } })

    expect(input('price').value).toBe('755000')
    expect(field('lineStampDuty')?.textContent).not.toBe(underTheCliff)
  })

  it('does not fight a half-typed figure', async () => {
    await renderAt('/?lang=en&price=620000')
    // A price on its way to 749,000: the draft is what the user typed, and the
    // slider tracks the value it currently parses to rather than rewriting it.
    fireEvent.change(input('price'), { target: { value: '74' } })

    expect(input('price').value).toBe('74')
    fireEvent.change(input('price'), { target: { value: '749000' } })
    expect(input('price').value).toBe('749000')
    expect(slider().value).toBe('749000')
  })

  it('parks at its own end for a price the track cannot reach, and leaves the field alone', async () => {
    await renderAt('/?lang=en&price=620000')
    // Above PRICE_MAX, which the field accepts and does not snap.
    fireEvent.change(input('price'), { target: { value: '200000000' } })

    expect(input('price').value).toBe('200000000')
    // The control states its own limit rather than leaving the browser to
    // clamp a value it was handed out of range.
    expect(slider().value).toBe(String(PRICE_MAX))
    expect(slider().max).toBe(String(PRICE_MAX))
  })

  it('shows both cliffs to an eligible first home buyer', async () => {
    await renderAt('/?lang=en&fhb=1&ppr=1&price=620000')
    const cliffs = field('priceSlider')?.textContent ?? ''

    expect(cliffs).toContain('Exemption ends.')
    expect(cliffs).toContain('Concession ends.')
    expect(cliffs).toContain(threshold(FHB_EXEMPTION_CEILING))
    expect(cliffs).toContain(threshold(FHB_CONCESSION_CEILING))
  })

  it.each([
    ['a foreign purchaser', '/?lang=en&fhb=1&ppr=1&foreign=1&price=620000'],
    ['someone who is not a first home buyer', '/?lang=en&fhb=0&ppr=1&price=620000'],
    ['someone not buying to live in it', '/?lang=en&fhb=1&ppr=0&price=620000'],
  ])('shows no first home buyer cliffs to %s', async (_case, query) => {
    await renderAt(query)
    const cliffs = field('priceSlider')?.textContent ?? ''

    expect(slider()).not.toBeNull()
    expect(cliffs).not.toContain('Exemption ends.')
    expect(cliffs).not.toContain(threshold(FHB_EXEMPTION_CEILING))
  })

  it('takes the cliffs away the moment the purchaser stops being eligible', async () => {
    await renderAt('/?lang=en&fhb=1&ppr=1&price=620000')
    expect(field('priceSlider')?.textContent).toContain('Exemption ends.')

    fireEvent.click(input('foreign'))

    expect(field('priceSlider')?.textContent).not.toContain('Exemption ends.')
  })
})
