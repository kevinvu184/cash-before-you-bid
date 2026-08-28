import type { Ref } from 'react'
import { useTranslation } from 'react-i18next'
import type { AppViewModel } from '../../types/viewModel'
import { ActionButton, ChoiceButtons } from './Controls'

/**
 * Everything above the fold that does not depend on a calculation: the
 * translation disclosure, the eyebrow, the switchers, the print control, the
 * title and the lede. Split out of Root because the build-time prerender
 * (src/prerender/Shell.tsx) paints exactly this before the bundle has parsed,
 * and it has to be the same markup the skin renders a moment later rather
 * than a copy of it that can drift.
 */
export function Masthead({ vm, headerRef }: { vm: AppViewModel; headerRef?: Ref<HTMLElement> }) {
  const { t } = useTranslation()
  const notice = vm.chrome.notice

  return (
    <>
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

      <header className="masthead" ref={headerRef}>
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
            <ActionButton field={vm.controls.print} />
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
    </>
  )
}
