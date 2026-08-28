// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import i18n from './i18n'
import { URL_DEBOUNCE_MS } from './hooks/useUrlState'
import { calculate } from './logic/calculate'
import { APP_CURRENCY } from './logic/currencyConfig'
import { formatMoney } from './logic/format'
import { roundForDisplay } from './logic/rounding'
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
  it('reads ?bids= into the field and the whole-search figure', () => {
    window.history.replaceState(null, '', '/?bids=5&lang=en')
    renderApp()
    expect(input('bids').value).toBe('5')
    // 1,600 conveyancing + 550 inspection = 2,150 per property and 10,750
    // across five, each shown as the page's rounded estimate.
    expect(field('statSunkPerProperty')?.textContent).toContain('A$2,200')
    expect(field('statSunkSearch')?.textContent).toContain('A$10,800')
  })

  it('offers the numeric keypad for a count of properties', () => {
    renderApp()
    expect(input('bids').inputMode).toBe('numeric')
    expect(input('price').inputMode).toBe('decimal')
  })

  it('leaves the total cash figure alone when the count changes', () => {
    vi.useFakeTimers()
    renderApp()
    const before = document.getElementById('tTotal')?.textContent
    fireEvent.change(input('bids'), { target: { value: '9' } })
    act(() => {
      vi.advanceTimersByTime(URL_DEBOUNCE_MS)
    })
    expect(window.location.search).toBe('?bids=9')
    expect(document.getElementById('tTotal')?.textContent).toBe(before)
  })

  it('renders the panel in Vietnamese too', () => {
    window.history.replaceState(null, '', '/?bids=3')
    renderApp()
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
