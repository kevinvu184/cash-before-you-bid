// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import i18n from './i18n'
import { URL_DEBOUNCE_MS } from './hooks/useUrlState'
import { calculate } from './logic/calculate'
import { BASE_CURRENCY } from './logic/currencyConfig'
import { formatMoney } from './logic/format'
import { roundForDisplay } from './logic/rounding'
import { displayMoney } from './logic/display'
import { parseParams } from './logic/urlState'

function renderApp() {
  return render(
    <BrowserRouter>
      <App />
    </BrowserRouter>,
  )
}

// Fields are found by id: labels are translated, ids are stable.
const input = (id: string) => document.getElementById(id) as HTMLInputElement
const select = (id: string) => document.getElementById(id) as HTMLSelectElement

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
  it('renders the state matching a preset query string', () => {
    window.history.replaceState(
      null,
      '',
      '/?caplmi=1&dep=12&price=820000&region=regional&route=lmi',
    )
    renderApp()
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
    renderApp()
    expect(input('price').value).toBe('750000')
    expect(select('route').value).toBe('lmi')
    await waitFor(() => expect(window.location.search).toBe('?route=lmi'))
  })
})

describe('writing state to the URL', () => {
  it('debounces number input changes into the query string with replace', () => {
    vi.useFakeTimers()
    renderApp()
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

  it('collapses rapid keystrokes into a single URL update', () => {
    vi.useFakeTimers()
    renderApp()
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

  it('updates the query string immediately for discrete choices', () => {
    renderApp()
    fireEvent.change(select('route'), { target: { value: 'htb' } })
    // Route change resets the deposit to the route default (2% for HTB).
    expect(window.location.search).toBe('?route=htb')
    fireEvent.click(input('newhome'))
    expect(window.location.search).toBe('?newhome=1&route=htb')
  })
})

describe('history behaviour', () => {
  it('steps back and forward through discrete choices and re-renders', async () => {
    renderApp()
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
    renderApp()
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
  it('keeps the full-precision price in the URL after the user enters 1234.56', () => {
    vi.useFakeTimers()
    renderApp()
    fireEvent.change(input('price'), { target: { value: '1234.56' } })
    act(() => {
      vi.advanceTimersByTime(URL_DEBOUNCE_MS)
    })
    // Rounding is display-only: the URL and the input keep what was typed.
    expect(window.location.search).toBe('?price=1234.56')
    expect(input('price').value).toBe('1234.56')
  })

  it('rounds the displayed total from the exact total, not the sum of rounded parts', () => {
    window.history.replaceState(null, '', '/?dep=12&price=820500&route=lmi')
    renderApp()
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
    expect(document.getElementById('tTotal')?.textContent).toBe(
      `~${formatMoney(total.value, BASE_CURRENCY, 'vi')}`,
    )
  })

  it('renders negative rows with the minus ahead of the approx prefix', () => {
    // The First Home Owner Grant row is -10,000 with a new home at the
    // default price; the sign applies to the whole approximate amount.
    window.history.replaceState(null, '', '/?newhome=1')
    renderApp()
    const cells = Array.from(document.querySelectorAll('td.n')).map((c) => c.textContent)
    expect(cells).toContain('\u2212~10.000\u00a0AUD')
  })

  it('shows the estimate disclaimer with the currency rounding unit', () => {
    renderApp()
    const note = document.querySelector('.estimate-note')
    expect(note?.textContent).toContain('làm tròn đến 100 AUD gần nhất')
    expect(note?.textContent).toContain('không khớp với tổng do làm tròn')
  })
})

describe('localisation', () => {
  it('renders Vietnamese with ?lang=vi', async () => {
    window.history.replaceState(null, '', '/?lang=vi')
    renderApp()
    expect(screen.getAllByText('Tổng tiền mặt trước khi trả giá').length).toBeGreaterThan(0)
    expect(screen.getByText('Hình thức đặt cọc')).toBeTruthy()
    await waitFor(() => expect(document.documentElement.lang).toBe('vi'))
    // ?lang=vi is the default, so the canonical URL omits it.
    await waitFor(() => expect(window.location.search).toBe(''))
  })

  it('renders English with ?lang=en', async () => {
    window.history.replaceState(null, '', '/?lang=en')
    renderApp()
    await waitFor(() =>
      expect(screen.getAllByText('Total cash before you bid').length).toBeGreaterThan(0),
    )
    expect(screen.getByText('Deposit route')).toBeTruthy()
    await waitFor(() => expect(document.documentElement.lang).toBe('en'))
    expect(window.location.search).toBe('?lang=en')
  })

  it('switching language updates ?lang= in the URL and <html lang>', async () => {
    renderApp()
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

  it('does not push a history entry when the active language is re-tapped', () => {
    renderApp()
    const before = window.history.length
    fireEvent.click(screen.getByRole('button', { name: 'Tiếng Việt' }))
    expect(window.history.length).toBe(before)
    expect(window.location.search).toBe('')
  })

  it('keeps calculator params when the language changes', () => {
    window.history.replaceState(null, '', '/?price=820000&route=lmi')
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(window.location.search).toBe('?lang=en&price=820000&route=lmi')
  })
})

describe('currency switching', () => {
  const switchTo = (name: string) => fireEvent.click(screen.getByRole('radio', { name }))

  it('starts in Australian dollars and asks for no rate at all', () => {
    renderApp()
    expect(screen.getByRole('radio', { name: 'Đô la Úc' })).toHaveProperty('ariaChecked', 'true')
    // The default view never touches the network: nothing needs converting.
    expect(fetch).not.toHaveBeenCalled()
  })

  it('switching to đồng records it in the URL and converts every figure', async () => {
    renderApp()
    switchTo('Đồng Việt Nam')
    expect(window.location.search).toBe('?cur=VND')

    const { total } = calculate(parseParams(new URLSearchParams('cur=VND'))).tiles
    await waitFor(() =>
      expect(document.getElementById('tTotal')?.textContent).toBe(
        `~${displayMoney(total.value, { locale: 'vi', currency: 'VND', rate: LIVE_RATE })}`,
      ),
    )
  })

  it('heads the amount column with the currency on display', async () => {
    renderApp()
    const head = () => document.querySelector('.lines thead th.n')?.textContent
    expect(head()).toBe('AUD')
    switchTo('Đồng Việt Nam')
    await waitFor(() => expect(head()).toBe('₫'))
  })

  it('names the đồng rounding unit in the disclaimer once converting', async () => {
    renderApp()
    switchTo('Đồng Việt Nam')
    await waitFor(() =>
      expect(document.querySelector('.estimate-note')?.textContent).toContain('100.000'),
    )
  })

  it('re-tapping the active currency pushes no history entry', () => {
    renderApp()
    const before = window.history.length
    switchTo('Đô la Úc')
    expect(window.history.length).toBe(before)
    expect(window.location.search).toBe('')
  })

  it('never mixes currencies inside one explanation', async () => {
    // A threshold left as a literal "$600,000" beside a converted amount
    // would render an equation subtracting dollars from đồng.
    window.history.replaceState(null, '', '/?newhome=1&route=lmi')
    renderApp()
    switchTo('Đồng Việt Nam')
    await waitFor(() =>
      expect(document.querySelector('.lines td.n')?.textContent).toContain('₫'),
    )
    const written = [
      ...document.querySelectorAll('.lines td.m, .lines td.n, .stat-value, .stat-sub, .flag-text'),
    ].map((cell) => cell.textContent ?? '')
    expect(written.length).toBeGreaterThan(10)
    for (const text of written) {
      expect(text).not.toMatch(/AUD|A\$/)
    }
  })

  it('leaves the calculator inputs in Australian dollars', async () => {
    window.history.replaceState(null, '', '/?price=820000')
    renderApp()
    switchTo('Đồng Việt Nam')
    await waitFor(() => expect(window.location.search).toBe('?cur=VND&price=820000'))
    // The price field is what the user typed, in the currency they typed it.
    expect(input('price').value).toBe('820000')
  })
})

describe('the exchange rate', () => {
  const switchToDong = () => fireEvent.click(screen.getByRole('radio', { name: 'Đồng Việt Nam' }))

  it('shows the live rate and where it came from', async () => {
    renderApp()
    switchToDong()
    await waitFor(() =>
      expect(document.querySelector('.ratebtn')?.textContent).toContain('exchangerate-api.com'),
    )
    expect(document.querySelector('.ratebtn')?.textContent).toContain('18.708')
  })

  it('falls back to the indicative rate when the request fails, and says so', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
    renderApp()
    switchToDong()
    await waitFor(() =>
      expect(document.querySelector('.ratebtn')?.textContent).toContain('ngoại tuyến'),
    )
    // A figure is still on screen: the fallback rate priced it.
    expect(document.getElementById('tTotal')?.textContent).toContain('₫')
  })

  it('still converts when the response is not a usable quote', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ result: 'error' }) } as Response)),
    )
    renderApp()
    switchToDong()
    await waitFor(() =>
      expect(document.querySelector('.ratebtn')?.textContent).toContain('ngoại tuyến'),
    )
  })

  it('applies a typed override, marks it, and carries it in the URL', async () => {
    renderApp()
    switchToDong()
    await waitFor(() => expect(document.querySelector('.ratebtn')).toBeTruthy())

    fireEvent.click(document.querySelector('.ratebtn') as HTMLButtonElement)
    const field = document.querySelector('.re-row input') as HTMLInputElement
    fireEvent.change(field, { target: { value: '20000' } })
    fireEvent.submit(document.querySelector('.rateedit') as HTMLFormElement)

    await waitFor(() => expect(window.location.search).toBe('?cur=VND&fx=20000'))
    expect(document.querySelector('.rateline .tag')?.textContent).toBe('THỦ CÔNG')

    const { total } = calculate(parseParams(new URLSearchParams('cur=VND'))).tiles
    expect(document.getElementById('tTotal')?.textContent).toBe(
      `~${displayMoney(total.value, { locale: 'vi', currency: 'VND', rate: 20_000 })}`,
    )
  })

  it('reads an override typed with Vietnamese separators', async () => {
    renderApp()
    switchToDong()
    await waitFor(() => expect(document.querySelector('.ratebtn')).toBeTruthy())

    fireEvent.click(document.querySelector('.ratebtn') as HTMLButtonElement)
    fireEvent.change(document.querySelector('.re-row input') as HTMLInputElement, {
      target: { value: '20.500' },
    })
    fireEvent.submit(document.querySelector('.rateedit') as HTMLFormElement)
    await waitFor(() => expect(window.location.search).toBe('?cur=VND&fx=20500'))
  })

  it('resets an override back to the fetched rate', async () => {
    window.history.replaceState(null, '', '/?cur=VND&fx=20000')
    renderApp()
    await waitFor(() => expect(document.querySelector('.rateline .tag')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Đặt lại' }))
    await waitFor(() => expect(window.location.search).toBe('?cur=VND'))
    expect(document.querySelector('.rateline .tag')).toBeNull()
  })

  it('ignores an unusable override rather than pricing anything at zero', async () => {
    renderApp()
    switchToDong()
    await waitFor(() => expect(document.querySelector('.ratebtn')).toBeTruthy())

    fireEvent.click(document.querySelector('.ratebtn') as HTMLButtonElement)
    fireEvent.change(document.querySelector('.re-row input') as HTMLInputElement, {
      target: { value: '0' },
    })
    fireEvent.submit(document.querySelector('.rateedit') as HTMLFormElement)

    await waitFor(() => expect(document.querySelector('.rateedit')).toBeNull())
    expect(window.location.search).toBe('?cur=VND')
  })

  it('reproduces a shared converted view exactly, rate and all', async () => {
    window.history.replaceState(null, '', '/?cur=VND&fx=17500&price=900000')
    renderApp()
    const { total } = calculate(parseParams(new URLSearchParams('cur=VND&price=900000'))).tiles
    await waitFor(() =>
      expect(document.getElementById('tTotal')?.textContent).toBe(
        `~${displayMoney(total.value, { locale: 'vi', currency: 'VND', rate: 17_500 })}`,
      ),
    )
  })

  it('does not go back to the network for a rate cached this session', async () => {
    const { unmount } = renderApp()
    fireEvent.click(screen.getByRole('radio', { name: 'Đồng Việt Nam' }))
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    unmount()

    window.history.replaceState(null, '', '/?cur=VND')
    renderApp()
    await waitFor(() =>
      expect(document.querySelector('.ratebtn')?.textContent).toContain('18.708'),
    )
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
