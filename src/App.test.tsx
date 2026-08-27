// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { URL_DEBOUNCE_MS } from './hooks/useUrlState'

function renderApp() {
  return render(
    <BrowserRouter>
      <App />
    </BrowserRouter>,
  )
}

const input = (label: string) => screen.getByLabelText(label) as HTMLInputElement
const select = (label: string) => screen.getByLabelText(label) as HTMLSelectElement

beforeEach(() => {
  window.history.replaceState(null, '', '/')
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
    expect(input('Purchase price ($)').value).toBe('820000')
    expect(input('Deposit (%)').value).toBe('12')
    expect(select('Deposit route').value).toBe('lmi')
    expect(select('Region').value).toBe('regional')
    expect(input('Capitalise LMI into the loan').checked).toBe(true)
    // Derived output reflects the URL state on first render.
    expect(screen.getByText('12% of $820,000')).toBeTruthy()
  })

  it('falls back to defaults for invalid params and rewrites the URL cleaned', async () => {
    window.history.replaceState(null, '', '/?price=abc&junk=1&route=lmi')
    renderApp()
    expect(input('Purchase price ($)').value).toBe('750000')
    expect(select('Deposit route').value).toBe('lmi')
    await waitFor(() => expect(window.location.search).toBe('?route=lmi'))
  })
})

describe('writing state to the URL', () => {
  it('debounces number input changes into the query string with replace', () => {
    vi.useFakeTimers()
    renderApp()
    fireEvent.change(input('Purchase price ($)'), { target: { value: '900000' } })
    // The input reflects the change immediately, the URL only after ~300ms.
    expect(input('Purchase price ($)').value).toBe('900000')
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
      fireEvent.change(input('Purchase price ($)'), { target: { value } })
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
    fireEvent.change(select('Deposit route'), { target: { value: 'htb' } })
    // Route change resets the deposit to the route default (2% for HTB).
    expect(window.location.search).toBe('?dep=2&route=htb')
    fireEvent.click(input('New home'))
    expect(window.location.search).toBe('?dep=2&newhome=1&route=htb')
  })
})

describe('history behaviour', () => {
  it('steps back and forward through discrete choices and re-renders', async () => {
    renderApp()
    fireEvent.change(select('Deposit route'), { target: { value: 'htb' } })
    fireEvent.change(select('Region'), { target: { value: 'regional' } })
    expect(window.location.search).toBe('?dep=2&region=regional&route=htb')

    window.history.back()
    await waitFor(() => expect(window.location.search).toBe('?dep=2&route=htb'))
    expect(select('Region').value).toBe('metro')
    expect(select('Deposit route').value).toBe('htb')

    window.history.back()
    await waitFor(() => expect(window.location.search).toBe(''))
    expect(select('Deposit route').value).toBe('scheme')
    expect(input('Deposit (%)').value).toBe('5')

    window.history.forward()
    await waitFor(() => expect(window.location.search).toBe('?dep=2&route=htb'))
    expect(select('Deposit route').value).toBe('htb')
    expect(input('Deposit (%)').value).toBe('2')
  })

  it('discards a pending debounced write when navigating back before it flushes', async () => {
    renderApp()
    fireEvent.change(select('Deposit route'), { target: { value: 'htb' } })
    expect(window.location.search).toBe('?dep=2&route=htb')

    // Start a debounced write, then navigate back before the flush.
    fireEvent.change(input('Purchase price ($)'), { target: { value: '900000' } })
    window.history.back()
    await waitFor(() => expect(window.location.search).toBe(''))
    expect(input('Purchase price ($)').value).toBe('750000')

    // The stale write must not fire once the debounce window passes.
    await new Promise((resolve) => setTimeout(resolve, URL_DEBOUNCE_MS + 100))
    expect(window.location.search).toBe('')
    expect(input('Purchase price ($)').value).toBe('750000')
  })
})

describe('copy link', () => {
  it('copies the current URL and confirms', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...window.navigator, clipboard: { writeText } })
    window.history.replaceState(null, '', '/?route=lmi')
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }))
    await waitFor(() => expect(screen.getByText('Link copied')).toBeTruthy())
    expect(writeText).toHaveBeenCalledWith(window.location.href)
    expect(writeText.mock.calls[0][0]).toContain('?route=lmi')
  })

  it('falls back to selectable text when the clipboard is unavailable', async () => {
    vi.stubGlobal('navigator', { ...window.navigator, clipboard: undefined })
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }))
    await waitFor(() =>
      expect(screen.getByText('Copy failed — select the link below')).toBeTruthy(),
    )
    const fallback = screen.getByLabelText('Shareable link') as HTMLInputElement
    expect(fallback.value).toBe(window.location.href)
  })
})
