import { useTranslation } from 'react-i18next'
import type { TimingBand } from '../types/calculator'
import type { AppViewModel, LineField, LineGroup, SafeMaxBidField } from '../types/viewModel'
import {
  estimateMoney,
  estimateRowAmount,
  exactMoney,
  howText,
  ratesAsAtDate,
  refText,
} from '../skins/shared/text'
import './print.css'

/**
 * The auction-day one-pager.
 *
 * It is a second, purpose-built document rather than a print stylesheet laid
 * over the live page, for four reasons:
 *
 * 1. Paper has no theme, so paper has no skin. Every skin prints the same
 *    sheet — including the fallback, and including any skin added later —
 *    because this is built from the view model, not from a skin's DOM.
 * 2. The three numbers have to lead. On screen two of them are `<tr>`s deep
 *    inside the line table; no stylesheet can lift a table row to the top of
 *    the page, in either skin's markup.
 * 3. The caveats travel with the numbers. They sit directly under the figures
 *    and cannot be pushed onto a second page by a long table.
 * 4. The list of things to hide cannot rot. `print.css` hides the live app
 *    wholesale, so a control added tomorrow is out of the print by default
 *    rather than until someone remembers to add it to a selector list.
 *
 * Nothing here is generated on a server and nothing is uploaded: the browser's
 * own print pipeline renders this page, so the figures never leave the device.
 *
 * It carries no `data-field` attributes, for the same reason the sticky total
 * carries none — it re-presents fields the skin has already put in the
 * document rather than being where those fields live.
 */
export function PrintSheet({ vm }: { vm: AppViewModel }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const results = vm.results
  const groups = new Map<TimingBand, LineGroup>(
    results.lineGroups.map((group) => [group.band, group]),
  )
  // A band with no rows is dropped upstream, so a band can be absent; the
  // sheet then prints without that figure rather than inventing a zero.
  const auctionDay = groups.get('auctionDay')
  const atSettlement = groups.get('atSettlement')
  const price = vm.inputs.price.value
  const rates = results.ratesAsAt.value
  const sources = results.sources.value

  return (
    <div className="print-sheet" hidden>
      <div className="print-masthead">
        <p className="print-eyebrow">{t(vm.chrome.eyebrow.labelKey)}</p>
        <p className="print-title">{t(vm.chrome.title.labelKey)}</p>
        {price === null ? null : (
          <p className="print-caption">
            {t('print.priceCaption', { price: exactMoney(price, locale) })}
          </p>
        )}
      </div>

      {/* The three figures, in the order the money is needed. */}
      <div className="print-headline">
        {auctionDay === undefined ? null : <Headline group={auctionDay} locale={locale} />}
        <div className="print-headline-item">
          <p className="print-headline-label">{t(results.safeMaxBid.labelKey)}</p>
          {results.safeMaxBid.status === 'bound' ? (
            <p className="print-headline-figure">
              {estimateMoney(results.safeMaxBid.value, locale)}
            </p>
          ) : null}
        </div>
        {atSettlement === undefined ? null : <Headline group={atSettlement} locale={locale} />}
      </div>

      <BidNote field={results.safeMaxBid} />

      {/* Directly under the figures, never after the table: a page that
          travels without its caveats is worse than no page, and a long table
          must not be able to push them onto a second sheet. */}
      <div className="print-caveats">
        <p className="print-caveat">
          {results.estimateNote.value.map((ref) => refText(ref, t, locale)).join(' ')}
        </p>
        <p className="print-caveat">
          {t(rates.beforeKey, { date: ratesAsAtDate(rates.asAt, locale) ?? rates.asAt })}
          <a href={rates.href}>{t(rates.linkKey)}</a>
          {t(rates.afterKey)}
          {t(sources.beforeKey)}
          <a href={sources.href}>{t(sources.linkKey)}</a>
          {t(sources.afterKey)}
        </p>
      </div>

      {/* The full line table follows, and takes whatever room is left. */}
      <table className="print-lines">
        <thead>
          <tr>
            <th scope="col">{t(results.tableHeadingKeys.line)}</th>
            <th scope="col" className="print-amount">
              {t(results.tableHeadingKeys.amount)}
            </th>
            <th scope="col">{t(results.tableHeadingKeys.how)}</th>
          </tr>
        </thead>
        {results.lineGroups.map((group) => (
          <tbody key={group.band}>
            <tr className="print-band">
              <th scope="rowgroup" colSpan={3}>
                {t(group.labelKey)}
                {' — '}
                {t(group.noteKey)}
              </th>
            </tr>
            {group.lines.map((line) => (
              <PrintRow key={line.id} line={line} />
            ))}
            <PrintRow line={group.subtotal} />
            {group.guidance === null ? null : (
              <tr className="print-guidance">
                <td colSpan={3}>
                  <strong>{t(group.guidance.labelKey)}</strong>
                  <ul>
                    {group.guidance.value.map((point) => (
                      <li key={point.termKey}>
                        <strong>{t(point.termKey)}</strong>
                        {t(point.bodyKey)}
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
            )}
          </tbody>
        ))}
        <tbody>
          <PrintRow line={results.total} />
        </tbody>
      </table>
    </div>
  )
}

/** One band's closing figure, headlined: what it is, when it is due. */
function Headline({ group, locale }: { group: LineGroup; locale: string }) {
  const { t } = useTranslation()
  return (
    <div className="print-headline-item">
      <p className="print-headline-label">{t(group.labelKey)}</p>
      <p className="print-headline-figure">{estimateMoney(group.subtotal.value, locale)}</p>
      <p className="print-headline-note">{t(group.noteKey)}</p>
    </div>
  )
}

/**
 * What stops the bid where it stops, and the rounding that made it a figure
 * someone can call out. On the outcomes with no ceiling to state, the sentence
 * is the whole answer — which is why it is here and not squeezed into the
 * headline cell above.
 */
function BidNote({ field }: { field: SafeMaxBidField }) {
  const { t, i18n } = useTranslation()
  // Joined in JS so the paragraph is one text node with a single space,
  // rather than JSX whitespace rules deciding the gap.
  const summary = refText(field.summary, t, i18n.language)
  const detail = field.detail === null ? null : refText(field.detail, t, i18n.language)
  return <p className="print-bid-note">{detail === null ? summary : `${summary} ${detail}`}</p>
}

function PrintRow({ line }: { line: LineField }) {
  const { t, i18n } = useTranslation()
  return (
    <tr className={line.emphasis ? 'print-emphasis' : undefined}>
      <th scope="row">{t(line.labelKey)}</th>
      <td className="print-amount">{estimateRowAmount(line.value, i18n.language)}</td>
      <td>{howText(line.how, t, i18n.language)}</td>
    </tr>
  )
}
