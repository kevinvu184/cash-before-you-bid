export function RulesNotes() {
  return (
    <section className="notes">
      <h3>Notes on the rules used</h3>
      <ul className="small">
        <li>
          <strong>Stamp duty</strong> (Victoria, general rates): 1.4% to $25k; $350 + 2.4% to $130k;
          $2,870 + 6% of the excess over $130k to $960k; 5.5% flat to $2m; $110,000 + 6.5% above.
          Owner-occupiers ≤ $550k use the PPR rates ($2,870 + 5% over $130k to $440k; $18,370 + 6%
          over $440k). First home buyers: $0 to $600k, then general duty × (value − $600k) ÷ $150k up
          to $750k. Off-the-plan: dutiable value = price − construction still to be built (temporary
          all-buyer version for strata contracts to 20 Apr 2027). Foreign purchasers +8%.
        </li>
        <li>
          <strong>Government fees</strong> (Land Services Victoria 2026-27, PEXA FY27): transfer
          $104.30 + $2.34 per whole $1,000, capped at $3,614, rounded up; mortgage registration
          $129.20; PEXA transfer $146.30 and mortgage $74.14.
        </li>
        <li>
          <strong>LMI</strong>: indicative, interpolated from Helia-derived tables — about 0.4% of
          the loan at 81% LVR, 1.2% at 85%, 2.25% at 90%, 4.0% at 95% — plus 10% Victorian insurance
          duty. Get a real quote; lenders and insurers differ.
        </li>
        <li>
          <strong>5% Deposit Scheme</strong>: no LMI; deposit 5–19.99%; price cap $950k
          Melbourne/Geelong, $650k elsewhere; owner-occupier citizens/PRs.{' '}
          <strong>Help to Buy</strong>: 2% minimum deposit; government equity 30% existing / 40% new;
          income caps $103k single / $165k couple; citizens only; same price caps.
        </li>
        <li>
          <strong>First Home Owner Grant</strong>: $10,000, new homes ≤ $750k, first home buyers;
          usually paid at settlement through the lender, so it is shown here as reducing the cash you
          need.
        </li>
        <li>
          <strong>Repayment</strong>: principal and interest over 30 years at your rate; the lender
          assesses you at your rate + 3 percentage points (APRA). Buffer = months × repayment at your
          rate + $1,000.
        </li>
      </ul>
      <p className="small">
        Sources and the full explanation are in the{' '}
        <a href="https://claude.ai/code/artifact/de316b0d-babe-464d-91c1-c5c12d735ed3">
          Victorian First Home Roadmap
        </a>
        . General information only, not personal legal, tax or credit advice.
      </p>
    </section>
  )
}
