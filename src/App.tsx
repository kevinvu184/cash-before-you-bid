import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import './App.css'
import { FlagList } from './components/FlagList'
import { InputsPanel } from './components/InputsPanel'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { LineTable } from './components/LineTable'
import { RulesNotes } from './components/RulesNotes'
import { StatRow } from './components/StatRow'
import { StickyTotal } from './components/StickyTotal'
import { TranslationNotice } from './components/TranslationNotice'
import { useCalculator } from './hooks/useCalculator'
import { useScrolledPast } from './hooks/useScrolledPast'

function App() {
  const { t, i18n } = useTranslation()
  const { inputs, result, setField, setRoute, setLang } = useCalculator()
  const header = useRef<HTMLElement>(null)
  const headerGone = useScrolledPast(header)

  // The URL's ?lang= is the source of truth; i18next, <html lang> and the
  // document title follow it.
  const lang = inputs.lang
  useEffect(() => {
    if (i18n.language !== lang) void i18n.changeLanguage(lang)
    document.documentElement.lang = lang
    document.title = t('app.pageTitle')
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', t('app.metaDescription'))
  }, [i18n, lang, t])

  return (
    <>
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
            <FlagList flags={result.flags} />
            <StatRow tiles={result.tiles} />
            <LineTable rows={result.rows} />
            <RulesNotes />
          </main>
        </div>
      </div>
    </>
  )
}

export default App
