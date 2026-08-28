import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { MAX_NAME_LENGTH } from '../../logic/scenarioStore'
import type { FlagKind } from '../../types/calculator'
import type {
  AnyInputField,
  AppViewModel,
  BooleanInputField,
  ChoiceInputField,
  GuidanceField,
  InputsViewModel,
  LineField,
  NumberInputField,
  ResultsViewModel,
  SafeMaxBidField,
  ScenarioActionKeys,
  ScenarioEntry,
  ScenariosViewModel,
  StatField,
  VerdictField,
  SunkCostViewModel,
} from '../../types/viewModel'
import {
  estimateMoney,
  estimateRowAmount,
  flagText,
  howText,
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

function Inputs({ inputs }: { inputs: InputsViewModel }) {
  const { t } = useTranslation()
  return (
    <section aria-label={t(inputs.regionLabelKey)}>
      <h2 data-field={inputs.heading.id} data-importance={inputs.heading.importance}>
        {t(inputs.heading.labelKey)}
      </h2>
      <NumberRow field={inputs.price} />
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
  const { t, i18n } = useTranslation()
  return (
    <div data-field={stat.id} data-importance={stat.importance}>
      <dt>{t(stat.labelKey)}</dt>
      <dd>
        <span className="plain-figure">{estimateMoney(stat.value, i18n.language)}</span>
        {stat.detail === null ? null : <span>{refText(stat.detail, t, i18n.language)}</span>}
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
  const { t, i18n } = useTranslation()
  return (
    <section data-field={field.id} data-importance={field.importance}>
      <h2>{t(headingKey)}</h2>
      <h3>{t(field.labelKey)}</h3>
      {field.status === 'bound' ? (
        <p className="plain-figure">{estimateMoney(field.value, i18n.language)}</p>
      ) : null}
      <p>{refText(field.summary, t, i18n.language)}</p>
      {field.detail === null ? null : <p>{refText(field.detail, t, i18n.language)}</p>}
    </section>
  )
}

function Verdict({ verdict }: { verdict: VerdictField }) {
  const { t, i18n } = useTranslation()
  return (
    <section data-field={verdict.id} data-importance={verdict.importance}>
      <h3>
        {t(verdict.labelKey)}
        {': '}
        {t(verdict.statusKey)}
      </h3>
      <p>{refText(verdict.summary, t, i18n.language)}</p>
      {verdict.details.length > 0 ? (
        <ul>
          {verdict.details.map((detail) => (
            <li key={detail.key}>{refText(detail, t, i18n.language)}</li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

function SunkCost({ sunk }: { sunk: SunkCostViewModel }) {
  const { t, i18n } = useTranslation()
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
        {refText(sunk.framing.value, t, i18n.language)}
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
  const { t, i18n } = useTranslation()
  return (
    <tr data-field={line.id} data-importance={line.importance}>
      <th scope="row">{t(line.labelKey)}</th>
      <td className="plain-figure">{estimateRowAmount(line.value, i18n.language)}</td>
      <td>{howText(line.how, t, i18n.language)}</td>
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

function Results({ results }: { results: ResultsViewModel }) {
  const { t, i18n } = useTranslation()
  return (
    <main>
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
              <strong>{t(KIND_KEYS[flag.kind])}</strong> {flagText(flag, t, i18n.language)}
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
        <h2>{t(results.linesHeadingKey)}</h2>
        <div className="plain-table-scroll">
          <table className="plain-lines">
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
        {results.estimateNote.value.map((ref) => refText(ref, t, i18n.language)).join(' ')}
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
            date: ratesAsAtDate(results.ratesAsAt.value.asAt, i18n.language) ??
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
    </main>
  )
}

function ScenarioRow({ entry, keys }: { entry: ScenarioEntry; keys: ScenarioActionKeys }) {
  const { t, i18n } = useTranslation()
  const date = savedDate(entry.savedAt, i18n.language)

  if (entry.mode === 'renaming') {
    return (
      <li>
        <label htmlFor={entry.controlId}>{t(keys.renameLabel)}</label>
        <input
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
        <span>{t(keys.removeQuestion, { name: entry.name })}</span>
        <button type="button" onClick={entry.onDeleteConfirm}>
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
      </header>

      <Inputs inputs={vm.inputs} />
      <Scenarios scenarios={vm.scenarios} />
      <Results results={vm.results} />
    </div>
  )
}
