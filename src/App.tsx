import {
  Component,
  Suspense,
  useEffect,
  useLayoutEffect,
  useState,
  type ErrorInfo,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'
import { ResultsAnnouncer } from './a11y/ResultsAnnouncer'
import { SkipLink } from './a11y/SkipLink'
import { useAppViewModel } from './hooks/useAppViewModel'
import { useCalculator } from './hooks/useCalculator'
import { useColorMode } from './hooks/useColorMode'
import { FALLBACK_SKIN_ID, type SkinId } from './logic/skins'
import { PrintSheet } from './print/PrintSheet'
import { SKINS } from './skins/registry'
import type { AppViewModel } from './types/viewModel'

/**
 * The shell. It owns every hook — URL state, drafts, the colour mode — and
 * hands a skin the finished view model. Nothing below this point calculates,
 * fetches, touches the URL or mutates state, so switching skin swaps a child
 * component and no core state is lost.
 */

interface SkinBoundaryProps {
  children: ReactNode
  onFailure: () => void
}

/**
 * Reports a skin whose chunk will not load, or whose render throws, up to the
 * shell — it does not render a replacement itself. The replacement has to be
 * chosen above `useColorMode`, because a skin is three things that must agree:
 * the `data-skin` attribute its stylesheet is scoped to, the tokens painted on
 * the root, and the components. Swapping only the components here would leave
 * the baseline's markup under the failed skin's attribute, matching no
 * stylesheet at all.
 */
class SkinBoundary extends Component<SkinBoundaryProps, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Reported, not swallowed silently; the shell then re-renders on the
    // fallback skin, which this boundary's new key gives a fresh boundary.
    console.error(error, info.componentStack)
    this.props.onFailure()
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}

function SkinRoot({ vm, onFailure }: { vm: AppViewModel; onFailure: () => void }) {
  const active = SKINS[vm.skinId]
  return (
    <SkinBoundary key={vm.skinId} onFailure={onFailure}>
      <Suspense fallback={null}>
        <active.Root vm={vm} />
      </Suspense>
    </SkinBoundary>
  )
}

// Mount identity for the shell. Switching skin or mode must not remount the
// core hooks; the attribute this writes is how a test proves it did not.
let coreInstances = 0

function App() {
  const { i18n } = useTranslation()
  const core = useCalculator()
  const [instance] = useState(() => ++coreInstances)
  const [failedSkin, setFailedSkin] = useState<SkinId | null>(null)

  // What the URL asked for, and what is actually renderable. They differ only
  // when the requested skin failed; everything downstream — attribute, tokens
  // and components — then follows the baseline together. Requesting the
  // baseline and having it fail leaves them equal, so there is no loop.
  const requested = core.presentation.skin
  const effective = failedSkin === requested ? FALLBACK_SKIN_ID : requested
  const skin = SKINS[effective]
  const resolvedMode = useColorMode(core.presentation.mode, effective, skin.tokens)
  const vm = useAppViewModel(core, resolvedMode, effective)

  // The URL's ?lang= is the source of truth; i18next, <html lang> and the
  // document metadata follow it. The metadata writes wait for changeLanguage
  // to resolve, so they never render through the outgoing language's bundle.
  const lang = vm.locale
  useEffect(() => {
    let stale = false
    const apply = () => {
      if (stale) return
      document.documentElement.lang = lang
      document.title = i18n.t('app.pageTitle')
      document
        .querySelector('meta[name="description"]')
        ?.setAttribute('content', i18n.t('app.metaDescription'))
    }
    if (i18n.language !== lang) {
      void i18n.changeLanguage(lang).then(apply)
    } else {
      apply()
    }
    return () => {
      stale = true
    }
  }, [i18n, lang])

  useEffect(() => {
    document.documentElement.dataset.coreInstance = String(instance)
  }, [instance])

  // The display currency is published on the root element, beside data-skin
  // and data-mode, so a stylesheet can answer it directly: đồng figures run
  // some two and a half times longer than dollars, and the type and the stat
  // grid have to give way to them.
  //
  // Before paint, not after: this is an attribute a stylesheet reads, so a
  // passive effect would let one frame through at the dollar sizes.
  const currency = core.presentation.currency
  useLayoutEffect(() => {
    document.documentElement.dataset.cur = currency
  }, [currency])

  // Two pieces of accessibility furniture the shell owns rather than the skin.
  // Both have to exist whichever skin is mounted — and the announcer has to
  // survive a skin failing to load, which is exactly when a reader most needs
  // to be told the numbers are still there — so they sit outside the boundary.
  //
  // Both are still live-page furniture, so both sit inside .app-screen: a skip
  // link and a live region have nothing to say on paper.
  return (
    <>
      {/* display: contents, so the wrapper changes no layout on screen; it
          exists so print.css can take the whole live page off the paper with
          one rule rather than a list of things to hide that goes stale — the
          currency bar and the skip link this branch merged in included. */}
      <div className="app-screen">
        <SkipLink />
        <SkinRoot vm={vm} onFailure={() => setFailedSkin(requested)} />
        <ResultsAnnouncer display={vm.display.settings} results={vm.results} />
      </div>
      {/* Skin-independent by design: the printed one-pager is the same sheet
          whichever skin is on screen, including the fallback. */}
      <PrintSheet vm={vm} />
    </>
  )
}

export default App
