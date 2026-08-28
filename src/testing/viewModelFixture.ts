import { rowBand } from '../logic/bands'
import { buildLineFields } from '../logic/lineFields'
import { assessReadiness } from '../logic/verdict'
import { buildVerdictFields } from '../logic/verdictFields'
import type { ColorMode, SkinId } from '../logic/skins'
import type { Lang } from '../logic/lang'
import {
  type AppViewModel,
  type BooleanInputField,
  type FieldId,
  type LineField,
  type NumberInputField,
  type StatField,
} from '../types/viewModel'
import {
  DEPOSIT_HINT_KEY,
  LANGUAGE_OPTIONS,
  MODE_OPTIONS,
  NOTE_ENTRIES,
  REGION_OPTIONS,
  ROUTE_OPTIONS,
  SKIN_OPTIONS,
  SOURCES,
} from '../logic/fieldLabels'
import type { CalculationTotals, RowCode, TableRow } from '../types/calculator'

/**
 * A fixed view model that carries every FieldId at once, so the parity test can
 * assert an exact set rather than whatever a particular calculation happened to
 * produce. It is deliberately hand-built: no single set of inputs yields both
 * the foreign purchaser duty line and the first home owner grant line, because
 * the grant is not available to foreign purchasers.
 *
 * The numbers are arbitrary but distinct, so a skin that renders the wrong
 * field's value in the wrong place fails the text assertions.
 */

const noop = () => {}

function number(
  id: FieldId,
  controlId: string,
  labelKey: string,
  value: number,
  kind: 'money' | 'number' | 'percent',
  hintKey: string | null = null,
  importance: 'primary' | 'secondary' = 'secondary',
): NumberInputField {
  return {
    id,
    controlId,
    labelKey,
    value,
    kind,
    importance,
    draft: String(value),
    hintKey,
    onDraftChange: noop,
  }
}

function boolean(
  id: FieldId,
  controlId: string,
  labelKey: string,
  value: boolean,
): BooleanInputField {
  return {
    id,
    controlId,
    labelKey,
    value,
    kind: 'boolean',
    importance: 'secondary',
    onChange: noop,
  }
}

const STATS: readonly StatField[] = [
  {
    id: 'statTotal',
    labelKey: 'stats.totalLabel',
    value: 111_111,
    kind: 'money',
    importance: 'primary',
    detail: {
      key: 'stats.totalSub',
      params: {
        deposit: { format: 'money', value: 41_000 },
        costs: { format: 'money', value: 22_000 },
        moving: { format: 'money', value: 4300 },
        buffer: { format: 'money', value: 8100 },
      },
    },
  },
  {
    id: 'statDeposit',
    labelKey: 'stats.depositLabel',
    value: 41_000,
    kind: 'money',
    importance: 'secondary',
    detail: {
      key: 'stats.depositSub',
      params: {
        pct: { format: 'percent', value: 5 },
        price: { format: 'moneyExact', value: 820_000 },
      },
    },
  },
  {
    id: 'statCosts',
    labelKey: 'stats.costsLabel',
    value: 22_000,
    kind: 'money',
    importance: 'secondary',
    detail: {
      key: 'stats.costsSub',
      params: { pct: { format: 'percent', value: 2.68 } },
    },
  },
  {
    id: 'statLoan',
    labelKey: 'stats.loanLabel',
    value: 779_000,
    kind: 'money',
    importance: 'secondary',
    detail: {
      key: 'stats.loanSubWithEquity',
      params: {
        lvr: { format: 'percent', value: 95 },
        equity: { format: 'money', value: 246_000 },
      },
    },
  },
  {
    id: 'statRepayment',
    labelKey: 'stats.repaymentLabel',
    value: 4771,
    kind: 'money',
    importance: 'secondary',
    detail: {
      key: 'stats.repaymentSub',
      params: {
        rate: { format: 'percent', value: 6.2 },
        assessedRate: { format: 'percent', value: 9.2 },
        assessed: { format: 'money', value: 6402 },
      },
    },
  },
]

