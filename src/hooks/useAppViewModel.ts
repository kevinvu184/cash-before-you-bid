import { useTranslation } from 'react-i18next'
import {
  AMOUNT_HEADER_KEY,
  CURRENCY_OPTIONS,
  CURRENCY_SYMBOL_KEY,
  DEPOSIT_HINT_KEY,
  EXCHANGE_RATE_ACTION_KEYS,
  LANGUAGE_OPTIONS,
  MODE_OPTIONS,
  NOTE_ENTRIES,
  RATES_AS_AT_SOURCE,
  REGION_OPTIONS,
  ROUTE_OPTIONS,
  SKIN_OPTIONS,
  SOURCES,
  SUNK_COST_RESEARCH,
} from '../logic/fieldLabels'
import {
  BASE_CURRENCY,
  CURRENCY_ROUNDING,
  type DisplayCurrency,
} from '../logic/currencyConfig'
import { isValidRate, rateAsShown, RATE_PROVIDER } from '../logic/exchangeRate'
import { parseLocaleNumber } from '../logic/format'
import type { ColorMode, SkinId } from '../logic/skins'
import type { AppState } from '../logic/urlState'
import type { CalculationTiles, SunkCostSummary } from '../types/calculator'
import { buildLineFields } from '../logic/lineFields'
import { PRIVACY_STATEMENT } from '../logic/privacy'
import { buildSafeMaxBidField } from '../logic/safeMaxBidField'
import { buildVerdictFields } from '../logic/verdictFields'
import {
  type AppViewModel,
  type BooleanInputField,
  type DisplayViewModel,
  type ExchangeRateField,
  type FieldId,
  type NumberInputField,
  type StatField,
  type StatFieldId,
  type SunkCostViewModel,
  type TextParam,
  type TextRef,
} from '../types/viewModel'
import type { UseCalculatorResult } from './useCalculator'
import { useExchangeRate, type RateStatus } from './useExchangeRate'
import { useNumericDraft, useOptionalNumericDraft } from './useNumericDraft'
import { useSafeMaxBid } from './useSafeMaxBid'
import { useScenariosViewModel } from './useScenariosViewModel'
import { useTranslationNotice } from './useTranslationNotice'

// Every field the app can show, assembled once, above the skin boundary. The
// core decides what exists, what it is worth, which key names it and how
// important it is. Nothing here is a display string and nothing here is a
// layout decision.

const money = (value: number): TextParam => ({ format: 'money', value })
const moneyExact = (value: number): TextParam => ({ format: 'moneyExact', value })
const moneyUnit = (value: number): TextParam => ({ format: 'moneyUnit', value })
const percent = (value: number): TextParam => ({ format: 'percent', value })
const count = (value: number): TextParam => ({ format: 'count', value })

/**
 * The estimate disclosure, as sentences rather than a paragraph: every
 * computed figure is rounded to the currency's display unit, a finer unit
 * applies below the threshold when the currency defines one, and
 * independently rounded parts may not add to the independently rounded total.
 * The units are quoted exactly — they are the rule, not an estimate — and in
 * the display currency's own denomination, never converted from the base
 * currency's, which is why they are `moneyUnit` rather than `moneyExact`.
 */
function buildEstimateNote(currency: DisplayCurrency): readonly TextRef[] {
  const config = CURRENCY_ROUNDING[currency]
  const sentences: TextRef[] = [
    { key: 'money.disclaimer', params: { unit: moneyUnit(config.unit) } },
  ]
  if (config.smallThreshold !== undefined && config.smallUnit !== undefined) {
    sentences.push({
      key: 'money.disclaimerSmall',
      params: {
        threshold: moneyUnit(config.smallThreshold),
        smallUnit: moneyUnit(config.smallUnit),
      },
    })
  }
  sentences.push({ key: 'money.roundingNote', params: {} })
  return sentences
}

