import { useRef } from 'react'
import './App.css'
import { FlagList } from './components/FlagList'
import { InputsPanel } from './components/InputsPanel'
import { LineTable } from './components/LineTable'
import { RulesNotes } from './components/RulesNotes'
import { StatRow } from './components/StatRow'
import { StickyTotal } from './components/StickyTotal'
import { useCalculator } from './hooks/useCalculator'
import { useScrolledPast } from './hooks/useScrolledPast'

function App() {
  const { inputs, result, setField, setRoute } = useCalculator()
  const header = useRef<HTMLElement>(null)
  const headerGone = useScrolledPast(header)

  return (
    <>
      <StickyTotal total={result.tiles.total.value} shown={headerGone} />
      <div className="page">
        <header className="masthead" ref={header}>
          <span className="eyebrow">Victoria · first home buyers · calculator</span>
          <h1>Cash Before You Bid</h1>
          <p className="lede">
            Deposit, stamp duty, government fees, LMI, inspections, moving and a repayment buffer —
            everything you need in the bank before you sign, with the maths shown line by line.
          </p>
        </header>

        <div className="columns">
          <InputsPanel
            inputs={inputs}
            depositHint={result.depositHint}
            setField={setField}
            setRoute={setRoute}
          />
          <main className="results">
            <FlagList flags={result.flags} />
            <StatRow tiles={result.tiles} />
            <LineTable rows={result.rows} />
            <RulesNotes />
          </main>
        </div>
      </div>
    </>
  )
}

export default App
