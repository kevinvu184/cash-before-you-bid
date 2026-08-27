// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useNumericDraft } from './useNumericDraft'

afterEach(cleanup)

// Stands in for the calculator: whatever the field sends becomes the next
// value, unless `transform` rewrites it the way the deposit minimums do.
function renderField(initial: number, transform: (n: number) => number = (n) => n) {
  const onChange = vi.fn()
  const view = renderHook(
    ({ value }) => useNumericDraft(value, onChange),
    { initialProps: { value: initial } },
  )
  const type = (raw: string) => {
    act(() => view.result.current.onDraftChange(raw))
    const sent = onChange.mock.calls.at(-1)?.[0] as number
    view.rerender({ value: transform(sent) })
  }
  return { view, onChange, type, draft: () => view.result.current.draft }
}

describe('useNumericDraft', () => {
  it('keeps a half-typed decimal instead of collapsing it', () => {
    const { type, draft, onChange } = renderField(6.2)
    type('6.')
    // Number('6.') is 6, so a plain controlled input would redisplay "6" and
    // make the next keystroke impossible to type.
    expect(draft()).toBe('6.')
    expect(onChange).toHaveBeenLastCalledWith(6)
    type('6.5')
    expect(draft()).toBe('6.5')
    expect(onChange).toHaveBeenLastCalledWith(6.5)
  })

  it('leaves an emptied field empty and counts it as zero', () => {
    const { type, draft, onChange } = renderField(750000)
    type('')
    expect(draft()).toBe('')
    expect(onChange).toHaveBeenLastCalledWith(0)
  })

  it('follows the calculator when it rewrites the value', () => {
    // The 5% Deposit Scheme clamps anything below 5 back up to it.
    const { type, draft } = renderField(5, (n) => Math.max(5, n))
    type('3')
    expect(draft()).toBe('5')
  })

  it('follows an external change, such as the back button', () => {
    const { view, draft } = renderField(750000)
    act(() => view.result.current.onDraftChange('900000'))
    view.rerender({ value: 900000 })
    expect(draft()).toBe('900000')
    // History moves the URL out from under the pending draft.
    view.rerender({ value: 750000 })
    expect(draft()).toBe('750000')
  })

  it('does not disturb a draft that still means the same number', () => {
    const { view, draft } = renderField(12)
    act(() => view.result.current.onDraftChange('12.'))
    view.rerender({ value: 12 })
    expect(draft()).toBe('12.')
  })
})