/** Which of the rate's four provenances the line reports, as a sentence. */
function rateSource(status: RateStatus, manual: boolean): TextRef {
  if (manual) return { key: 'currency.sourceManual', params: {} }
  const provider: TextParam = { format: 'raw', value: RATE_PROVIDER }
  switch (status) {
    case 'loading':
      return { key: 'currency.sourceLoading', params: {} }
    case 'fallback':
      return { key: 'currency.sourceFallback', params: {} }
    case 'stale':
      return { key: 'currency.sourceStale', params: { provider } }
    // 'base' never reaches here: the rate field is null under the base
    // currency, where no rate is doing any work.
    default:
      return { key: 'currency.sourceLive', params: { provider } }
  }
}

interface NumericSpec {
  id: FieldId
  controlId: string
  labelKey: string
  kind: 'money' | 'number' | 'percent'
  importance: 'primary' | 'secondary'
  /** Defaults to the decimal keypad; a whole count asks for 'numeric'. */
  keypad?: 'decimal' | 'numeric'
}

function numberField(
  spec: NumericSpec,
  value: number | null,
  draft: string,
  onDraftChange: (raw: string) => void,
  hintKey: string | null,
): NumberInputField {
  return {
    id: spec.id,
    controlId: spec.controlId,
    labelKey: spec.labelKey,
    value,
    kind: spec.kind,
    importance: spec.importance,
    keypad: spec.keypad ?? 'decimal',
    draft,
    hintKey,
    onDraftChange,
  }
}

function booleanField(
  id: FieldId,
  controlId: string,
  labelKey: string,
  value: boolean,
  onChange: (next: boolean) => void,
): BooleanInputField {
  return {
    id,
    controlId,
    labelKey,
    value,
    kind: 'boolean',
    importance: 'secondary',
    onChange,
  }
}

function statField(
  id: StatFieldId,
  labelKey: string,
  value: number,
  detail: TextRef | null,
  importance: 'primary' | 'secondary',
): StatField {
  return { id, labelKey, value, kind: 'money', importance, detail }
}

function buildStats(tiles: CalculationTiles): readonly StatField[] {
  const loanDetail: TextRef =
    tiles.loan.governmentEquity > 0
      ? {
          key: 'stats.loanSubWithEquity',
          params: {
            lvr: percent(tiles.loan.lvrPct),
            equity: money(tiles.loan.governmentEquity),
          },
        }
      : { key: 'stats.loanSub', params: { lvr: percent(tiles.loan.lvrPct) } }

  return [
    statField(
      'statTotal',
      'stats.totalLabel',
      tiles.total.value,
      {
        key: 'stats.totalSub',
        params: {
          deposit: money(tiles.total.deposit),
          costs: money(tiles.total.costs),
          moving: money(tiles.total.moving),
          buffer: money(tiles.total.buffer),
        },
      },
      'primary',
    ),
    statField(
      'statDeposit',
      'stats.depositLabel',
      tiles.deposit.value,
      {
        key: 'stats.depositSub',
        params: {
          pct: percent(tiles.deposit.pct),
          // The price is the user's own input, so it is quoted exactly; only
          // the deposit derived from it is an estimate.
          price: moneyExact(tiles.deposit.price),
        },
      },
      'secondary',
    ),
    statField(
      'statCosts',
      'stats.costsLabel',
      tiles.costs.value,
      // No price means no share of it to quote; the field still exists.
      tiles.costs.pctOfPrice === null
        ? null
        : {
            key: 'stats.costsSub',
            params: { pct: percent(tiles.costs.pctOfPrice) },
          },
      'secondary',
    ),
    statField('statLoan', 'stats.loanLabel', tiles.loan.value, loanDetail, 'secondary'),
    statField(
      'statRepayment',
      'stats.repaymentLabel',
      tiles.repayment.value,
      {
        key: 'stats.repaymentSub',
        params: {
          rate: percent(tiles.repayment.ratePct),
          assessedRate: percent(tiles.repayment.assessedRatePct),
          assessed: money(tiles.repayment.assessedValue),
        },
      },
      'secondary',
    ),
  ]
}

/**
 * Both figures the pre-auction spend has to report: what one property costs to
 * bid on, and what the whole search costs. The count rides in the detail
 * rather than the label so the label stays a plain key — and so i18next can
 * pluralise the sentence that actually names it.
 */