// Every row code, each with a distinct amount and a working to render.
const LINE_SOURCE: ReadonlyArray<[RowCode, number, LineField['how'], boolean]> = [
  ['deposit', 41_000, { code: 'deposit', params: { pct: 5, price: 820_000 } }, false],
  ['stampDuty', 44_820, { code: 'dutyGeneral', params: { dutiableValue: 820_000 } }, false],
  ['foreignDuty', 65_600, { code: 'foreignDuty', params: { dutiableValue: 820_000 } }, false],
  ['transferFee', 2024, { code: 'transferFee', params: { thousands: 820 } }, false],
  ['mortgageFee', 129.2, { code: 'mortgageFeeLoan' }, false],
  ['pexaFees', 220.44, { code: 'pexaBoth' }, false],
  [
    'lmi',
    31_218,
    {
      code: 'lmiCharged',
      params: { loan: 779_000, ratePct: 3.64, lvrPct: 95 },
    },
    false,
  ],
  ['conveyancing', 1600, { code: 'conveyancing' }, false],
  ['buildingAndPest', 550, { code: 'yourFigure' }, false],
  ['lenderFees', 300, { code: 'yourFigure' }, false],
  ['settlementAdjustments', 800, { code: 'settlementAdjustments' }, false],
  ['buildingInsurance', 1500, { code: 'buildingInsurance' }, false],
  ['grant', -10_000, { code: 'grant' }, false],
  ['costsSubtotal', 138_741, { code: 'costsSubtotal' }, true],
  ['moving', 4300, { code: 'yourFigure' }, false],
  ['buffer', 15_313, { code: 'buffer', params: { months: 3, repayment: 4771 } }, false],
  ['total', 199_354, { code: 'total' }, true],
]

const ROWS: readonly TableRow[] = LINE_SOURCE.map(([code, value, how, emphasis]) => ({
  code,
  amount: value,
  how,
  emphasis,
  band: rowBand(code),
}))

// Banded and subtotalled through the same builder the live view model uses,
// so the fixture cannot drift from what a skin actually receives.
const LINES = buildLineFields(ROWS)

/**
 * Only the totals the verdict reads. The rest are zeroed: this fixture exists
 * to carry every field at once, not to be a coherent calculation.
 */
const TOTALS: CalculationTotals = {
  deposit: 41_000,
  purchaseCosts: 138_741,
  loan: 779_000,
  lvrPct: 95,
  monthlyRepayment: 4771,
  assessedRepayment: 6402,
  buffer: 15_313,
  totalCash: 199_354,
  governmentEquity: 246_000,
  lmiPremium: 31_218,
  lmiCash: 31_218,
  stampDuty: 44_820,
  dutiableValue: 820_000,
  grant: 10_000,
}

/**
 * Savings that cover the deposit but not settlement, against a pre-approval
 * below the loan needed: one covered verdict, one short in both pockets, so a
 * skin that drops the covered case or the second shortfall line is caught.
 * Run through the live assessor and builder, so the fixture cannot drift from
 * what a skin actually receives.
 */
const VERDICTS = buildVerdictFields(
  assessReadiness(
    { rows: ROWS, totals: TOTALS },
    { savings: 60_000, preApprovedLoan: 700_000 },
  ),
)

export interface FixtureOptions {
  locale?: Lang
  skinId?: SkinId
  resolvedMode?: ColorMode
}

