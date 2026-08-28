import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { MAX_NAME_LENGTH } from '../../logic/scenarioStore'
import type { ScenarioActionKeys, ScenarioEntry, ScenariosViewModel } from '../../types/viewModel'
import { useFocusAfterRemoval, useRowModeFocus } from '../shared/scenarioFocus'
import { savedDate } from '../shared/text'

/**
 * Last Saturday's numbers, kept next to this Saturday's. A row is a single
 * control that loads the scenario, plus rename and delete; each is a plain
 * button at 44px, nothing appears on hover, and rename and delete swap the row
 * for a small form rather than opening anything that needs a pointer.
 *
 * Because that swap unmounts the control that was just activated, each shape
 * marks where focus belongs (`useRowModeFocus`) and the panel catches the one
 * case a row cannot, its own removal (`useFocusAfterRemoval`).
 */

/** A row shape, plus where focus belongs while the row is in it. */
interface RowShapeProps {
  entry: ScenarioEntry
  keys: ScenarioActionKeys
  focusRef: (element: HTMLElement | null) => void
}

function Actions({ children }: { children: ReactNode }) {
  return <div className="scenario-actions">{children}</div>
}

function RenameRow({ entry, keys, focusRef }: RowShapeProps) {
  const { t } = useTranslation()
  return (
    <li className="scenario scenario-form">
      <label className="scenario-form-label" htmlFor={entry.controlId}>
        {t(keys.renameLabel)}
      </label>
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

function DeleteRow({ entry, keys, focusRef }: RowShapeProps) {
  const { t } = useTranslation()
  const questionId = `${entry.controlId}-question`
  return (
    <li className="scenario scenario-form">
      <p className="scenario-question" id={questionId}>
        {t(keys.removeQuestion, { name: entry.name })}
      </p>
      <Actions>
        {/* Described by the question, so taking focus reads "Remove — remove
            12 Rose St?" rather than a bare verb. */}
        <button
          ref={focusRef}
          type="button"
          className="scenario-action scenario-action-danger"
          aria-describedby={questionId}
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

function IdleRow({ entry, keys, focusRef }: RowShapeProps) {
  const { t, i18n } = useTranslation()
  const date = savedDate(entry.savedAt, i18n.language)
  return (
    <li className="scenario">
      <button
        type="button"
        className="scenario-load"
        aria-label={t(keys.loadNamed, { name: entry.name })}
        onClick={entry.onLoad}
      >
        <span className="scenario-name">{entry.name}</span>
        {date === null ? null : <span className="scenario-date">{t(keys.savedAt, { date })}</span>}
      </button>
      <Actions>
        {/* Where focus comes back to from either form: it is the control that
            opened one, and it names the row it belongs to. */}
        <button
          ref={focusRef}
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

/**
 * The three shapes are separate components, so the mode hook has to live here,
 * in the one component that survives the swap between them: called inside a
 * shape it would mount already believing it was in its own mode, see no
 * change, and move nothing.
 */
function Row({ entry, keys }: { entry: ScenarioEntry; keys: ScenarioActionKeys }) {
  const focusRef = useRowModeFocus(entry.mode)
  const props = { entry, keys, focusRef }
  if (entry.mode === 'renaming') return <RenameRow {...props} />
  if (entry.mode === 'confirmingDelete') return <DeleteRow {...props} />
  return <IdleRow {...props} />
}

export function Scenarios({ scenarios }: { scenarios: ScenariosViewModel }) {
  const { t } = useTranslation()
  const { heading, save, list, privacy } = scenarios
  useFocusAfterRemoval(list.value.length, save.controlId)

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
