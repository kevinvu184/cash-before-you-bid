import { Fragment, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RESULTS_ANCHOR_ID } from '../../a11y/anchors'
import { useMediaQuery } from '../../hooks/useMediaQuery'

import type { FlagKind } from '../../types/calculator'
import type {
  Field,
  GuidanceField,
  LineField,
  NoteEntry,
  RatesAsAtValue,
  ResultsViewModel,
  SafeMaxBidField,
  SourcesValue,
  StatField,
  SunkCostViewModel,
  TextRef,
  VerdictField,
} from '../../types/viewModel'
import {
  estimateMoney,
  estimateRowAmount,
  flagText,
  howText,
  ratesAsAtDate,
  refText,
} from '../shared/text'

// Ledger has no alert or toast component, so the flags are rule-divided strips
// with the state carried by a mono label in one of the desaturated semantics.
const KIND_KEYS: Record<FlagKind, string> = {
  warn: 'flagKinds.warn',
  note: 'flagKinds.note',
  ok: 'flagKinds.ok',
}

function FlagList({
  field,
  regionLabelKey,
}: {
  field: ResultsViewModel['flags']
  regionLabelKey: string
}) {
  const { t, i18n } = useTranslation()
  return (
    <div
      className="flags"
      role="region"
      aria-label={t(regionLabelKey)}
      data-field={field.id}
      data-importance={field.importance}
    >
      {field.value.map((flag) => (
        <p className={`flag ${flag.kind}`} key={`${flag.kind}:${flag.code}`}>
          <span className="flag-label">{t(KIND_KEYS[flag.kind])}</span>
          <span className="flag-text">{flagText(flag, t, i18n.language)}</span>
        </p>
      ))}
    </div>
  )
}

/**
 * The number someone screenshots: how high they can go. It leads the results
 * because it is the question the calculator exists to answer — the verdicts
 * under it say whether the price they already have in mind clears, and this
 * says what price would.
 *
 * The figure is drawn only for a bounded answer. With no affordable price, or
 * none below the calculator's own ceiling, there is no number to headline and
 * the sentence is the whole answer; `status` is the core's word on which of
 * those this is, so the skin never inspects the figure to find out.
 */
function SafeMaxBid({ headingKey, field }: { headingKey: string; field: SafeMaxBidField }) {
  const { t, i18n } = useTranslation()
  return (
    <section
      className="max-bid"
      data-field={field.id}
      data-importance={field.importance}
      data-status={field.status}
    >
      <h2 className="section-mark">{t(headingKey)}</h2>
      <p className="max-bid-label">{t(field.labelKey)}</p>
      {field.status === 'bound' ? (
        <p className="max-bid-figure">{estimateMoney(field.value, i18n.language)}</p>
      ) : null}
      <p className="max-bid-summary">{refText(field.summary, t, i18n.language)}</p>
      {field.detail === null ? null : (
        <p className="max-bid-detail small">{refText(field.detail, t, i18n.language)}</p>
      )}
    </section>
  )
}

/**
 * The answer the bidder came for: covered, or short by this much, at each of
 * the two moments that can sink a purchase. Two blocks, never one — a cash gap
 * and a loan gap are closed differently, so they are never added together.
 *
 * `data-status` carries the outcome for the stylesheet; the word beside the
 * label carries it for everyone reading rather than looking.
 */