export function viewModelFixture(options: FixtureOptions = {}): AppViewModel {
  const locale = options.locale ?? 'en'
  const skinId = options.skinId ?? 'default'
  return {
    locale,
    skinId,
    resolvedMode: options.resolvedMode ?? 'light',
    chrome: {
      eyebrow: {
        id: 'eyebrow',
        labelKey: 'app.eyebrow',
        value: null,
        kind: 'text',
        importance: 'secondary',
      },
      title: {
        id: 'title',
        labelKey: 'app.title',
        value: null,
        kind: 'text',
        importance: 'primary',
      },
      lede: {
        id: 'lede',
        labelKey: 'app.lede',
        value: null,
        kind: 'text',
        importance: 'secondary',
      },
      notice: {
        id: 'translationNotice',
        labelKey: 'notice.aiTranslation',
        value: null,
        kind: 'text',
        importance: 'secondary',
        dismissLabelKey: 'notice.dismiss',
        onDismiss: noop,
      },
    },
    controls: {
      language: {
        id: 'language',
        controlId: 'lang',
        labelKey: 'switcher.label',
        value: locale,
        kind: 'text',
        importance: 'secondary',
        options: LANGUAGE_OPTIONS,
        onChange: noop,
      },
      skin: {
        id: 'skin',
        controlId: 'skin',
        labelKey: 'skins.label',
        value: skinId,
        kind: 'text',
        importance: 'secondary',
        options: SKIN_OPTIONS,
        onChange: noop,
      },
      colorMode: {
        id: 'colorMode',
        controlId: 'mode',
        labelKey: 'mode.label',
        value: 'system',
        kind: 'text',
        importance: 'secondary',
        options: MODE_OPTIONS,
        onChange: noop,
      },
    },
    inputs: {
      regionLabelKey: 'inputs.label',
      heading: {
        id: 'inputsHeading',
        labelKey: 'inputs.heading',
        value: null,
        kind: 'text',
        importance: 'secondary',
      },
      price: number('price', 'price', 'inputs.price', 820_000, 'money', null, 'primary'),
      route: {
        id: 'route',
        controlId: 'route',
        labelKey: 'inputs.route',
        value: 'lmi',
        kind: 'text',
        importance: 'primary',
        options: ROUTE_OPTIONS,
        onChange: noop,
      },
      depositPct: number(
        'depositPct',
        'dep',
        'inputs.deposit',
        5,
        'percent',
        DEPOSIT_HINT_KEY.lmi,
        'primary',
      ),
      region: {
        id: 'region',
        controlId: 'region',
        labelKey: 'inputs.region',
        value: 'regional',
        kind: 'text',
        importance: 'secondary',
        options: REGION_OPTIONS,
        onChange: noop,
      },
      firstHomeBuyer: boolean('firstHomeBuyer', 'fhb', 'inputs.fhb', true),
      ownerOccupier: boolean('ownerOccupier', 'ppr', 'inputs.ppr', true),
      newHome: boolean('newHome', 'newhome', 'inputs.newHome', true),
      offThePlanConstruction: number(
        'offThePlanConstruction',
        'otp',
        'inputs.otp',
        150_000,
        'money',
        'inputs.otpHint',
      ),
      foreignPurchaser: boolean('foreignPurchaser', 'foreign', 'inputs.foreign', true),
      interestRatePct: number('interestRatePct', 'rate', 'inputs.rate', 6.2, 'percent'),
      savings: number(
        'savings',
        'save',
        'inputs.savings',
        60_000,
        'money',
        'inputs.savingsHint',
        'primary',
      ),
      preApprovedLoan: number(
        'preApprovedLoan',
        'loan',
        'inputs.preApprovedLoan',
        700_000,
        'money',
        'inputs.preApprovedLoanHint',
        'primary',
      ),
      assumptions: {
        id: 'assumptions',
        labelKey: 'inputs.assumptions',
        kind: 'text',
        importance: 'secondary',
        value: [
          number('conveyancing', 'conv', 'inputs.conveyancing', 1600, 'money'),
          number('buildingAndPest', 'bp', 'inputs.buildingAndPest', 550, 'money'),
          number('lenderFees', 'lender', 'inputs.lenderFees', 300, 'money'),
          number('settlementAdjustments', 'adj', 'inputs.settlementAdjustments', 800, 'money'),
          number('buildingInsurance', 'ins', 'inputs.buildingInsurance', 1500, 'money'),
          number('movingCosts', 'move', 'inputs.moving', 4300, 'money'),
          number('bufferMonths', 'bufm', 'inputs.bufferMonths', 3, 'number'),
          boolean('capitaliseLmi', 'caplmi', 'inputs.capitaliseLmi', false),
        ],
      },
      foot: {
        id: 'panelFoot',
        labelKey: 'inputs.foot',
        value: null,
        kind: 'text',
        importance: 'secondary',
      },
    },
    results: {
      flagsRegionLabelKey: 'results.flagsLabel',
      flags: {
        id: 'flags',
        labelKey: 'results.flagsLabel',
        kind: 'text',
        importance: 'primary',
        value: [
          { kind: 'warn', code: 'schemeCapExceeded', params: { cap: 650_000 } },
          { kind: 'note', code: 'genuineSavings' },
          {
            kind: 'ok',
            code: 'serviceability',
            params: { assessed: 6402, ratePct: 9.2 },
          },
        ],
      },
      statsHeadingKey: 'results.statsHeading',
      stats: STATS,
      verdictsHeadingKey: 'results.verdictsHeading',
      verdicts: VERDICTS,
      linesHeadingKey: 'results.linesHeading',
      tableHeadingKeys: {
        line: 'table.line',
        amount: 'table.amount',
        how: 'table.how',
      },
      lines: LINES.lines,
      lineGroups: LINES.lineGroups,
      total: LINES.total,
      estimateNote: {
        id: 'estimateNote',
        labelKey: 'money.disclaimer',
        kind: 'text',
        importance: 'secondary',
        value: [
          { key: 'money.disclaimer', params: { unit: { format: 'moneyExact', value: 100 } } },
          {
            key: 'money.disclaimerSmall',
            params: {
              threshold: { format: 'moneyExact', value: 1000 },
              smallUnit: { format: 'moneyExact', value: 10 },
            },
          },
          { key: 'money.roundingNote', params: {} },
        ],
      },
      notesHeadingKey: 'notes.heading',
      notes: {
        id: 'notes',
        labelKey: 'notes.heading',
        value: NOTE_ENTRIES,
        kind: 'text',
        importance: 'secondary',
      },
      sources: {
        id: 'sources',
        labelKey: 'notes.sourcesLink',
        value: SOURCES,
        kind: 'text',
        importance: 'secondary',
      },
    },
  }
}
