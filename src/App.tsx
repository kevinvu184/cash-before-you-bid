import { Component, Suspense, useEffect, useState, type ErrorInfo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppViewModel } from './hooks/useAppViewModel'
import { useCalculator } from './hooks/useCalculator'
import { useColorMode } from './hooks/useColorMode'
import { FALLBACK_SKIN_ID } from './logic/skins'
import { SKINS } from './skins/registry'
import type { AppViewModel } from './types/viewModel'

/**
 * The shell. It owns every hook — URL state, drafts, the colour mode — and
 * hands a skin the finished view model. Nothing below this point calculates,
 * fetches, touches the URL or mutates state, so switching skin swaps a child
 * component and no core state is lost.
 */

interface SkinBoundaryProps {
  skinId: string
  children: ReactNode
  fallback: ReactNode
}

/**
 * If a skin's chunk fails to load or its render throws, the plain baseline
 * takes over rather than the page going blank. Keyed by skin id so choosing a
 * different skin clears a previous failure.
 */
class SkinBoundary extends Component<SkinBoundaryProps, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Reported, not swallowed silently; the fallback still renders.
    console.error(error, info.componentStack)
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

function SkinRoot({ vm }: { vm: AppViewModel }) {
  const active = SKINS[vm.skinId]
  const Fallback = SKINS[FALLBACK_SKIN_ID].Root
  return (
    <SkinBoundary
      key={vm.skinId}
      skinId={vm.skinId}
      fallback={
        <Suspense fallback={null}>
          <Fallback vm={vm} />
        </Suspense>
      }
    >
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
  const skin = SKINS[core.presentation.skin]
  const resolvedMode = useColorMode(core.presentation.mode, core.presentation.skin, skin.tokens)
  const vm = useAppViewModel(core, resolvedMode)

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

  return <SkinRoot vm={vm} />
}

export default App
