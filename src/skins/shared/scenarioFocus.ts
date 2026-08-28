import { useCallback, useEffect, useRef } from 'react'
import type { ScenarioRowMode } from '../../types/viewModel'

/**
 * Keeping focus with the reader while a saved-scenario row changes shape.
 *
 * A row is one of three things — a load control with rename and delete beside
 * it, a rename form, or a delete confirmation — and choosing one unmounts the
 * control that was activated to choose it. A pointer user never notices. A
 * keyboard user was dropped on `<body>` and had to tab back through the whole
 * page to reach the row again, which is WCAG 2.4.3 by way of having nowhere
 * for focus to go. Nothing here changes what the row does; it only says where
 * focus lands afterwards.
 */

/**
 * Attach the returned ref to whichever control should hold focus in the
 * current mode — the rename box while renaming, the confirm while confirming,
 * the rename button back at rest — and focus follows the row as it changes.
 *
 * Only on a change: a row that mounts in a mode it was already in (the panel
 * being opened, a re-render, another row being edited) leaves focus alone.
 */
export function useRowModeFocus(mode: ScenarioRowMode) {
  const target = useRef<HTMLElement | null>(null)
  const previous = useRef(mode)

  useEffect(() => {
    if (previous.current === mode) return
    previous.current = mode
    target.current?.focus()
  }, [mode])

  return useCallback((element: HTMLElement | null) => {
    target.current = element
  }, [])
}

/**
 * The one transition a row cannot handle itself: confirming a delete unmounts
 * the row, so there is no element left to move focus to. The panel catches it
 * — only on a removal, never on a save — and puts focus on the name box, which
 * is always there and names the panel the reader is still standing in.
 */
export function useFocusAfterRemoval(count: number, controlId: string) {
  const previous = useRef(count)

  useEffect(() => {
    const shrank = count < previous.current
    previous.current = count
    if (shrank) document.getElementById(controlId)?.focus()
  }, [count, controlId])
}
