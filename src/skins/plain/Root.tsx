import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { RESULTS_ANCHOR_ID } from '../../a11y/anchors'
import { MAX_NAME_LENGTH } from '../../logic/scenarioStore'
import type { FlagKind } from '../../types/calculator'
import type {
  ActionField,
  AnyInputField,
  AppViewModel,
  BooleanInputField,
  ChoiceInputField,
  DisplayViewModel,
  ExchangeRateField,
  GuidanceField,
  InputsViewModel,
  LineField,
  NumberInputField,
  PriceSliderField,
  PrivacyField,
  ResultsViewModel,
  SafeMaxBidField,
  ScenarioActionKeys,
  ScenarioEntry,
  ScenariosViewModel,
  StatField,
  VerdictField,
  SunkCostViewModel,
} from '../../types/viewModel'
import { DisplayProvider } from '../shared/DisplayProvider'
import { useDisplay } from '../shared/display'
import { useFocusAfterRemoval, useRowModeFocus } from '../shared/scenarioFocus'
import {
  estimateMoney,
  estimateRowAmount,
  flagText,
  inputMoney,
  howText,
  quotedRate,
  rateDraft,
  rateStamp,
  ratesAsAtDate,
  refText,
  savedDate,
} from '../shared/text'
import './skin.css'

/**
 * The plain baseline. Black on white, white on black, one link blue. No
 * shadows, no gradients, no rounded corners, no background fills, no
 * animation, no progressive disclosure — every field the view model carries is
 * on the page, in document order, in the element that describes it.
 *
 * It is deliberately boring. It is also the fallback when another skin fails
 * to load, which is why it has nothing in it that can fail.
 */

/** Names the line table through the heading above it; see Results below. */
const LINES_HEADING_ID = 'plain-lines-heading'

const KIND_KEYS: Record<FlagKind, string> = {
  warn: 'flagKinds.warn',
  note: 'flagKinds.note',
  ok: 'flagKinds.ok',
}

function Choice<T extends string>({ field }: { field: ChoiceInputField<T> }) {
  const { t } = useTranslation()
  return (
    <div
      className="plain-choice"
      role="group"
      aria-label={t(field.labelKey)}
      data-field={field.id}
      data-importance={field.importance}
    >
      <span className="plain-choice-label">{t(field.labelKey)}</span>
      {field.options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={field.value === option.value}
          aria-label={option.a11yLabelKey ? t(option.a11yLabelKey) : undefined}
          lang={option.lang}
          onClick={() => field.onChange(option.value)}
        >
          {t(option.labelKey)}
        </button>
      ))}
    </div>
  )
}

/** An action, not a choice: one button, no pressed state, nothing hidden. */
function Action({ field }: { field: ActionField }) {
  const { t } = useTranslation()
  return (
    <p className="plain-choice" data-field={field.id} data-importance={field.importance}>
      <button type="button" onClick={field.onActivate}>
        {t(field.labelKey)}
      </button>
    </p>
  )
}

function NumberRow({ field }: { field: NumberInputField }) {
  const { t } = useTranslation()
  const hintId = field.hintKey ? `plain-${field.controlId}-hint` : undefined
  return (
    <p className="plain-field" data-field={field.id} data-importance={field.importance}>
      <label htmlFor={field.controlId}>{t(field.labelKey)}</label>
      <input
        id={field.controlId}
        type="text"
        inputMode={field.keypad}
        autoComplete="off"
        value={field.draft}
        aria-describedby={hintId}
        onChange={(event) => field.onDraftChange(event.target.value)}
      />
      {field.hintKey ? <span id={hintId}>{t(field.hintKey)}</span> : null}
    </p>
  )
}

/**
 * The price slider, spelled out. Same rule as everywhere in this skin: no
 * ornament, and nothing hidden — so the cliffs are a plain list of thresholds
 * under the track rather than ticks drawn on it, which says the same thing
 * without a position to read. The list is absent, not empty, when the rate
 * config says these thresholds do not apply to this purchaser.
 */
