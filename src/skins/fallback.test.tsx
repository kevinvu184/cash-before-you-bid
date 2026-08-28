// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import i18n from '../i18n'
import { TOKEN_CSS_VARS } from '../logic/theme'
import { tokens as plainTokens } from './plain/tokens'

// The default skin's chunk cannot load in this file. The plain baseline has to
// take over completely — attribute, tokens and components together — because a
// skin's stylesheet is scoped to its own [data-skin]: swapping the components
// alone would put the baseline's markup under the failed skin's attribute,
// matching no stylesheet at all.
vi.mock('./default', () => {
  throw new Error('chunk load failed')
})

const root = () => document.documentElement

let consoleError: ReturnType<typeof vi.spyOn>

beforeAll(() => {
  // React logs the caught error itself; the boundary logs it too.
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterAll(() => {
  consoleError.mockRestore()
})

beforeEach(async () => {
  window.history.replaceState(null, '', '/?lang=en')
  await i18n.changeLanguage('en')
})

afterEach(async () => {
  cleanup()
  await i18n.changeLanguage('vi')
})

describe('a skin that fails to load', () => {
  it('falls back to plain, and paints plain’s attribute and tokens', async () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>,
    )

    // The URL still asks for the default skin...
    expect(window.location.search).toBe('?lang=en')
    // ...but plain is what renders, and the root agrees with it, so plain's
    // [data-skin='plain'] stylesheet applies.
    await waitFor(() => expect(root().dataset.skin).toBe('plain'))
    expect(root().style.getPropertyValue(TOKEN_CSS_VARS.colorBg)).toBe(plainTokens.light.colorBg)
    expect(root().style.getPropertyValue(TOKEN_CSS_VARS.radiusSm)).toBe(plainTokens.light.radiusSm)

    // The page is the working baseline, not a blank screen.
    await waitFor(() => expect(document.getElementById('price')).not.toBeNull())
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy()
    expect(document.querySelectorAll('[data-field]').length).toBeGreaterThan(0)
  })
})
