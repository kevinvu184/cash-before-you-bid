import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { AppViewModel } from '../../types/viewModel'
import { DisplayProvider } from '../shared/DisplayProvider'
import { useScrolledPast } from '../shared/useScrolledPast'
import { ChoiceButtons } from './Controls'
import { InputsPanel } from './Inputs'
import { Results } from './Results'
import { Scenarios } from './Scenarios'
import { StickyTotal } from './StickyTotal'
import './skin.css'

/**
 * The Ledger page: warm cream paper, hairline rules, an ink total strip.
 * Everything it draws comes from the view model — it calculates nothing,
 * touches neither the URL nor storage, and adds no information of its own.
 */
export function Root({ vm }: { vm: AppViewModel }) {
  const { t } = useTranslation()
  const header = useRef<HTMLElement>(null)
  const headerGone = useScrolledPast(header)
  const notice = vm.chrome.notice
  const total = vm.results.stats[0]

  return (
    <DisplayProvider settings={vm.display.settings}>
      {total ? <StickyTotal total={total} shown={headerGone} /> : null}
      <div className="page">
        {notice ? (
          <div
            className="translation-notice"
            role="note"
            data-field={notice.id}
            data-importance={notice.importance}
          >
            <p className="translation-notice-text">{t(notice.labelKey)}</p>
            <button
              type="button"
              className="translation-notice-dismiss"
              aria-label={t(notice.dismissLabelKey)}
              onClick={notice.onDismiss}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        ) : null}

        <header className="masthead" ref={header}>
          <div className="masthead-top">
            <span
              className="eyebrow"
              data-field={vm.chrome.eyebrow.id}
              data-importance={vm.chrome.eyebrow.importance}
            >
              {t(vm.chrome.eyebrow.labelKey)}
            </span>
            <div className="masthead-controls">
              <ChoiceButtons field={vm.controls.language} />
              <ChoiceButtons field={vm.controls.colorMode} />
              <ChoiceButtons field={vm.controls.skin} />
            </div>
          </div>
          <h1 data-field={vm.chrome.title.id} data-importance={vm.chrome.title.importance}>
            {t(vm.chrome.title.labelKey)}
          </h1>
          <p
            className="lede"
            data-field={vm.chrome.lede.id}
            data-importance={vm.chrome.lede.importance}
          >
            {t(vm.chrome.lede.labelKey)}
          </p>
        </header>

        {/* Everything below the masthead is the calculator, inputs included,
            so the main landmark covers both columns rather than the results
            alone. It carries no class: it is a semantic wrapper, and the
            layout is still .page's padding and .columns' grid. */}
        <main>
          <Scenarios scenarios={vm.scenarios} />

          <div className="columns">
            <InputsPanel inputs={vm.inputs} />
            <Results display={vm.display} results={vm.results} />
          </div>
        </main>
      </div>
    </DisplayProvider>
  )
}
