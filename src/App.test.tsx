// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import i18n from './i18n'
import { URL_DEBOUNCE_MS } from './hooks/useUrlState'
import { calculate } from './logic/calculate'
import { APP_CURRENCY } from './logic/currencyConfig'
import { formatMoney } from './logic/format'
import { roundForDisplay } from './logic/rounding'
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

beforeEach(async () => {
  window.history.replaceState(null, '', '/')
  // The i18n instance is a singleton; put it back on the default language so
  // tests are order-independent.
  await i18n.changeLanguage('vi')
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
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

describe('copy link', () => {
  it('copies the current URL and confirms', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...window.navigator, clipboard: { writeText } })
    window.history.replaceState(null, '', '/?route=lmi')
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Sao chép liên kết' }))
    await waitFor(() => expect(screen.getByText('Đã sao chép liên kết')).toBeTruthy())
    expect(writeText).toHaveBeenCalledWith(window.location.href)
    expect(writeText.mock.calls[0][0]).toContain('?route=lmi')
  })

  it('falls back to selectable text when the clipboard is unavailable', async () => {
    vi.stubGlobal('navigator', { ...window.navigator, clipboard: undefined })
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Sao chép liên kết' }))
    await waitFor(() =>
      expect(screen.getByText('Sao chép không thành công — hãy chọn liên kết bên dưới')).toBeTruthy(),
    )
    const fallback = screen.getByLabelText('Liên kết chia sẻ') as HTMLInputElement
    expect(fallback.value).toBe(window.location.href)
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
      roundForDisplay(total.deposit, APP_CURRENCY) +
      roundForDisplay(total.costs, APP_CURRENCY) +
      roundForDisplay(total.moving, APP_CURRENCY) +
      roundForDisplay(total.buffer, APP_CURRENCY)
    // These inputs are chosen so the two roundings actually diverge; the
    // display must follow the exact total.
    expect(roundForDisplay(total.value, APP_CURRENCY)).not.toBe(sumOfRoundedParts)
    expect(document.getElementById('tTotal')?.textContent).toBe(
      `~${formatMoney(total.value, APP_CURRENCY, 'vi')}`,
    )
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