function Verdicts({
  headingKey,
  verdicts,
}: {
  headingKey: string
  verdicts: readonly VerdictField[]
}) {
  const { t, i18n } = useTranslation()
  return (
    <section className="verdicts">
      <h2 className="section-mark">{t(headingKey)}</h2>
      {verdicts.map((verdict) => (
        <div
          className="verdict"
          key={verdict.id}
          data-field={verdict.id}
          data-importance={verdict.importance}
          data-status={verdict.status}
        >
          <div className="verdict-head">
            <span className="verdict-label">{t(verdict.labelKey)}</span>
            <span className="verdict-status">{t(verdict.statusKey)}</span>
          </div>
          <p className="verdict-summary">{refText(verdict.summary, t, i18n.language)}</p>
          {verdict.details.length > 0 ? (
            <ul className="verdict-details">
              {verdict.details.map((detail) => (
                <li key={detail.key}>{refText(detail, t, i18n.language)}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </section>
  )
}

function Stat({ stat }: { stat: StatField }) {
  const { t, i18n } = useTranslation()
  const emphasis = stat.importance === 'primary'
  return (
    <div
      className={emphasis ? 'stat emphasis' : 'stat'}
      data-field={stat.id}
      data-importance={stat.importance}
    >
      <div className="stat-label">{t(stat.labelKey)}</div>
      <div className="stat-value">{estimateMoney(stat.value, i18n.language)}</div>
      <div className="stat-sub">
        {stat.detail === null ? '' : refText(stat.detail, t, i18n.language)}
      </div>
    </div>
  )
}

/**
 * Three columns from 820px. On a phone the working — "How it was worked out" —
 * would either force a horizontal scroll or shrink the figures, so it moves
 * behind a per-row disclosure instead. Field ids are unique, so they key both
 * the rows and which disclosures are open, which keeps a row open across a
 * recalculation. The working stays in the DOM either way.
 *
 * Rows are grouped by when the money is due: one `<tbody>` per timing band,
 * headed by its name and closed by its own subtotal, with the grand total in a
 * final group of its own. The core does the grouping and the arithmetic; this
 * only draws it.
 */
function LineTable({ results }: { results: ResultsViewModel }) {
  const { t } = useTranslation()
  const wide = useMediaQuery('(min-width: 820px)')
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set())

  const toggle = (id: string) =>
    setOpen((current) => {
      const next = new Set(current)
      if (!next.delete(id)) next.add(id)
      return next
    })

  const renderLine = (line: LineField) =>
    wide ? (
      <WideRow key={line.id} line={line} />
    ) : (
      <MobileRow
        key={line.id}
        line={line}
        open={open.has(line.id)}
        onToggle={() => toggle(line.id)}
      />
    )

  return (
    <table className="lines">
      {/* The design gives this table no visible heading — the band names carry
          it — so its name is a caption only a screen reader reads. Without one
          it is announced as "table" and nothing else. */}
      <caption className="visually-hidden">{t(results.linesHeadingKey)}</caption>
      <thead>
        <tr>
          <th scope="col">{t(results.tableHeadingKeys.line)}</th>
          <th scope="col" className="n">
            {t(results.tableHeadingKeys.amount)}
          </th>
          {wide ? (
            <th scope="col" className="m">
              {t(results.tableHeadingKeys.how)}
            </th>
          ) : null}
        </tr>
      </thead>
      {results.lineGroups.map((group) => (
        <tbody key={group.band}>
          <tr className="band-head">
            {/* `rowgroup` scope: this heading labels the rows of its own tbody. */}
            <th scope="rowgroup" colSpan={wide ? 3 : 2}>
              <span className="band-name">{t(group.labelKey)}</span>
              <span className="band-note">{t(group.noteKey)}</span>
            </th>
          </tr>
          {group.lines.map(renderLine)}
          <SubtotalRow line={group.subtotal} wide={wide} />
          {group.guidance === null ? null : (
            <BandGuidance guidance={group.guidance} span={wide ? 3 : 2} />
          )}
        </tbody>
      ))}
      <tbody>{renderLine(results.total)}</tbody>
    </table>
  )
}

/**
 * A band's closing figure. It has no working of its own — the lines above it
 * are the working — so it is a plain row at every width rather than a
 * disclosure that would open on nothing.
 */
function SubtotalRow({ line, wide }: { line: LineField; wide: boolean }) {
  const { t, i18n } = useTranslation()
  return (
    <tr className="band-subtotal" data-field={line.id} data-importance={line.importance}>
      <td>{t(line.labelKey)}</td>
      <td className="n">{estimateRowAmount(line.value, i18n.language)}</td>
      {wide ? <td className="m" /> : null}
    </tr>
  )
}

/**
 * The band's closing note: what the money in it has to look like. A native
 * `<details>`, so it opens on tap, on Enter and on Space with no hover
 * anywhere in it, and the points are in the DOM whether or not it is open.
 * It sits after the subtotal so the figures of a band stay together.
 */
function BandGuidance({ guidance, span }: { guidance: GuidanceField; span: number }) {
  const { t } = useTranslation()
  return (
    <tr className="band-guidance">
      <td colSpan={span}>
        <details className="guidance">
          <summary>{t(guidance.labelKey)}</summary>
          <ul
            className="small"
            data-field={guidance.id}
            data-importance={guidance.importance}
          >
            {guidance.value.map((point) => (
              <li key={point.termKey}>
                <strong>{t(point.termKey)}</strong>
                {t(point.bodyKey)}
              </li>
            ))}
          </ul>
        </details>
      </td>
    </tr>
  )
}

function WideRow({ line }: { line: LineField }) {
  const { t, i18n } = useTranslation()
  return (
    <tr
      className={line.emphasis ? 'total' : undefined}
      data-field={line.id}
      data-importance={line.importance}
    >
      <td>{t(line.labelKey)}</td>
      <td className="n">{estimateRowAmount(line.value, i18n.language)}</td>
      <td className="m">{howText(line.how, t, i18n.language)}</td>
    </tr>
  )
}

interface MobileRowProps {
  line: LineField
  open: boolean
  onToggle: () => void
}

function MobileRow({ line, open, onToggle }: MobileRowProps) {
  const { t, i18n } = useTranslation()
  const how = howText(line.how, t, i18n.language)
  const expanded = open && how !== ''
  const className = [line.emphasis ? 'total' : '', expanded ? 'expanded' : '']
    .filter(Boolean)
    .join(' ')
  const formulaId = `how-${line.id}`

  return (
    <Fragment>
      <tr className={className || undefined} data-field={line.id} data-importance={line.importance}>
        <td>
          {how !== '' ? (
            <button
              type="button"
              className="line-disclosure"
              aria-expanded={expanded}
              aria-controls={formulaId}
              onClick={onToggle}
            >
              <span>{t(line.labelKey)}</span>
              <span className="line-disclosure-mark" aria-hidden="true">
                {expanded ? '−' : '+'}
              </span>
            </button>
          ) : (
            t(line.labelKey)
          )}
        </td>
        <td className="n">{estimateRowAmount(line.value, i18n.language)}</td>
      </tr>
      {/* Always rendered, hidden by CSS when collapsed, so aria-controls always
          resolves. Never `.total`: the ink rule belongs to the row above, and
          the continuation carries that row's bottom hairline. */}
      {how !== '' ? (
        <tr className={expanded ? 'formula shown' : 'formula'}>
          <td className="m" id={formulaId} colSpan={2}>
            {how}
          </td>
        </tr>
      ) : null}
    </Fragment>
  )
}

/**
 * Sits under the results: the single place that says every computed figure on
 * the page is a rounded estimate. Because it carries that once, no figure is
 * marked individually.
 */
function EstimateNote({ field }: { field: Field<readonly TextRef[]> }) {
  const { t, i18n } = useTranslation()
  // Joined in JS so the paragraph is one text node with single spaces, rather
  // than JSX whitespace rules deciding the gaps.
  const text = field.value.map((ref) => refText(ref, t, i18n.language)).join(' ')
  return (
    <p
      className="small estimate-note"
      data-field={field.id}
      data-importance={field.importance}
    >
      {text}
    </p>
  )
}

/**
 * The pre-auction spend, under the table and above the estimate note. Its own
 * section, not two more tiles in the stat row: the figures above are what
 * buying this one property costs, and this money is spent whether or not the
 * auction is won.
 */
function SunkCost({ sunk }: { sunk: SunkCostViewModel }) {
  const { t, i18n } = useTranslation()
  const research = sunk.research.value
  return (
    <section className="sunk">
      <h3>{t(sunk.headingKey)}</h3>
      <div className="stats">
        {sunk.stats.map((stat) => (
          <Stat key={stat.id} stat={stat} />
        ))}
      </div>
      <p
        className="small"
        data-field={sunk.framing.id}
        data-importance={sunk.framing.importance}
      >
        {refText(sunk.framing.value, t, i18n.language)}
      </p>
      <p
        className="small"
        data-field={sunk.research.id}
        data-importance={sunk.research.importance}
      >
        {t(research.beforeKey)}
        <a href={research.href}>{t(research.linkKey)}</a>
        {t(research.afterKey)}
      </p>
    </section>
  )
}

function RulesNotes({
  headingKey,
  notes,
  ratesAsAt,
  sources,
}: {
  headingKey: string
  notes: Field<readonly NoteEntry[]>
  ratesAsAt: Field<RatesAsAtValue>
  sources: Field<SourcesValue>
}) {
  const { t, i18n } = useTranslation()
  const link = sources.value
  const rates = ratesAsAt.value
  // The raw ISO date is the fallback: a date the reader can still act on
  // beats dropping the one line that says how current the figures are.
  const asAt = ratesAsAtDate(rates.asAt, i18n.language) ?? rates.asAt
  return (
    <section className="notes">
      <h3>{t(headingKey)}</h3>
      <ul className="small" data-field={notes.id} data-importance={notes.importance}>
        {notes.value.map((entry) => (
          <li key={entry.id}>
            {entry.parts.map((part) => (
              <Fragment key={part.termKey}>
                <strong>{t(part.termKey)}</strong>
                {t(part.bodyKey)}
              </Fragment>
            ))}
          </li>
        ))}
      </ul>
      <p className="small" data-field={ratesAsAt.id} data-importance={ratesAsAt.importance}>
        {t(rates.beforeKey, { date: asAt })}
        <a href={rates.href}>{t(rates.linkKey)}</a>
        {t(rates.afterKey)}
      </p>
      <p className="small" data-field={sources.id} data-importance={sources.importance}>
        {t(link.beforeKey)}
        <a href={link.href}>{t(link.linkKey)}</a>
        {t(link.afterKey)}
      </p>
    </section>
  )
}

export function Results({ results }: { results: ResultsViewModel }) {
  const { t } = useTranslation()
  return (
    // A named region rather than <main>: the inputs are main content too, so
    // the shell's <main> is above both of them. `tabindex="-1"` is what makes
    // the skip link actually move focus here rather than only the scroll
    // position; the global :focus:not(:focus-visible) rule keeps it ringless.
    <section
      className="results"
      id={RESULTS_ANCHOR_ID}
      tabIndex={-1}
      aria-label={t(results.regionLabelKey)}
    >
      <SafeMaxBid headingKey={results.safeMaxBidHeadingKey} field={results.safeMaxBid} />
      <Verdicts headingKey={results.verdictsHeadingKey} verdicts={results.verdicts} />
      <FlagList field={results.flags} regionLabelKey={results.flagsRegionLabelKey} />
      <div className="stats">
        {results.stats.map((stat) => (
          <Stat key={stat.id} stat={stat} />
        ))}
      </div>
      <LineTable results={results} />
      <SunkCost sunk={results.sunkCost} />
      <EstimateNote field={results.estimateNote} />
      <RulesNotes
        headingKey={results.notesHeadingKey}
        notes={results.notes}
        ratesAsAt={results.ratesAsAt}
        sources={results.sources}
      />
    </section>
  )
}
