import { useRef } from 'react'
import type { AppViewModel } from '../../types/viewModel'
import { useScrolledPast } from '../shared/useScrolledPast'
import { InputsPanel } from './Inputs'
import { Masthead } from './Masthead'
import { Results } from './Results'
import { Scenarios } from './Scenarios'
import { StickyTotal } from './StickyTotal'
import './skin.css'

/**
 * The Ledger page: warm cream paper, hairline rules, an ink total strip.
 * Everything it draws comes from the view model — it calculates nothing,
 * touches neither the URL nor storage, and adds no information of its own.
 */
export function Root({ vm }: { vm: AppViewModel }) {
  const header = useRef<HTMLElement>(null)
  const headerGone = useScrolledPast(header)
  const total = vm.results.stats[0]

  return (
    <>
      {total ? <StickyTotal total={total} shown={headerGone} /> : null}
      <div className="page">
        <Masthead vm={vm} headerRef={header} />

        <Scenarios scenarios={vm.scenarios} />

        <div className="columns">
          <InputsPanel inputs={vm.inputs} />
          <Results results={vm.results} />
        </div>
      </div>
    </>
  )
}
