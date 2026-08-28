import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { MAX_NAME_LENGTH } from '../../logic/scenarioStore'
import type { ScenarioActionKeys, ScenarioEntry, ScenariosViewModel } from '../../types/viewModel'
import { savedDate } from '../shared/text'

/**
 * Last Saturday's numbers, kept next to this Saturday's. A row is a single
 * control that loads the scenario, plus rename and delete; each is a plain
 * button at 44px, nothing appears on hover, and rename and delete swap the row
 * for a small form rather than opening anything that needs a pointer.
 */

function Actions({ children }: { children: ReactNode }) {
  return <div className="scenario-actions">{children}</div>
}

function RenameRow({ entry, keys }: { entry: ScenarioEntry; keys: ScenarioActionKeys }) {
  const { t } = useTranslation()
  return (
    <li className="scenario scenario-form">
      <label className="scenario-form-label" htmlFor={entry.controlId}>
        {t(keys.renameLabel)}
      </label>
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
      <Actions>
        <button type="button" className="scenario-action" onClick={entry.onRenameCommit}>
          {t(keys.renameSave)}
        </button>
        <button type="button" className="scenario-action" onClick={entry.onCancel}>
          {t(keys.cancel)}
        </button>
      </Actions>
    </li>
  )
}

function DeleteRow({ entry, keys }: { entry: ScenarioEntry; keys: ScenarioActionKeys }) {
  const { t } = useTranslation()
  return (
    <li className="scenario scenario-form">
      <p className="scenario-question">{t(keys.removeQuestion, { name: entry.name })}</p>
      <Actions>
        <button
          type="button"
          className="scenario-action scenario-action-danger"
          onClick={entry.onDeleteConfirm}
        >
          {t(keys.remove)}
        </button>
        <button type="button" className="scenario-action" onClick={entry.onCancel}>
          {t(keys.cancel)}
        </button>
      </Actions>
    </li>
  )
}

function IdleRow({ entry, keys }: { entry: ScenarioEntry; keys: ScenarioActionKeys }) {
  const { t, i18n } = useTranslation()
  return (
    <li className="scenario">
      <button
        type="button"
        className="scenario-load"
        aria-label={t(keys.loadNamed, { name: entry.name })}
        onClick={entry.onLoad}
      >
        <span className="scenario-name">{entry.name}</span>
        {entry.savedAt > 0 ? (
          <span className="scenario-date">
            {t(keys.savedAt, { date: savedDate(entry.savedAt, i18n.language) })}
          </span>
        ) : null}
      </button>
      <Actions>
        <button
          type="button"
          className="scenario-action"
          aria-label={t(keys.renameNamed, { name: entry.name })}
          onClick={entry.onRenameStart}
        >
          {t(keys.rename)}
        </button>
        <button
          type="button"
          className="scenario-action scenario-action-danger"
          aria-label={t(keys.removeNamed, { name: entry.name })}
          onClick={entry.onDeleteStart}
        >
          {t(keys.remove)}
        </button>
      </Actions>
    </li>
  )
}

function Row({ entry, keys }: { entry: ScenarioEntry; keys: ScenarioActionKeys }) {
  if (entry.mode === 'renaming') return <RenameRow entry={entry} keys={keys} />
  if (entry.mode === 'confirmingDelete') return <DeleteRow entry={entry} keys={keys} />
  return <IdleRow entry={entry} keys={keys} />
}

export function Scenarios({ scenarios }: { scenarios: ScenariosViewModel }) {
  const { t } = useTranslation()
  const { heading, save, list, privacy } = scenarios

  return (
    <section className="scenarios" aria-label={t(scenarios.regionLabelKey)}>
      {/* Collapsed by default so it never pushes the calculator down the page;
          the fields inside stay in the document either way. */}
      <details className="scenarios-disclosure">
        <summary data-field={heading.id} data-importance={heading.importance}>
          {t(heading.labelKey)}
        </summary>

        <div className="scenario-save" data-field={save.id} data-importance={save.importance}>
          <label htmlFor={save.controlId}>{t(save.labelKey)}</label>
          <div className="scenario-save-row">
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
            <button
              type="button"
              className="scenario-action scenario-action-primary"
              disabled={!save.canSave}
              onClick={save.onSave}
            >
              {t(save.actionLabelKey)}
            </button>
          </div>
        </div>

        <div data-field={list.id} data-importance={list.importance}>
          {/* Always in the document, so a failure announces itself rather than
              appearing silently below the fold. */}
          <p className="scenario-error" role="status">
            {list.errorLabelKey === null ? null : t(list.errorLabelKey)}
          </p>
          {list.value.length === 0 ? (
            <p className="scenario-empty">{t(list.emptyLabelKey)}</p>
          ) : (
            <ul className="scenario-list" aria-label={t(list.labelKey)}>
              {list.value.map((entry) => (
                <Row key={entry.id} entry={entry} keys={list.actionKeys} />
              ))}
            </ul>
          )}
        </div>

        <p
          className="scenario-privacy"
          data-field={privacy.id}
          data-importance={privacy.importance}
        >
          {t(privacy.labelKey)}
        </p>
      </details>
    </section>
  )
}
