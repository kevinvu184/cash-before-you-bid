import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { formatAud, formatRowAmount } from '../../logic/format'
import type { FlagKind } from '../../types/calculator'
import type {
  AnyInputField,
  AppViewModel,
  BooleanInputField,
  ChoiceInputField,
  InputsViewModel,
  NumberInputField,
  ResultsViewModel,
  StatField,
} from '../../types/viewModel'
import { flagText, howText, refText } from '../shared/text'
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
        inputMode="decimal"
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
        <span className="plain-figure">{formatAud(stat.value, i18n.language)}</span>
        {stat.detail === null ? null : <span>{refText(stat.detail, t, i18n.language)}</span>}
      </dd>
    </div>
  )
}

function Results({ results }: { results: ResultsViewModel }) {
  const { t, i18n } = useTranslation()
  return (
    <main>
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
            <tbody>
              {results.lines.map((line) => (
                <tr key={line.id} data-field={line.id} data-importance={line.importance}>
                  <th scope="row">{t(line.labelKey)}</th>
                  <td className="plain-figure">{formatRowAmount(line.value, i18n.language)}</td>
                  <td>{howText(line.how, t, i18n.language)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

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
        <p data-field={results.sources.id} data-importance={results.sources.importance}>
          {t(results.sources.value.beforeKey)}
          <a href={results.sources.value.href}>{t(results.sources.value.linkKey)}</a>
          {t(results.sources.value.afterKey)}
        </p>
      </section>
    </main>
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
      <Results results={vm.results} />
    </div>
  )
}