function buildSunkCost(sunk: SunkCostSummary): SunkCostViewModel {
  return {
    headingKey: 'sunk.heading',
    stats: [
      statField(
        'statSunkPerProperty',
        'sunk.perPropertyLabel',
        sunk.perProperty,
        { key: 'sunk.perPropertySub', params: {} },
        'secondary',
      ),
      statField('statSunkSearch', 'sunk.searchLabel', sunk.expectedTotal, {
        key: 'sunk.searchSub',
        params: {
          // `count` drives the plural form; `properties` is the same number
          // formatted for the locale, which is what the sentence shows. It is
          // the user's own figure, so it is quoted exactly — rounding it here
          // would let the sentence disagree with the field they typed it into.
          count: count(sunk.properties),
          properties: { format: 'numberExact', value: sunk.properties },
          perProperty: money(sunk.perProperty),
          lost: money(sunk.onPropertiesNotWon),
        },
      }, 'primary'),
    ],
    framing: {
      id: 'sunkFraming',
      labelKey: 'sunk.framing',
      value: { key: 'sunk.framing', params: {} },
      kind: 'text',
      importance: 'secondary',
    },
    research: {
      id: 'sunkResearch',
      labelKey: 'sunk.researchLink',
      value: SUNK_COST_RESEARCH,
      kind: 'text',
      importance: 'secondary',
    },
  }
}

/**
 * The one view model for the one screen. It takes the calculator rather than
 * calling it, so there is exactly one URL-state instance in the app, and it is
 * called above the skin boundary: changing skin or mode swaps a child
 * component and nothing here remounts.
 */
