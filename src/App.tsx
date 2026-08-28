import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import './App.css'
import { CurrencyBar } from './components/CurrencyBar'
import { DisplayProvider } from './components/DisplayProvider'
import { EstimateDisclaimer } from './components/EstimateDisclaimer'
import { FlagList } from './components/FlagList'
import { InputsPanel } from './components/InputsPanel'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { LineTable } from './components/LineTable'
import { RulesNotes } from './components/RulesNotes'
import { StatRow } from './components/StatRow'
import { StickyTotal } from './components/StickyTotal'
import { TranslationNotice } from './components/TranslationNotice'
import { useCalculator } from './hooks/useCalculator'
import { useExchangeRate } from './hooks/useExchangeRate'
import { useScrolledPast } from './hooks/useScrolledPast'

function App() {
  const { t, i18n } = useTranslation()
  const { inputs, result, setField, setRoute, setLang, setCurrency, setManualRate } =
    useCalculator()
  const header = useRef<HTMLElement>(null)
  const headerGone = useScrolledPast(header)

  // An override stands in for the fetched rate wherever there is one; the
  // fetch still runs behind it, so Reset has a live rate to fall back to and
  // the rate line can say what the override is standing in for.
  const fetched = useExchangeRate(inputs.currency)
  const rate = inputs.manualRate ?? fetched.rate

  // The display currency is published on the root element so the stylesheet
  // can answer it directly: đồng figures run some two and a half times longer
  // than dollars, and the type and the stat grid have to give way to them.
  const currency = inputs.currency
  useEffect(() => {
    document.documentElement.dataset.cur = currency
  }, [currency])

  // The URL's ?lang= is the source of truth; i18next, <html lang> and the
  // document metadata follow it. The metadata writes wait for changeLanguage
  // to resolve, so they never render through the outgoing language's bundle.
  const lang = inputs.lang
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

  return (
    <DisplayProvider currency={inputs.currency} rate={rate}>
      <StickyTotal total={result.tiles.total.value} shown={headerGone} />
      <div className="page">
        <TranslationNotice active={lang === 'vi'} />
        <header className="masthead" ref={header}>
          <div className="masthead-top">
            <span className="eyebrow">{t('app.eyebrow')}</span>
            <LanguageSwitcher lang={lang} setLang={setLang} />
          </div>
          <h1>{t('app.title')}</h1>
          <p className="lede">{t('app.lede')}</p>
        </header>

        <div className="columns">
          <InputsPanel inputs={inputs} setField={setField} setRoute={setRoute} />
          <main className="results">
            <CurrencyBar
              currency={inputs.currency}
              setCurrency={setCurrency}
              rate={rate}
              status={fetched.status}
              updatedAt={fetched.updatedAt}
              manualRate={inputs.manualRate}
              setManualRate={setManualRate}
            />
            <FlagList flags={result.flags} />
            <StatRow tiles={result.tiles} />
            <LineTable rows={result.rows} />
            <EstimateDisclaimer />
            <RulesNotes />
          </main>
        </div>
      </div>
    </DisplayProvider>
  )
}

export default App