function PriceSlider({ field }: { field: PriceSliderField }) {
  const { t } = useTranslation()
  const display = useDisplay()
  const hasMarkers = field.markers.length > 0
  const notesId = hasMarkers ? `plain-${field.controlId}-cliffs` : undefined

  return (
    <div className="plain-field" data-field={field.id} data-importance={field.importance}>
      <label htmlFor={field.controlId}>{t(field.labelKey)}</label>
      <input
        id={field.controlId}
        type="range"
        min={field.min}
        max={field.max}
        step={field.step}
        value={field.value}
        aria-valuetext={inputMoney(field.value, display.locale)}
        aria-describedby={notesId}
        onChange={(event) => field.onChange(Number(event.target.value))}
      />
      {hasMarkers ? (
        <ul id={notesId} aria-label={t(field.markersLabelKey)}>
          {field.markers.map((marker) => (
            <li key={marker.id}>
              <strong>{t(marker.labelKey)}</strong>
              {refText(marker.description, t, display)}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function SelectRow<T extends string>({ field }: { field: ChoiceInputField<T> }) {
  const { t } = useTranslation()
  return (
    <p className="plain-field" data-field={field.id} data-importance={field.importance}>
      <label htmlFor={field.controlId}>{t(field.labelKey)}</label>
      <select
        id={field.controlId}
        value={field.value}
        onChange={(event) => field.onChange(event.target.value as T)}
      >
        {field.options.map((option) => (
          <option key={option.value} value={option.value}>
            {t(option.labelKey)}
          </option>
        ))}
      </select>
    </p>
  )
}

function CheckboxRow({ field }: { field: BooleanInputField }) {
  const { t } = useTranslation()
  return (
    <p
      className="plain-field plain-field-inline"
      data-field={field.id}
      data-importance={field.importance}
    >
      <input
        id={field.controlId}
        type="checkbox"
        checked={field.value}
        onChange={(event) => field.onChange(event.target.checked)}
      />
      <label htmlFor={field.controlId}>{t(field.labelKey)}</label>
    </p>
  )
}

function InputRow({ field }: { field: AnyInputField }) {
  return field.kind === 'boolean' ? <CheckboxRow field={field} /> : <NumberRow field={field} />
}

/**
 * The privacy statement, spelled out. No disclosure — the plain skin hides
 * nothing — so the claim is a paragraph and the specifics are the list under
 * it, in document order, right after the fields they are about.
 */
function PlainPrivacy({ privacy }: { privacy: PrivacyField }) {
  const { t } = useTranslation()
  return (
    <section data-field={privacy.id} data-importance={privacy.importance}>
      <p>
        <strong>{t(privacy.labelKey)}</strong>
      </p>
      <ul>
        {privacy.value.map((point) => (
          <li key={point.termKey}>
            <strong>{t(point.termKey)}</strong>
            {t(point.bodyKey)}
          </li>
        ))}
      </ul>
    </section>
  )
}

function Inputs({ inputs }: { inputs: InputsViewModel }) {
  const { t } = useTranslation()
  return (
    <section aria-label={t(inputs.regionLabelKey)}>
      <h2 data-field={inputs.heading.id} data-importance={inputs.heading.importance}>
        {t(inputs.heading.labelKey)}
      </h2>
      <NumberRow field={inputs.price} />
      <PriceSlider field={inputs.priceSlider} />
      <SelectRow field={inputs.route} />
      <NumberRow field={inputs.depositPct} />
      <SelectRow field={inputs.region} />
      <CheckboxRow field={inputs.firstHomeBuyer} />
      <CheckboxRow field={inputs.ownerOccupier} />
      <CheckboxRow field={inputs.newHome} />
      <NumberRow field={inputs.offThePlanConstruction} />
      <CheckboxRow field={inputs.foreignPurchaser} />
      <NumberRow field={inputs.interestRatePct} />
      <NumberRow field={inputs.savings} />
      <NumberRow field={inputs.preApprovedLoan} />

      <PlainPrivacy privacy={inputs.privacy} />

      {/* No disclosure: nothing here is hidden behind an interaction. */}
      <section data-field={inputs.assumptions.id} data-importance={inputs.assumptions.importance}>
        <h3>{t(inputs.assumptions.labelKey)}</h3>
        {inputs.assumptions.value.map((field) => (
          <InputRow key={field.id} field={field} />
        ))}
      </section>

      <p data-field={inputs.foot.id} data-importance={inputs.foot.importance}>
        {t(inputs.foot.labelKey)}
      </p>
    </section>
  )
}

function Stat({ stat }: { stat: StatField }) {
  const { t } = useTranslation()
  const display = useDisplay()
  return (
    <div data-field={stat.id} data-importance={stat.importance}>
      <dt>{t(stat.labelKey)}</dt>
      <dd>
        <span className="plain-figure">{estimateMoney(stat.value, display)}</span>
        {stat.detail === null ? null : <span>{refText(stat.detail, t, display)}</span>}
      </dd>
    </div>
  )
}

/**
 * The safe maximum bid, spelled out. Same rule as everywhere else in this
 * skin: no ornament, and nothing hidden — but still no figure where the core
 * says there is no ceiling to state, because printing a price there would be
 * inventing one.
 */
function SafeMaxBid({ headingKey, field }: { headingKey: string; field: SafeMaxBidField }) {
  const { t } = useTranslation()
  const display = useDisplay()
  return (
    <section data-field={field.id} data-importance={field.importance}>
      <h2>{t(headingKey)}</h2>
      <h3>{t(field.labelKey)}</h3>
      {field.status === 'bound' ? (
        <p className="plain-figure">{estimateMoney(field.value, display)}</p>
      ) : null}
      <p>{refText(field.summary, t, display)}</p>
      {field.detail === null ? null : <p>{refText(field.detail, t, display)}</p>}
    </section>
  )
}

function Verdict({ verdict }: { verdict: VerdictField }) {
  const { t } = useTranslation()
  const display = useDisplay()
  return (
    <section data-field={verdict.id} data-importance={verdict.importance}>
      <h3>
        {t(verdict.labelKey)}
        {': '}
        {t(verdict.statusKey)}
      </h3>
      <p>{refText(verdict.summary, t, display)}</p>
      {verdict.details.length > 0 ? (
        <ul>
          {verdict.details.map((detail) => (
            <li key={detail.key}>{refText(detail, t, display)}</li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

function SunkCost({ sunk }: { sunk: SunkCostViewModel }) {
  const { t } = useTranslation()
  const display = useDisplay()
  const research = sunk.research.value
  return (
    <section>
      <h2>{t(sunk.headingKey)}</h2>
      <dl className="plain-stats">
        {sunk.stats.map((stat) => (
          <Stat key={stat.id} stat={stat} />
        ))}
      </dl>
      <p data-field={sunk.framing.id} data-importance={sunk.framing.importance}>
        {refText(sunk.framing.value, t, display)}
      </p>
      <p data-field={sunk.research.id} data-importance={sunk.research.importance}>
        {t(research.beforeKey)}
        <a href={research.href}>{t(research.linkKey)}</a>
        {t(research.afterKey)}
      </p>
    </section>
  )
}

function PlainRow({ line }: { line: LineField }) {
  const { t } = useTranslation()
  const display = useDisplay()
  return (
    <tr data-field={line.id} data-importance={line.importance}>
      <th scope="row">{t(line.labelKey)}</th>
      <td className="plain-figure">{estimateRowAmount(line.value, display)}</td>
      <td>{howText(line.how, t, display)}</td>
    </tr>
  )
}

/**
 * A band's guidance, spelled out. No disclosure — the plain skin hides
 * nothing — so the points are simply a list in the band's last row.
 */
function PlainGuidance({ guidance }: { guidance: GuidanceField }) {
  const { t } = useTranslation()
  return (
    <tr className="plain-guidance">
      <td colSpan={3}>
        <strong>{t(guidance.labelKey)}</strong>
        <ul data-field={guidance.id} data-importance={guidance.importance}>
          {guidance.value.map((point) => (
            <li key={point.termKey}>
              <strong>{t(point.termKey)}</strong>
              {t(point.bodyKey)}
            </li>
          ))}
        </ul>
      </td>
    </tr>
  )
}

/**
 * The rate the converted figures were produced at, spelled out: what it is,
 * where it came from, when it was quoted, and a box to replace it with the
 * rate a bank has actually given the reader.
 *
 * No disclosure, as everywhere in this skin — the override box is simply on
 * the page. It is uncontrolled and starts empty rather than seeded with the
 * rate in force: an empty box means "leave it alone", and there is no draft to
 * go stale when a fetched rate arrives behind it.
 */
function ExchangeRate({ field }: { field: ExchangeRateField }) {
  const { t } = useTranslation()
  const display = useDisplay()
  const base = t(field.baseSymbolKey)
  const controlId = field.controlId

  const apply = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    // An unusable figure changes nothing: the core ignores it, and the rate
    // on screen is still a working one.
    field.onOverride(String(new FormData(form).get(controlId) ?? ''))
    form.reset()
  }

  return (
    <section data-field={field.id} data-importance={field.importance}>
      <h3>{t(field.labelKey)}</h3>
      <p>
        <span className="plain-figure">
          {t(field.lineKey, { base, quoted: quotedRate(field.value, display) })}
        </span>
        <span>{refText(field.source, t, display)}</span>
        {field.updatedAt === null ? null : (
          <span>{rateStamp(field.updatedAt, display.locale)}</span>
        )}
      </p>
      {field.manual ? (
        <p>
          <strong>{t(field.actionKeys.manualTag)}</strong>
          <button type="button" onClick={field.onReset}>
            {t(field.actionKeys.reset)}
          </button>
        </p>
      ) : null}
      <form className="plain-field" onSubmit={apply}>
        <label htmlFor={controlId}>{t(field.actionKeys.overrideLabel, { base })}</label>
        <input
          id={controlId}
          name={controlId}
          // Text with a decimal keypad, not type="number": a vi reader types
          // the separators of their own locale, and a number input would
          // reject them, as every other numeric field here does.
          type="text"
          inputMode="decimal"
          autoComplete="off"
          defaultValue=""
          placeholder={rateDraft(field.value, display)}
        />
        <button type="submit">{t(field.actionKeys.apply)}</button>
      </form>
      <p>
        {t(field.noteKey, { currency: t(field.symbolKey), provider: field.providerName })}
      </p>
    </section>
  )
}

function Results({
  display: displayVm,
  results,
}: {
  display: DisplayViewModel
  results: ResultsViewModel
}) {
  const { t } = useTranslation()
  const display = useDisplay()
  return (
    // Named region, not <main>: the inputs are main content too, so the main
    // landmark is in Root, above both. `tabindex="-1"` is what lets the
    // shell's skip link put focus here and not merely scroll to it.
    <section
      id={RESULTS_ANCHOR_ID}
      tabIndex={-1}
      aria-label={t(results.regionLabelKey)}
    >
      {/* The currency the figures below are written in, and the switch for it,
          before the figures rather than after them — including the bid ceiling
          right under it. The switch carries the section's name itself, so
          there is no heading repeating it. */}
      <section className="plain-currency" aria-label={t(displayVm.currency.labelKey)}>
        <Choice field={displayVm.currency} />
        {displayVm.rate === null ? null : <ExchangeRate field={displayVm.rate} />}
      </section>

      <SafeMaxBid headingKey={results.safeMaxBidHeadingKey} field={results.safeMaxBid} />

      <section>
        <h2>{t(results.verdictsHeadingKey)}</h2>
        {results.verdicts.map((verdict) => (
          <Verdict key={verdict.id} verdict={verdict} />
        ))}
      </section>

      <section
        aria-label={t(results.flagsRegionLabelKey)}
        data-field={results.flags.id}
        data-importance={results.flags.importance}
      >
        <h2>{t(results.flagsRegionLabelKey)}</h2>
        <ul>
          {results.flags.value.map((flag) => (
            <li key={`${flag.kind}:${flag.code}`}>
              <strong>{t(KIND_KEYS[flag.kind])}</strong> {flagText(flag, t, display)}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>{t(results.statsHeadingKey)}</h2>
        <dl className="plain-stats">
          {results.stats.map((stat) => (
            <Stat key={stat.id} stat={stat} />
          ))}
        </dl>
      </section>

      <section>
        {/* The table is named by the heading that already introduces it, so
            this skin adds no caption of its own — nothing hidden, nothing
            said twice. */}
        <h2 id={LINES_HEADING_ID}>{t(results.linesHeadingKey)}</h2>
        <div className="plain-table-scroll">
          <table className="plain-lines" aria-labelledby={LINES_HEADING_ID}>
            <thead>
              <tr>
                <th scope="col">{t(results.tableHeadingKeys.line)}</th>
                <th scope="col">{t(results.tableHeadingKeys.amount)}</th>
                <th scope="col">{t(results.tableHeadingKeys.how)}</th>
              </tr>
            </thead>
            {/* One row group per timing band, so the plain skin tells the
                same story as the default one without borrowing its rules. */}
            {results.lineGroups.map((group) => (
              <tbody key={group.band}>
                <tr className="plain-band">
                  <th scope="rowgroup" colSpan={3}>
                    {t(group.labelKey)} — {t(group.noteKey)}
                  </th>
                </tr>
                {group.lines.map((line) => (
                  <PlainRow key={line.id} line={line} />
                ))}
                <PlainRow line={group.subtotal} />
                {group.guidance === null ? null : <PlainGuidance guidance={group.guidance} />}
              </tbody>
            ))}
            <tbody>
              <PlainRow line={results.total} />
            </tbody>
          </table>
        </div>
      </section>

      <SunkCost sunk={results.sunkCost} />

      <p
        className="estimate-note"
        data-field={results.estimateNote.id}
        data-importance={results.estimateNote.importance}
      >
        {results.estimateNote.value.map((ref) => refText(ref, t, display)).join(' ')}
      </p>

      <section>
        <h2>{t(results.notesHeadingKey)}</h2>
        <ul data-field={results.notes.id} data-importance={results.notes.importance}>
          {results.notes.value.map((entry) => (
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
        <p data-field={results.ratesAsAt.id} data-importance={results.ratesAsAt.importance}>
          {t(results.ratesAsAt.value.beforeKey, {
            // The raw ISO date is the fallback: a date the reader can still
            // act on beats dropping the line that says how current these are.
            // display.locale is the active language: a date follows the words
            // around it, not the currency the figures are written in.
            date:
              ratesAsAtDate(results.ratesAsAt.value.asAt, display.locale) ??
              results.ratesAsAt.value.asAt,
          })}
          <a href={results.ratesAsAt.value.href}>{t(results.ratesAsAt.value.linkKey)}</a>
          {t(results.ratesAsAt.value.afterKey)}
        </p>
        <p data-field={results.sources.id} data-importance={results.sources.importance}>
          {t(results.sources.value.beforeKey)}
          <a href={results.sources.value.href}>{t(results.sources.value.linkKey)}</a>
          {t(results.sources.value.afterKey)}
        </p>
      </section>
    </section>
  )
}

/**
 * Rename and delete replace the row's controls, which unmounts whichever one
 * was activated. `useRowModeFocus` marks where focus belongs in each shape so
 * a keyboard reader stays on the row instead of being handed back to the top
 * of the document.
 */
function ScenarioRow({ entry, keys }: { entry: ScenarioEntry; keys: ScenarioActionKeys }) {
  const { t, i18n } = useTranslation()
  const focusRef = useRowModeFocus(entry.mode)
  const date = savedDate(entry.savedAt, i18n.language)
  const questionId = `${entry.controlId}-question`

  if (entry.mode === 'renaming') {
    return (
      <li>
        <label htmlFor={entry.controlId}>{t(keys.renameLabel)}</label>
        <input
          ref={focusRef}
          id={entry.controlId}
          type="text"
          autoComplete="off"
          maxLength={MAX_NAME_LENGTH}
          value={entry.nameDraft}
          onChange={(event) => entry.onNameDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') entry.onRenameCommit()
            if (event.key === 'Escape') entry.onCancel()
          }}
        />
        <button type="button" onClick={entry.onRenameCommit}>
          {t(keys.renameSave)}
        </button>
        <button type="button" onClick={entry.onCancel}>
          {t(keys.cancel)}
        </button>
      </li>
    )
  }

  if (entry.mode === 'confirmingDelete') {
    return (
      <li>
        <span id={questionId}>{t(keys.removeQuestion, { name: entry.name })}</span>
        <button
          ref={focusRef}
          type="button"
          aria-describedby={questionId}
          onClick={entry.onDeleteConfirm}
        >
          {t(keys.remove)}
        </button>
        <button type="button" onClick={entry.onCancel}>
          {t(keys.cancel)}
        </button>
      </li>
    )
  }

  return (
    <li>
      <button
        type="button"
        aria-label={t(keys.loadNamed, { name: entry.name })}
        onClick={entry.onLoad}
      >
        {entry.name}
      </button>
      {date === null ? null : <span>{t(keys.savedAt, { date })}</span>}
      <button
        ref={focusRef}
        type="button"
        aria-label={t(keys.renameNamed, { name: entry.name })}
        onClick={entry.onRenameStart}
      >
        {t(keys.rename)}
      </button>
      <button
        type="button"
        aria-label={t(keys.removeNamed, { name: entry.name })}
        onClick={entry.onDeleteStart}
      >
        {t(keys.remove)}
      </button>
    </li>
  )
}

function Scenarios({ scenarios }: { scenarios: ScenariosViewModel }) {
  const { t } = useTranslation()
  const { heading, save, list, privacy } = scenarios
  useFocusAfterRemoval(list.value.length, save.controlId)

  // No disclosure, as everywhere in this skin: the panel is simply on the page.
  return (
    <section className="plain-scenarios" aria-label={t(scenarios.regionLabelKey)}>
      <h2 data-field={heading.id} data-importance={heading.importance}>
        {t(heading.labelKey)}
      </h2>

      <p className="plain-field" data-field={save.id} data-importance={save.importance}>
        <label htmlFor={save.controlId}>{t(save.labelKey)}</label>
        <input
          id={save.controlId}
          type="text"
          autoComplete="off"
          maxLength={MAX_NAME_LENGTH}
          value={save.value}
          onChange={(event) => save.onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && save.canSave) save.onSave()
          }}
        />
        <button type="button" disabled={!save.canSave} onClick={save.onSave}>
          {t(save.actionLabelKey)}
        </button>
      </p>

      <div data-field={list.id} data-importance={list.importance}>
        <p role="status">{list.errorLabelKey === null ? null : t(list.errorLabelKey)}</p>
        {list.value.length === 0 ? (
          <p>{t(list.emptyLabelKey)}</p>
        ) : (
          <ul aria-label={t(list.labelKey)}>
            {list.value.map((entry) => (
              <ScenarioRow key={entry.id} entry={entry} keys={list.actionKeys} />
            ))}
          </ul>
        )}
      </div>

      <p data-field={privacy.id} data-importance={privacy.importance}>
        {t(privacy.labelKey)}
      </p>
    </section>
  )
}

export function Root({ vm }: { vm: AppViewModel }) {
  const { t } = useTranslation()
  const notice = vm.chrome.notice

  return (
    <DisplayProvider settings={vm.display.settings}>
      <div className="plain-page">
        {notice ? (
          <aside role="note" data-field={notice.id} data-importance={notice.importance}>
            <p>{t(notice.labelKey)}</p>
            <button type="button" onClick={notice.onDismiss}>
              {t(notice.dismissLabelKey)}
            </button>
          </aside>
        ) : null}

        <header>
          <p data-field={vm.chrome.eyebrow.id} data-importance={vm.chrome.eyebrow.importance}>
            {t(vm.chrome.eyebrow.labelKey)}
          </p>
          <h1 data-field={vm.chrome.title.id} data-importance={vm.chrome.title.importance}>
            {t(vm.chrome.title.labelKey)}
          </h1>
          <p data-field={vm.chrome.lede.id} data-importance={vm.chrome.lede.importance}>
            {t(vm.chrome.lede.labelKey)}
          </p>
          <Choice field={vm.controls.language} />
          <Choice field={vm.controls.colorMode} />
          <Choice field={vm.controls.skin} />
          <Action field={vm.controls.print} />
        </header>

        {/* The calculator, inputs included — one main landmark over all of it. */}
        <main>
          <Inputs inputs={vm.inputs} />
          <Scenarios scenarios={vm.scenarios} />
          <Results display={vm.display} results={vm.results} />
        </main>
      </div>
    </DisplayProvider>
  )
}
