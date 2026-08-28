import { useTranslation } from 'react-i18next'
import type { DisplaySettings } from '../logic/display'
import { estimateMoney } from '../skins/shared/text'
import type { ResultsViewModel } from '../types/viewModel'
import { useSettledAnnouncement } from './useSettledAnnouncement'

/**
 * What a screen reader hears when the numbers change.
 *
 * The calculator has no submit button — every keystroke in the price field
 * recomputes the whole page — so a reader who cannot see the figures move has
 * no way to know an edit landed. The obvious fix, `aria-live` on the verdict
 * and the total themselves, is worse than silence: it fires on every
 * keystroke, so typing "1250000" queues seven announcements of six prices
 * nobody meant, and a polite queue reads all of them before the one that
 * matters. It also re-reads whichever node changed, which is a fragment of a
 * sentence rather than an outcome.
 *
 * So the announcement is composed rather than borrowed, and it is debounced:
 * one off-screen region, one sentence, published only once the figures have
 * held still (see `useSettledAnnouncement`). It says what the ticket asks for
 * and no more — both verdicts and the total cash — because the point is to
 * report that the answer moved and what it moved to, not to read the results
 * out. Everything else, the safe maximum bid included, is on the page in
 * reading order for someone who now knows it is worth going back to.
 *
 * `role="status"` rather than a bare `aria-live`: it is the role for an
 * advisory update that must not interrupt, and it carries polite/atomic
 * itself. Both are stated anyway, because the combination is what the
 * behaviour depends on and an implicit default is easy to lose in a refactor.
 *
 * The display arrives as a prop rather than through `useDisplay()`, because
 * this is shell furniture and the context is published by a skin's Root, below
 * it. The locale is added here from i18next, exactly as `useDisplay` does, so
 * the total is written in the same currency and locale as the figure on screen.
 */
export function ResultsAnnouncer({
  display,
  results,
}: {
  display: DisplaySettings
  results: ResultsViewModel
}) {
  const { t, i18n } = useTranslation()
  const total = results.stats.find((stat) => stat.id === 'statTotal') ?? results.stats[0]

  // Figures and outcomes only, never words: this is what "the results changed"
  // means, and it must not move when the language does. The currency is in it
  // because switching it changes the figure a reader is shown; the rate is
  // not, because a re-quote that leaves the rounded total where it was has
  // changed nothing worth interrupting for — and an identical sentence would
  // not be announced anyway.
  const signature = [
    ...results.verdicts.map((verdict) => `${verdict.id}:${verdict.status}:${verdict.value}`),
    `total:${total ? total.value : ''}`,
    `currency:${display.currency}`,
  ].join('|')

  const text = total
    ? t('a11y.resultsAnnouncement', {
        verdicts: results.verdicts
          .map((verdict) =>
            t('a11y.verdictAnnouncement', {
              label: t(verdict.labelKey),
              status: t(verdict.statusKey),
            }),
          )
          .join(' '),
        totalLabel: t(total.labelKey),
        total: estimateMoney(total.value, { ...display, locale: i18n.language }),
      })
    : ''

  const announced = useSettledAnnouncement(signature, text)

  return (
    <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
      {announced}
    </p>
  )
}
