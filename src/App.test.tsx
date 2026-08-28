// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import i18n from './i18n'
import { URL_DEBOUNCE_MS } from './hooks/useUrlState'
import { calculate } from './logic/calculate'
import { BASE_CURRENCY } from './logic/currencyConfig'
import { formatMoney } from './logic/format'
import { roundForDisplay } from './logic/rounding'
import { displayMoney } from './logic/display'
import { parseParams } from './logic/urlState'
import { SKINS } from './skins/registry'

// Skins are React.lazy, so the first render resolves a dynamic import before
// anything is on the page. Preloading them here keeps that to a microtask, and
// renderApp awaits it so every assertion below stays as it was.
beforeAll(async () => {
  await Promise.all(Object.values(SKINS).map((skin) => skin.load()))
})

async function renderApp() {
  const result = render(
    <BrowserRouter>
      <App />
    </BrowserRouter>,
  )
  await waitFor(() => expect(document.getElementById('price')).not.toBeNull())
  return result
}

// Fields are found by id: labels are translated, ids are stable.
const input = (id: string) => document.getElementById(id) as HTMLInputElement
const select = (id: string) => document.getElementById(id) as HTMLSelectElement
// Skins mark every rendered field with its FieldId; that is the stable handle.
const field = (id: string) => document.querySelector(`[data-field="${id}"]`)

// The rate fetch is the one thing on this page that leaves the browser. Tests
// answer it themselves: a real request would make the figures depend on the
// day's market, and the offline case has to be reachable on purpose.
const LIVE_RATE = 18_707.672741
const QUOTED_AT = 1_787_788_951

function mockRateResponse() {
  return vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          result: 'success',
          base_code: 'AUD',
          time_last_update_unix: QUOTED_AT,
          rates: { AUD: 1, VND: LIVE_RATE },
        }),
    } as Response),
  )
}

