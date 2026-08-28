import { useAppViewModel } from '../hooks/useAppViewModel'
import { useCalculator } from '../hooks/useCalculator'
import type { Lang } from '../logic/lang'
import { DEFAULT_SKIN_ID } from '../logic/skins'
import type { AppViewModel } from '../types/viewModel'
import { InputsPanel } from '../skins/default/Inputs'
import { Masthead } from '../skins/default/Masthead'
import { DisplayProvider } from '../skins/shared/DisplayProvider'

/**
 * What the served HTML paints before the bundle has parsed.
 *
 * The masthead and the inputs panel, from the default skin's own components —
 * not a copy of their markup — so the paint cannot drift from what React
 * renders a moment later. Everything below them is left out on purpose:
 *
 *   - The results are figures. Painting a figure the reader did not ask for,
 *     even for 200ms, is the one mistake this calculator cannot make, and a
 *     prerender is by definition rendered before the URL is known.
 *   - Saved scenarios come out of localStorage, which no build has.
 *
 * The wrappers here (`page`, `main`, `columns`) and the display context are
 * the only things stated twice; the drift test in shell.test.tsx holds this
 * file to the skin's Root.
 */
export function Shell({ vm }: { vm: AppViewModel }) {
  return (
    <DisplayProvider settings={vm.display.settings}>
      <div className="page">
        <Masthead vm={vm} />
        {/* The main landmark is the skin's, and it is here for the same reason
            the rest is: a first paint without one, followed by one appearing
            at hydration, is a landmark that moves under anyone navigating by
            them. */}
        <main>
          <div className="columns">
            <InputsPanel inputs={vm.inputs} />
          </div>
        </main>
      </div>
    </DisplayProvider>
  )
}

/**
 * The shell on the default state, because that is the only state a build
 * knows: `useSearchParams` has no window to read and reports an empty query
 * string, so every hook below sees exactly what a first visit with a bare URL
 * sees.
 *
 * The one thing a bare URL does not carry is the locale — this document is
 * the locale — so the language is substituted into the core's state on the way
 * past. Without it the state would say `DEFAULT_LANG` while i18next was
 * already rendering the other language, and the fields that read the state
 * rather than the string bundle (the machine-translation disclosure is one)
 * would come out belonging to neither document.
 *
 * The colour mode is not a render input for this markup — the ground script in
 * index.html paints the tokens — so 'light' here is a placeholder, not a
 * choice imposed on a dark-mode reader.
 */
export function PrerenderRoot({ lang }: { lang: Lang }) {
  const core = useCalculator()
  const localised = { ...core, inputs: { ...core.inputs, lang } }
  const vm = useAppViewModel(localised, 'light', DEFAULT_SKIN_ID)
  return <Shell vm={vm} />
}