export function useAppViewModel(
  core: UseCalculatorResult,
  resolvedMode: ColorMode,
  effectiveSkin: SkinId,
): AppViewModel {
  const { i18n } = useTranslation()
  const {
    inputs,
    presentation,
    result,
    setField,
    setRoute,
    setLang,
    setSkin,
    setMode,
    setCurrency,
    setManualRate,
  } = core
  const locale = i18n.language

  // An override stands in for the fetched rate wherever there is one; the
  // fetch still runs behind it, so Reset has a live rate to fall back to and
  // the rate line can say what the override is standing in for.
  const currency = presentation.currency
  const fetched = useExchangeRate(currency)
  const activeRate = presentation.manualRate ?? fetched.rate
  const manual = presentation.manualRate !== null

  const exchangeRate: ExchangeRateField | null =
    currency === BASE_CURRENCY
      ? null
      : {
          id: 'exchangeRate',
          controlId: 'fx',
          labelKey: 'currency.rateLabel',
          value: activeRate,
          kind: 'number',
          importance: 'secondary',
          lineKey: 'currency.rateLine',
          baseSymbolKey: CURRENCY_SYMBOL_KEY[BASE_CURRENCY],
          symbolKey: CURRENCY_SYMBOL_KEY[currency],
          source: rateSource(fetched.status, manual),
          // An override and the bundled fallback carry no provider timestamp;
          // neither does a rate still in flight.
          updatedAt: manual ? null : fetched.updatedAt,
          manual,
          actionKeys: EXCHANGE_RATE_ACTION_KEYS,
          providerName: RATE_PROVIDER,
          noteKey: 'currency.note',
          onOverride: (raw) => {
            const parsed = parseLocaleNumber(raw, locale)
            // Stored at the precision it is shown at, so the rate the figures
            // were priced at is the rate on the line above them — a decimal
            // the reader typed would otherwise be applied but never displayed.
            const rate = parsed === null ? null : rateAsShown(parsed)
            // An unusable figure changes nothing rather than raising: the rate
            // on screen is still a working one.
            if (rate === null || !isValidRate(rate)) return
            // Nor does applying the rate already in force. Opening the
            // override and pressing Apply without editing is not an edit, and
            // must not pin a live quote as the reader's own rate.
            if (rate === rateAsShown(activeRate)) return
            setManualRate(rate)
          },
          onReset: () => setManualRate(null),
        }

  const display: DisplayViewModel = {
    settings: { currency, rate: activeRate },
    currency: {
      id: 'currency',
      controlId: 'cur',
      labelKey: 'currency.label',
      value: currency,
      kind: 'text',
      importance: 'secondary',
      options: CURRENCY_OPTIONS,
      // Re-picking the active currency would push an identical history entry
      // and pollute the back button.
      onChange: (next) => {
        if (next !== currency) setCurrency(next)
      },
    },
    rate: exchangeRate,
  }
  const notice = useTranslationNotice(inputs.lang === 'vi')
  const scenarios = useScenariosViewModel(core.currentQuery, core.loadQuery)

  // One draft per numeric field, in a fixed order. The draft is the raw text
  // the field is holding, so no skin has to parse or format a keystroke.
  type SettableField = Parameters<UseCalculatorResult['setField']>[0]
  const set =
    <K extends SettableField>(field: K) =>
    (next: AppState[K]) =>
      setField(field, next)
  const price = useNumericDraft(inputs.price, set('price'), locale)
  const depositPct = useNumericDraft(inputs.depositPct, set('depositPct'), locale)
  const otp = useNumericDraft(inputs.offThePlanConstruction, set('offThePlanConstruction'), locale)
  const rate = useNumericDraft(inputs.interestRatePct, set('interestRatePct'), locale)
  const conveyancing = useNumericDraft(inputs.conveyancing, set('conveyancing'), locale)
  const buildingAndPest = useNumericDraft(inputs.buildingAndPest, set('buildingAndPest'), locale)
  const lenderFees = useNumericDraft(inputs.lenderFees, set('lenderFees'), locale)
  const adjustments = useNumericDraft(
    inputs.settlementAdjustments,
    set('settlementAdjustments'),
    locale,
  )
  const insurance = useNumericDraft(inputs.buildingInsurance, set('buildingInsurance'), locale)
  const moving = useNumericDraft(inputs.movingCosts, set('movingCosts'), locale)
  const bufferMonths = useNumericDraft(inputs.bufferMonths, set('bufferMonths'), locale)
  const savings = useNumericDraft(inputs.savings, set('savings'), locale)
  // Optional: an empty field reports null, which suppresses the finance check
  // rather than failing it on a zero the user never entered.
  const preApprovedLoan = useOptionalNumericDraft(
    inputs.preApprovedLoan,
    set('preApprovedLoan'),
    locale,
  )
  const properties = useNumericDraft(
    inputs.propertiesConsidered,
    set('propertiesConsidered'),
    locale,
  )

  const assumptionFields = [
    numberField(
      {
        id: 'conveyancing',
        controlId: 'conv',
        labelKey: 'inputs.conveyancing',
        kind: 'money',
        importance: 'secondary',
      },
      inputs.conveyancing,
      conveyancing.draft,
      conveyancing.onDraftChange,
      null,
    ),
    numberField(
      {
        id: 'buildingAndPest',
        controlId: 'bp',
        labelKey: 'inputs.buildingAndPest',
        kind: 'money',
        importance: 'secondary',
      },
      inputs.buildingAndPest,
      buildingAndPest.draft,
      buildingAndPest.onDraftChange,
      null,
    ),
    numberField(
      {
        id: 'propertiesConsidered',
        controlId: 'bids',
        labelKey: 'inputs.properties',
        kind: 'number',
        importance: 'secondary',
        keypad: 'numeric',
      },
      inputs.propertiesConsidered,
      properties.draft,
      properties.onDraftChange,
      'inputs.propertiesHint',
    ),
    numberField(
      {
        id: 'lenderFees',
        controlId: 'lender',
        labelKey: 'inputs.lenderFees',
        kind: 'money',
        importance: 'secondary',
      },
      inputs.lenderFees,
      lenderFees.draft,
      lenderFees.onDraftChange,
      null,
    ),
    numberField(
      {
        id: 'settlementAdjustments',
        controlId: 'adj',
        labelKey: 'inputs.settlementAdjustments',
        kind: 'money',
        importance: 'secondary',
      },
      inputs.settlementAdjustments,
      adjustments.draft,
      adjustments.onDraftChange,
      null,
    ),
    numberField(
      {
        id: 'buildingInsurance',
        controlId: 'ins',
        labelKey: 'inputs.buildingInsurance',
        kind: 'money',
        importance: 'secondary',
      },
      inputs.buildingInsurance,
      insurance.draft,
      insurance.onDraftChange,
      null,
    ),
    numberField(
      {
        id: 'movingCosts',
        controlId: 'move',
        labelKey: 'inputs.moving',
        kind: 'money',
        importance: 'secondary',
      },
      inputs.movingCosts,
      moving.draft,
      moving.onDraftChange,
      null,
    ),
    numberField(
      {
        id: 'bufferMonths',
        controlId: 'bufm',
        labelKey: 'inputs.bufferMonths',
        kind: 'number',
        importance: 'secondary',
      },
      inputs.bufferMonths,
      bufferMonths.draft,
      bufferMonths.onDraftChange,
      null,
    ),
    booleanField(
      'capitaliseLmi',
      'caplmi',
      'inputs.capitaliseLmi',
      inputs.capitaliseLmi,
      set('capitaliseLmi'),
    ),
  ]

  const lines = buildLineFields(result.rows)

  // The one figure that is a search rather than a single pass of the engine,
  // and so the one that is memoised; see the hook for what it is keyed on.
  const bid = useSafeMaxBid(inputs)

  return {
    locale: inputs.lang,
    display,
    // What is rendering, which is the requested skin unless it failed to load.
    // The switcher below still shows what the URL asked for.
    skinId: effectiveSkin,
    resolvedMode,
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
      notice: notice.visible
        ? {
            id: 'translationNotice',
            labelKey: 'notice.aiTranslation',
            value: null,
            kind: 'text',
            importance: 'secondary',
            dismissLabelKey: 'notice.dismiss',
            onDismiss: notice.dismiss,
          }
        : null,
    },
    controls: {
      language: {
        id: 'language',
        controlId: 'lang',
        labelKey: 'switcher.label',
        value: inputs.lang,
        kind: 'text',
        importance: 'secondary',
        options: LANGUAGE_OPTIONS,
        // Re-picking the active language would push an identical history
        // entry and pollute the back button.
        onChange: (next) => {
          if (next !== inputs.lang) setLang(next)
        },
      },
      skin: {
        id: 'skin',
        controlId: 'skin',
        labelKey: 'skins.label',
        value: presentation.skin,
        kind: 'text',
        importance: 'secondary',
        options: SKIN_OPTIONS,
        onChange: (next) => {
          if (next !== presentation.skin) setSkin(next)
        },
      },
      colorMode: {
        id: 'colorMode',
        controlId: 'mode',
        labelKey: 'mode.label',
        value: presentation.mode,
        kind: 'text',
        importance: 'secondary',
        options: MODE_OPTIONS,
        onChange: (next) => {
          if (next !== presentation.mode) setMode(next)
        },
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
      price: numberField(
        {
          id: 'price',
          controlId: 'price',
          labelKey: 'inputs.price',
          kind: 'money',
          importance: 'primary',
        },
        inputs.price,
        price.draft,
        price.onDraftChange,
        null,
      ),
      route: {
        id: 'route',
        controlId: 'route',
        labelKey: 'inputs.route',
        value: inputs.route,
        kind: 'text',
        importance: 'primary',
        options: ROUTE_OPTIONS,
        onChange: setRoute,
      },
      depositPct: numberField(
        {
          id: 'depositPct',
          controlId: 'dep',
          labelKey: 'inputs.deposit',
          kind: 'percent',
          importance: 'primary',
        },
        inputs.depositPct,
        depositPct.draft,
        depositPct.onDraftChange,
        DEPOSIT_HINT_KEY[inputs.route],
      ),
      region: {
        id: 'region',
        controlId: 'region',
        labelKey: 'inputs.region',
        value: inputs.region,
        kind: 'text',
        importance: 'secondary',
        options: REGION_OPTIONS,
        onChange: set('region'),
      },
      firstHomeBuyer: booleanField(
        'firstHomeBuyer',
        'fhb',
        'inputs.fhb',
        inputs.firstHomeBuyer,
        set('firstHomeBuyer'),
      ),
      ownerOccupier: booleanField(
        'ownerOccupier',
        'ppr',
        'inputs.ppr',
        inputs.ownerOccupier,
        set('ownerOccupier'),
      ),
      newHome: booleanField('newHome', 'newhome', 'inputs.newHome', inputs.newHome, set('newHome')),
      offThePlanConstruction: numberField(
        {
          id: 'offThePlanConstruction',
          controlId: 'otp',
          labelKey: 'inputs.otp',
          kind: 'money',
          importance: 'secondary',
        },
        inputs.offThePlanConstruction,
        otp.draft,
        otp.onDraftChange,
        'inputs.otpHint',
      ),
      foreignPurchaser: booleanField(
        'foreignPurchaser',
        'foreign',
        'inputs.foreign',
        inputs.foreignPurchaser,
        set('foreignPurchaser'),
      ),
      interestRatePct: numberField(
        {
          id: 'interestRatePct',
          controlId: 'rate',
          labelKey: 'inputs.rate',
          kind: 'percent',
          importance: 'secondary',
        },
        inputs.interestRatePct,
        rate.draft,
        rate.onDraftChange,
        null,
      ),
      savings: numberField(
        {
          id: 'savings',
          controlId: 'save',
          labelKey: 'inputs.savings',
          kind: 'money',
          importance: 'primary',
        },
        inputs.savings,
        savings.draft,
        savings.onDraftChange,
        'inputs.savingsHint',
      ),
      preApprovedLoan: numberField(
        {
          id: 'preApprovedLoan',
          controlId: 'loan',
          labelKey: 'inputs.preApprovedLoan',
          kind: 'money',
          importance: 'primary',
        },
        inputs.preApprovedLoan,
        preApprovedLoan.draft,
        preApprovedLoan.onDraftChange,
        'inputs.preApprovedLoanHint',
      ),
      // A constant: the claim and its points depend on nothing the user has
      // typed, which is the point of it.
      privacy: PRIVACY_STATEMENT,
      assumptions: {
        id: 'assumptions',
        labelKey: 'inputs.assumptions',
        value: assumptionFields,
        kind: 'text',
        importance: 'secondary',
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
        value: result.flags,
        kind: 'text',
        importance: 'primary',
      },
      statsHeadingKey: 'results.statsHeading',
      stats: buildStats(result.tiles),
      safeMaxBidHeadingKey: 'safeMaxBid.heading',
      safeMaxBid: buildSafeMaxBidField(bid, inputs.savings),
      verdictsHeadingKey: 'results.verdictsHeading',
      verdicts: buildVerdictFields(result.readiness),
      linesHeadingKey: 'results.linesHeading',
      tableHeadingKeys: {
        line: 'table.line',
        // The column is headed by the currency its figures are written in, so
        // it says what it holds without a word of prose.
        amount: AMOUNT_HEADER_KEY[currency],
        how: 'table.how',
      },
      lines: lines.lines,
      lineGroups: lines.lineGroups,
      total: lines.total,
      estimateNote: {
        id: 'estimateNote',
        labelKey: 'money.disclaimer',
        value: buildEstimateNote(currency),
        kind: 'text',
        importance: 'secondary',
      },
      sunkCost: buildSunkCost(result.sunkCost),
      notesHeadingKey: 'notes.heading',
      notes: {
        id: 'notes',
        labelKey: 'notes.heading',
        value: NOTE_ENTRIES,
        kind: 'text',
        importance: 'secondary',
      },
      ratesAsAt: {
        id: 'ratesAsAt',
        labelKey: 'notes.ratesAsAtLink',
        value: RATES_AS_AT_SOURCE,
        kind: 'date',
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
    scenarios,
  }
}
