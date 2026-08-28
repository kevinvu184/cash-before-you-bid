import { useState } from 'react'
import { MAX_SCENARIOS, normaliseName } from '../logic/scenarioStore'
import type { ScenarioActionKeys, ScenarioEntry, ScenariosViewModel } from '../types/viewModel'
import { useSavedScenarios, type ScenarioStoreError } from './useSavedScenarios'

// The saved-scenarios panel, assembled above the skin boundary like every
// other part of the view model. Two pieces of state live here rather than in a
// skin: the name being typed, and which row is mid-rename or awaiting a delete
// confirmation. Both are core interaction state — switching skin must not lose
// a half-typed name — and holding them here means two skins cannot disagree
// about what "renaming" does.

const ERROR_KEY: Readonly<Record<ScenarioStoreError, string>> = {
  unavailable: 'scenarios.errorUnavailable',
  full: 'scenarios.errorFull',
}

const ACTION_KEYS: ScenarioActionKeys = {
  loadNamed: 'scenarios.loadNamed',
  rename: 'scenarios.rename',
  renameNamed: 'scenarios.renameNamed',
  renameLabel: 'scenarios.renameLabel',
  renameSave: 'scenarios.renameSave',
  remove: 'scenarios.remove',
  removeNamed: 'scenarios.removeNamed',
  removeQuestion: 'scenarios.removeQuestion',
  cancel: 'scenarios.cancel',
  savedAt: 'scenarios.savedAt',
}

/**
 * The line under the list: what went wrong, if anything. The cap reads to the
 * user exactly as a full quota does — this one was not saved, and here is what
 * to do about it — so it is reported through the same line.
 */
function errorKeyFor(error: ScenarioStoreError | null, count: number): string | null {
  if (error !== null) return ERROR_KEY[error]
  return count >= MAX_SCENARIOS ? 'scenarios.errorFull' : null
}

type RowState =
  | { id: string; mode: 'renaming'; draft: string }
  | { id: string; mode: 'confirmingDelete' }

/**
 * @param currentQuery the query string that reproduces what is on screen now —
 *   what "save" remembers.
 * @param loadScenario applies a stored query string to the app.
 */
export function useScenariosViewModel(
  currentQuery: string,
  loadScenario: (query: string) => void,
): ScenariosViewModel {
  const store = useSavedScenarios()
  const [nameDraft, setNameDraft] = useState('')
  const [row, setRow] = useState<RowState | null>(null)

  const entries: readonly ScenarioEntry[] = store.scenarios.map((scenario) => {
    const active = row?.id === scenario.id ? row : null
    return {
      id: scenario.id,
      name: scenario.name,
      savedAt: scenario.savedAt,
      mode: active?.mode ?? 'idle',
      controlId: `scenario-name-${scenario.id}`,
      nameDraft: active?.mode === 'renaming' ? active.draft : scenario.name,
      onLoad: () => loadScenario(scenario.query),
      onRenameStart: () => setRow({ id: scenario.id, mode: 'renaming', draft: scenario.name }),
      onNameDraftChange: (raw) =>
        setRow((prev) =>
          prev !== null && prev.id === scenario.id && prev.mode === 'renaming'
            ? { ...prev, draft: raw }
            : prev,
        ),
      onRenameCommit: () => {
        // A name cleared to nothing is a slip, not an instruction: the row
        // stays open with the text still there to fix.
        if (active?.mode !== 'renaming' || normaliseName(active.draft) === '') return
        store.rename(scenario.id, active.draft)
        setRow(null)
      },
      onDeleteStart: () => setRow({ id: scenario.id, mode: 'confirmingDelete' }),
      onDeleteConfirm: () => {
        store.remove(scenario.id)
        setRow(null)
      },
      onCancel: () => setRow(null),
    }
  })

  return {
    regionLabelKey: 'scenarios.label',
    heading: {
      id: 'scenariosHeading',
      labelKey: 'scenarios.heading',
      value: null,
      kind: 'text',
      importance: 'secondary',
    },
    save: {
      id: 'scenarioSave',
      controlId: 'scenario-name',
      labelKey: 'scenarios.nameLabel',
      value: nameDraft,
      kind: 'text',
      importance: 'primary',
      actionLabelKey: 'scenarios.save',
      canSave: normaliseName(nameDraft) !== '',
      onDraftChange: setNameDraft,
      onSave: () => {
        // The name box is cleared only on a save that actually stored
        // something; a refused save leaves the text there to try again.
        if (store.save(nameDraft, currentQuery)) setNameDraft('')
      },
    },
    list: {
      id: 'scenarioList',
      labelKey: 'scenarios.listLabel',
      value: entries,
      kind: 'text',
      importance: 'secondary',
      emptyLabelKey: 'scenarios.empty',
      errorLabelKey: errorKeyFor(store.error, store.scenarios.length),
      actionKeys: ACTION_KEYS,
    },
    privacy: {
      id: 'scenarioPrivacy',
      labelKey: 'scenarios.privacy',
      value: null,
      kind: 'text',
      importance: 'secondary',
    },
  }
}