beforeEach(async () => {
  window.history.replaceState(null, '', '/')
  localStorage.clear()
  vi.stubGlobal('fetch', mockRateResponse())
  // The i18n instance is a singleton; put it back on the default language so
  // tests are order-independent.
  await i18n.changeLanguage('vi')
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
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

    // The fields are asserted inside the wait, not after it: the URL changes
    // on popstate, a beat before React has re-rendered from it, so waiting on
    // location alone and then reading the DOM is a race.
    window.history.back()
    await waitFor(() => {
      expect(window.location.search).toBe('?route=htb')
      expect(select('region').value).toBe('metro')
      expect(select('route').value).toBe('htb')
    })

    window.history.back()
    await waitFor(() => {
      expect(window.location.search).toBe('')
      expect(select('route').value).toBe('scheme')
      expect(input('dep').value).toBe('5')
    })

    window.history.forward()
    await waitFor(() => {
      expect(window.location.search).toBe('?route=htb')
      expect(select('route').value).toBe('htb')
      expect(input('dep').value).toBe('2')
    })
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
      roundForDisplay(total.deposit, BASE_CURRENCY) +
      roundForDisplay(total.costs, BASE_CURRENCY) +
      roundForDisplay(total.moving, BASE_CURRENCY) +
      roundForDisplay(total.buffer, BASE_CURRENCY)
    // These inputs are chosen so the two roundings actually diverge; the
    // display must follow the exact total.
    expect(roundForDisplay(total.value, BASE_CURRENCY)).not.toBe(sumOfRoundedParts)
    expect(
      document.querySelector('[data-field="statTotal"] .stat-value')?.textContent,
    ).toBe(formatMoney(total.value, BASE_CURRENCY, 'vi'))
  })

  it('quotes the entered price exactly in the deposit subtitle, but estimates the deposit', async () => {
    // 820,550 rounds up to 820,600 for display, so an estimate and an exact
    // rendering of the same price cannot be confused for one another.
    window.history.replaceState(null, '', '/?price=820550')
    await renderApp()
    const stat = document.querySelector('[data-field="statDeposit"]')
    const exactPrice = formatMoney(820_550, BASE_CURRENCY, 'vi', { round: false })
    const roundedPrice = formatMoney(820_550, BASE_CURRENCY, 'vi')
    expect(roundedPrice).not.toBe(exactPrice)
    // The price is the user's own input, so the subtitle quotes it exactly...
    expect(stat?.querySelector('.stat-sub')?.textContent).toContain(exactPrice)
    expect(stat?.querySelector('.stat-sub')?.textContent).not.toContain(roundedPrice)
    // ...while the deposit derived from it is a rounded estimate.
    const { deposit } = calculate(parseParams(new URLSearchParams('price=820550'))).tiles
    expect(stat?.querySelector('.stat-value')?.textContent).toBe(
      formatMoney(deposit.value, BASE_CURRENCY, 'vi'),
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
      formatMoney(37_500, BASE_CURRENCY, 'en'),
    )
    expect(auctionDay.querySelector('.band-subtotal td')?.textContent).toBe(
      'Subtotal — on auction day',
    )
    expect(auctionDay.querySelector('.band-subtotal td.n')?.textContent).toBe(
      formatMoney(37_500, BASE_CURRENCY, 'en'),
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
      formatMoney(tiles.total.value, BASE_CURRENCY, 'en'),
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
      formatMoney(37_500, BASE_CURRENCY, 'en'),
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

// ── the display currency switch ──────────────────────────────────────────────

const switchTo = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const DONG = 'Đồng Việt Nam'
const DOLLARS = 'Đô la Úc'
const total = () => document.querySelector('[data-field="statTotal"] .stat-value')?.textContent
const rateLine = () => document.querySelector('.ratebtn')?.textContent

/** Every money figure the results put on the page, as rendered. */
const writtenFigures = () =>
  [
    ...document.querySelectorAll(
      '.lines td.n, .lines td.m, .stat-value, .stat-sub, .flag-text, .verdict-summary',
    ),
  ].map((cell) => cell.textContent ?? '')

describe('currency switching', () => {
  it('starts in Australian dollars and asks for no rate at all', async () => {
    await renderApp()
    expect(screen.getByRole('button', { name: DOLLARS })).toHaveProperty(
      'ariaPressed',
      'true',
    )
    // The default view never touches the network: nothing needs converting.
    expect(fetch).not.toHaveBeenCalled()
    // And with no conversion in force there is no rate line to quote one.
    expect(field('exchangeRate')).toBeNull()
  })

  it('switching to đồng records it in the URL and converts every figure', async () => {
    await renderApp()
    switchTo(DONG)
    expect(window.location.search).toBe('?cur=VND')

    const { total: tile } = calculate(parseParams(new URLSearchParams())).tiles
    await waitFor(() =>
      expect(total()).toBe(
        displayMoney(tile.value, { locale: 'vi', currency: 'VND', rate: LIVE_RATE }),
      ),
    )
  })

  it('heads the amount column with the currency on display', async () => {
    await renderApp()
    const head = () => document.querySelector('.lines thead th.n')?.textContent
    expect(head()).toBe('AUD')
    switchTo(DONG)
    await waitFor(() => expect(head()).toBe('₫'))
  })

  it('names the đồng rounding units in the disclaimer once converting', async () => {
    await renderApp()
    switchTo(DONG)
    // Both the main unit and the finer one used below the threshold are the
    // đồng's own, straight from the config — never the dollar's converted.
    await waitFor(() =>
      expect(document.querySelector('.estimate-note')?.textContent).toContain(
        'làm tròn đến 100.000\u00a0₫ gần nhất',
      ),
    )
    expect(document.querySelector('.estimate-note')?.textContent).toContain(
      'Số tiền dưới 1.000.000\u00a0₫ được làm tròn đến 10.000\u00a0₫ gần nhất',
    )
  })

  it('re-tapping the active currency pushes no history entry', async () => {
    await renderApp()
    const before = window.history.length
    switchTo(DOLLARS)
    expect(window.history.length).toBe(before)
    expect(window.location.search).toBe('')
  })

  it('never mixes currencies inside one explanation', async () => {
    // A threshold left as a literal "$600,000" beside a converted amount
    // would render an equation subtracting dollars from đồng.
    window.history.replaceState(null, '', '/?newhome=1&route=lmi')
    await renderApp()
    switchTo(DONG)
    await waitFor(() => expect(document.querySelector('.lines td.n')?.textContent).toContain('₫'))
    const written = writtenFigures()
    expect(written.length).toBeGreaterThan(10)
    for (const text of written) {
      expect(text).not.toMatch(/AUD|A\$/)
    }
  })

  it('writes a zero exactly rather than as an estimate once converting', async () => {
    // A price under the exemption cap makes the duty explanation end "→ 0".
    // Zero is the one figure a rate cannot make approximate, so it is written
    // exactly where the converted thresholds beside it are rounded.
    window.history.replaceState(null, '', '/?price=500000')
    await renderApp()
    switchTo(DONG)
    await waitFor(() => expect(document.querySelector('.lines td.n')?.textContent).toContain('₫'))
    const exemption = [...document.querySelectorAll('.lines td.m')]
      .map((cell) => cell.textContent ?? '')
      .find((text) => text.includes('Miễn thuế'))
    expect(exemption).toBeDefined()
    expect(exemption).toContain('→ 0\u00a0₫')
  })

  it('leaves the calculator inputs in Australian dollars', async () => {
    window.history.replaceState(null, '', '/?price=820000')
    await renderApp()
    switchTo(DONG)
    await waitFor(() => expect(window.location.search).toBe('?cur=VND&price=820000'))
    // The price field is what the user typed, in the currency they typed it.
    expect(input('price').value).toBe('820000')
  })

  it('writes dollars exactly as it did before the switch existed', async () => {
    // The conversion is a no-op for the base currency, whatever rate is in the
    // URL: every figure still comes out of formatMoney untouched.
    // The default price keeps the grant row, whose credit is the one figure
    // with a sign to lose in translation.
    window.history.replaceState(null, '', '/?fx=20000&newhome=1')
    await renderApp()
    const { tiles } = calculate(parseParams(new URLSearchParams('newhome=1')))
    expect(total()).toBe(formatMoney(tiles.total.value, BASE_CURRENCY, 'vi'))
    const cells = [...document.querySelectorAll('.lines td.n')].map((c) => c.textContent)
    expect(cells).toContain('\u221210.000\u00a0AUD')
    // A rate riding in the URL prices nothing while dollars are on display.
    for (const text of writtenFigures()) expect(text).not.toContain('₫')
  })
})

describe('the exchange rate', () => {
  it('shows the live rate and where it came from', async () => {
    await renderApp()
    switchTo(DONG)
    await waitFor(() => expect(rateLine()).toContain('exchangerate-api.com'))
    expect(rateLine()).toContain('18.708')
  })

  it('falls back to the indicative rate when the request fails, and says so', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
    await renderApp()
    switchTo(DONG)
    await waitFor(() => expect(rateLine()).toContain('ngoại tuyến'))
    // A figure is still on screen: the fallback rate priced it.
    expect(total()).toContain('₫')
  })

  it('still converts when the response is not a usable quote', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve({ result: 'error' }) } as Response),
      ),
    )
    await renderApp()
    switchTo(DONG)
    await waitFor(() => expect(rateLine()).toContain('ngoại tuyến'))
    expect(total()).toContain('₫')
  })

  it('says the page fetches the rate, and from whom', async () => {
    await renderApp()
    switchTo(DONG)
    await waitFor(() => expect(field('exchangeRate')).not.toBeNull())
    const note = document.querySelector('.curnote')?.textContent ?? ''
    expect(note).toContain('exchangerate-api.com')
  })

  it('applies a typed override, marks it, and carries it in the URL', async () => {
    await renderApp()
    switchTo(DONG)
    await waitFor(() => expect(document.querySelector('.ratebtn')).toBeTruthy())

    fireEvent.click(document.querySelector('.ratebtn') as HTMLButtonElement)
    fireEvent.change(document.querySelector('.re-row input') as HTMLInputElement, {
      target: { value: '20000' },
    })
    fireEvent.submit(document.querySelector('.rateedit') as HTMLFormElement)

    await waitFor(() => expect(window.location.search).toBe('?cur=VND&fx=20000'))
    expect(document.querySelector('.rateline .tag')?.textContent).toBe('THỦ CÔNG')

    const { total: tile } = calculate(parseParams(new URLSearchParams())).tiles
    expect(total()).toBe(
      displayMoney(tile.value, { locale: 'vi', currency: 'VND', rate: 20_000 }),
    )
  })

  it('reads an override typed with Vietnamese separators', async () => {
    await renderApp()
    switchTo(DONG)
    await waitFor(() => expect(document.querySelector('.ratebtn')).toBeTruthy())

    fireEvent.click(document.querySelector('.ratebtn') as HTMLButtonElement)
    fireEvent.change(document.querySelector('.re-row input') as HTMLInputElement, {
      target: { value: '20.500' },
    })
    fireEvent.submit(document.querySelector('.rateedit') as HTMLFormElement)
    await waitFor(() => expect(window.location.search).toBe('?cur=VND&fx=20500'))
  })

  it('treats opening the override and applying it unedited as no edit at all', async () => {
    // The box is seeded with the rate as shown — whole units — while the live
    // quote has decimals. Applying that back must not pin the provider's rate
    // as the reader's own, nor nudge every figure by the rounding.
    await renderApp()
    switchTo(DONG)
    await waitFor(() => expect(rateLine()).toContain('exchangerate-api.com'))
    const before = total()
    const entries = window.history.length

    fireEvent.click(document.querySelector('.ratebtn') as HTMLButtonElement)
    fireEvent.submit(document.querySelector('.rateedit') as HTMLFormElement)

    await waitFor(() => expect(document.querySelector('.rateedit')).toBeNull())
    expect(window.location.search).toBe('?cur=VND')
    expect(window.history.length).toBe(entries)
    expect(document.querySelector('.rateline .tag')).toBeNull()
    expect(rateLine()).toContain('exchangerate-api.com')
    expect(total()).toBe(before)
  })

  it('still applies an override that differs from the rate on screen', async () => {
    // The guard above must not swallow a real edit: one đồng away from the
    // seeded figure is a deliberate, if pointless, change.
    await renderApp()
    switchTo(DONG)
    await waitFor(() => expect(document.querySelector('.ratebtn')).toBeTruthy())

    fireEvent.click(document.querySelector('.ratebtn') as HTMLButtonElement)
    fireEvent.change(document.querySelector('.re-row input') as HTMLInputElement, {
      target: { value: '18709' },
    })
    fireEvent.submit(document.querySelector('.rateedit') as HTMLFormElement)

    await waitFor(() => expect(window.location.search).toBe('?cur=VND&fx=18709'))
    expect(document.querySelector('.rateline .tag')?.textContent).toBe('THỦ CÔNG')
  })

  it('stores a typed override at the precision it shows it at', async () => {
    // A vi reader can type a decimal; the rate line has no room for it, so the
    // figures must not be priced at one the page never shows.
    await renderApp()
    switchTo(DONG)
    await waitFor(() => expect(document.querySelector('.ratebtn')).toBeTruthy())

    fireEvent.click(document.querySelector('.ratebtn') as HTMLButtonElement)
    fireEvent.change(document.querySelector('.re-row input') as HTMLInputElement, {
      target: { value: '20000,4' },
    })
    fireEvent.submit(document.querySelector('.rateedit') as HTMLFormElement)

    await waitFor(() => expect(window.location.search).toBe('?cur=VND&fx=20000'))
    const { total: tile } = calculate(parseParams(new URLSearchParams())).tiles
    expect(total()).toBe(
      displayMoney(tile.value, { locale: 'vi', currency: 'VND', rate: 20_000 }),
    )
  })

  it('ignores an unusable override rather than pricing anything at zero', async () => {
    await renderApp()
    switchTo(DONG)
    await waitFor(() => expect(document.querySelector('.ratebtn')).toBeTruthy())

    fireEvent.click(document.querySelector('.ratebtn') as HTMLButtonElement)
    fireEvent.change(document.querySelector('.re-row input') as HTMLInputElement, {
      target: { value: '0' },
    })
    fireEvent.submit(document.querySelector('.rateedit') as HTMLFormElement)

    await waitFor(() => expect(document.querySelector('.rateedit')).toBeNull())
    expect(window.location.search).toBe('?cur=VND')
  })

  it('hands focus back to the rate line whichever way the override closes', async () => {
    // The form unmounts on close, taking the focused control with it. Without
    // putting focus back on the control that opened it, a keyboard reader is
    // dropped on <body> and has to tab from the top of the document.
    await renderApp()
    switchTo(DONG)
    await waitFor(() => expect(document.querySelector('.ratebtn')).toBeTruthy())
    const button = document.querySelector('.ratebtn') as HTMLButtonElement

    for (const close of [
      // Apply, with a figure that changes nothing, so the rate line survives.
      () => fireEvent.submit(document.querySelector('.rateedit') as HTMLFormElement),
      () => fireEvent.click(screen.getByRole('button', { name: 'Hủy' })),
      () =>
        fireEvent.keyDown(document.querySelector('.re-row input') as HTMLInputElement, {
          key: 'Escape',
        }),
    ]) {
      fireEvent.click(button)
      await waitFor(() =>
        expect(document.activeElement).toBe(document.querySelector('.re-row input')),
      )
      close()
      await waitFor(() => expect(document.querySelector('.rateedit')).toBeNull())
      expect(document.activeElement).toBe(button)
    }
  })

  it('resets an override back to the fetched rate', async () => {
    window.history.replaceState(null, '', '/?cur=VND&fx=20000')
    await renderApp()
    await waitFor(() => expect(document.querySelector('.rateline .tag')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Đặt lại' }))
    await waitFor(() => expect(window.location.search).toBe('?cur=VND'))
    expect(document.querySelector('.rateline .tag')).toBeNull()
  })

  it('pairs the override label with the control by the id the core handed it', async () => {
    // The view model names the stable id; both skins use it, so the label and
    // the control cannot come apart and the DOM handle is the same either way.
    await renderApp()
    switchTo(DONG)
    await waitFor(() => expect(document.querySelector('.ratebtn')).toBeTruthy())
    fireEvent.click(document.querySelector('.ratebtn') as HTMLButtonElement)

    const box = document.querySelector('.re-row input') as HTMLInputElement
    const label = document.querySelector('.rateedit label') as HTMLLabelElement
    expect(box.id).not.toBe('')
    expect(label.htmlFor).toBe(box.id)
    expect(document.getElementById(box.id)).toBe(box)
  })

  it('points aria-controls at the override form only while it exists', async () => {
    await renderApp()
    switchTo(DONG)
    await waitFor(() => expect(document.querySelector('.ratebtn')).toBeTruthy())
    const button = document.querySelector('.ratebtn') as HTMLButtonElement
    // Collapsed: no reference, because the form it would name is not rendered.
    expect(button.getAttribute('aria-controls')).toBeNull()

    fireEvent.click(button)
    const controls = button.getAttribute('aria-controls')
    expect(controls).not.toBeNull()
    // Expanded: the reference resolves to a node actually in the document.
    expect(document.getElementById(controls as string)).not.toBeNull()
  })

  it('keeps a manual rate through a round trip back to dollars', async () => {
    // The override survives toggling to dollars and back rather than being
    // dropped from the URL: someone checking the dollar figure mid-plan should
    // not have to retype the rate their bank quoted them. It cannot mislead
    // while dollars are shown — conversion is skipped for the base currency —
    // and the MANUAL chip reappears with it.
    window.history.replaceState(null, '', '/?cur=VND&fx=20000')
    await renderApp()
    const converted = total()

    switchTo(DOLLARS)
    await waitFor(() => expect(window.location.search).toBe('?fx=20000'))
    expect(total()).not.toBe(converted)
    expect(total()).toContain('AUD')

    switchTo(DONG)
    await waitFor(() => expect(window.location.search).toBe('?cur=VND&fx=20000'))
    expect(total()).toBe(converted)
    expect(screen.getByText('THỦ CÔNG')).toBeTruthy()
  })

  it('reproduces a shared converted view exactly, rate and all', async () => {
    window.history.replaceState(null, '', '/?cur=VND&fx=17500&price=900000')
    await renderApp()
    const { total: tile } = calculate(parseParams(new URLSearchParams('price=900000'))).tiles
    await waitFor(() =>
      expect(total()).toBe(
        displayMoney(tile.value, { locale: 'vi', currency: 'VND', rate: 17_500 }),
      ),
    )
  })

  it('does not go back to the network for a rate cached this session', async () => {
    const { unmount } = await renderApp()
    switchTo(DONG)
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    unmount()

    window.history.replaceState(null, '', '/?cur=VND')
    await renderApp()
    await waitFor(() => expect(rateLine()).toContain('18.708'))
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
