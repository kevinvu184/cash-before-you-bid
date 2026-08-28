import type { DisplayCurrency } from './currencyConfig'
import type { Lang } from './lang'
import type { ColorMode, SkinId } from './skins'
import type { ModePreference } from './urlState'
import type {
  DepositRoute,
  Region,
  RowCode,
  TimingBand,
  VerdictCheckCode,
  VerdictCode,
} from '../types/calculator'
import type {
  ChoiceOption,
  ExchangeRateActionKeys,
  GuidanceField,
  GuidanceFieldId,
  NoteEntry,
  NotePart,
  SourcesValue,
  VerdictStatus,
} from '../types/viewModel'

// Translation keys — never translations. The core names the string a field
// needs; the skin calls t() with it. Every key is a literal so a grep finds
// both the JSON entry and its use.

export const ROW_LABEL_KEY: Readonly<Record<RowCode, string>> = {
  deposit: 'rows.deposit',
  stampDuty: 'rows.stampDuty',
  foreignDuty: 'rows.foreignDuty',
  transferFee: 'rows.transferFee',
  mortgageFee: 'rows.mortgageFee',
  pexaFees: 'rows.pexaFees',
  lmi: 'rows.lmi',
  conveyancing: 'rows.conveyancing',
  buildingAndPest: 'rows.buildingAndPest',
  lenderFees: 'rows.lenderFees',
  settlementAdjustments: 'rows.settlementAdjustments',
  buildingInsurance: 'rows.buildingInsurance',
  grant: 'rows.grant',
  costsSubtotal: 'rows.costsSubtotal',
  moving: 'rows.moving',
  buffer: 'rows.buffer',
  total: 'rows.total',
}

export const BAND_LABEL_KEY: Readonly<Record<TimingBand, string>> = {
  preAuction: 'bands.preAuction',
  auctionDay: 'bands.auctionDay',
  atSettlement: 'bands.atSettlement',
  afterSettlement: 'bands.afterSettlement',
}

/** The one-line "when is this due" gloss under a band's name. */
export const BAND_NOTE_KEY: Readonly<Record<TimingBand, string>> = {
  preAuction: 'bands.preAuctionNote',
  auctionDay: 'bands.auctionDayNote',
  atSettlement: 'bands.atSettlementNote',
  afterSettlement: 'bands.afterSettlementNote',
}

/**
 * Each band's subtotal names its own band rather than interpolating one label
 * into another: the grouping is not conveyed to a screen reader reading cell
 * by cell, and a whole sentence per band is what a translator can actually
 * work with.
 */
export const BAND_SUBTOTAL_LABEL_KEY: Readonly<Record<TimingBand, string>> = {
  preAuction: 'bands.subtotalPreAuction',
  auctionDay: 'bands.subtotalAuctionDay',
  atSettlement: 'bands.subtotalAtSettlement',
  afterSettlement: 'bands.subtotalAfterSettlement',
}

// ── the verdict ──────────────────────────────────────────────────────────────
//
// Each verdict names its own moment and each shortfall names its own pocket,
// rather than interpolating one key into another: a translator gets a whole
// sentence to work with, and a screen reader reading the block out gets one
// too.

export const VERDICT_LABEL_KEY: Readonly<Record<VerdictCode, string>> = {
  auctionDay: 'verdicts.auctionDayLabel',
  atSettlement: 'verdicts.atSettlementLabel',
}

/** The one word for the state, so both skins say the same thing. */
export const VERDICT_STATUS_KEY: Readonly<Record<VerdictStatus, string>> = {
  covered: 'verdicts.covered',
  short: 'verdicts.short',
}

export interface VerdictSummaryKeys extends Readonly<Record<VerdictStatus, string>> {
  /**
   * Used when the verdict is covered but the loan check did not run — no
   * pre-approval to test, or no loan needed at all. The ordinary covered copy
   * says the pre-approval covers the balance of the price, which would be an
   * assertion about a check that never happened.
   */
  coveredUnchecked?: string
  /**
   * Used when more than one pocket is short, so the headline never quotes a
   * figure that adds a cash gap to a loan gap — the two are closed differently
   * and one does not make up for the other. Only the settlement verdict has
   * more than one pocket to be short in.
   */
  shortMultiple?: string
}

export const VERDICT_SUMMARY_KEY: Readonly<Record<VerdictCode, VerdictSummaryKeys>> = {
  auctionDay: {
    covered: 'verdicts.auctionDayCovered',
    short: 'verdicts.auctionDayShort',
  },
  atSettlement: {
    covered: 'verdicts.atSettlementCovered',
    coveredUnchecked: 'verdicts.atSettlementCoveredCashOnly',
    short: 'verdicts.atSettlementShort',
    shortMultiple: 'verdicts.atSettlementShortMultiple',
  },
}

/** One sentence per pocket, because cash and a loan have different remedies. */
export const VERDICT_SHORTFALL_KEY: Readonly<Record<VerdictCheckCode, string>> = {
  auctionDayCash: 'verdicts.shortAuctionDayCash',
  settlementCash: 'verdicts.shortSettlementCash',
  settlementLoan: 'verdicts.shortSettlementLoan',
}

/** Said when no pre-approval was entered, so the finance check did not run. */
export const VERDICT_FINANCE_NOT_CHECKED_KEY = 'verdicts.financeNotChecked'
/**
 * What the money in a band has to look like, for the bands that have anything
 * to say. Auction day is the one that catches people out: the figure is only
 * half the problem, because a bidder who has the deposit in a personal cheque
 * still cannot pay it. Victorian practice specifically — common practice as
 * bidders meet it, not a legal position; the estimate and not-advice
 * disclaimer under the results still governs the whole page.
 */
const AUCTION_DAY_POINTS: readonly NotePart[] = [
  { termKey: 'guidance.hammerTerm', bodyKey: 'guidance.hammerBody' },
  { termKey: 'guidance.percentTerm', bodyKey: 'guidance.percentBody' },
  { termKey: 'guidance.formTerm', bodyKey: 'guidance.formBody' },
  { termKey: 'guidance.bondTerm', bodyKey: 'guidance.bondBody' },
  { termKey: 'guidance.confirmTerm', bodyKey: 'guidance.confirmBody' },
]

const guidanceField = (
  id: GuidanceFieldId,
  labelKey: string,
  points: readonly NotePart[],
): GuidanceField => ({
  id,
  labelKey,
  value: points,
  kind: 'text',
  importance: 'secondary',
})

/**
 * Bands with no entry carry no guidance; the map is partial rather than four
 * keys with three of them null.
 */
export const BAND_GUIDANCE: Readonly<Partial<Record<TimingBand, GuidanceField>>> = {
  auctionDay: guidanceField('guidanceAuctionDay', 'guidance.auctionDay', AUCTION_DAY_POINTS),
}
export const ROUTE_OPTIONS: readonly ChoiceOption<DepositRoute>[] = [
  { value: 'scheme', labelKey: 'routes.scheme' },
  { value: 'lmi', labelKey: 'routes.lmi' },
  { value: 'nolmi', labelKey: 'routes.nolmi' },
  { value: 'htb', labelKey: 'routes.htb' },
]

export const REGION_OPTIONS: readonly ChoiceOption<Region>[] = [
  { value: 'metro', labelKey: 'regions.metro' },
  { value: 'regional', labelKey: 'regions.regional' },
]

export const DEPOSIT_HINT_KEY: Readonly<Record<DepositRoute, string>> = {
  scheme: 'hints.scheme',
  lmi: 'hints.lmi',
  nolmi: 'hints.nolmi',
  htb: 'hints.htb',
}

// Language names keep their own language: a Vietnamese speaker lost in the
// English UI must still be able to read the way back.
export const LANGUAGE_OPTIONS: readonly ChoiceOption<Lang>[] = [
  {
    value: 'vi',
    labelKey: 'switcher.vi',
    a11yLabelKey: 'switcher.viName',
    lang: 'vi',
  },
  {
    value: 'en',
    labelKey: 'switcher.en',
    a11yLabelKey: 'switcher.enName',
    lang: 'en',
  },
]

export const SKIN_OPTIONS: readonly ChoiceOption<SkinId>[] = [
  { value: 'default', labelKey: 'skins.default' },
  { value: 'plain', labelKey: 'skins.plain' },
]

export const MODE_OPTIONS: readonly ChoiceOption<ModePreference>[] = [
  { value: 'system', labelKey: 'mode.system' },
  { value: 'light', labelKey: 'mode.light' },
  { value: 'dark', labelKey: 'mode.dark' },
]

// One place mapping a currency to the keys that name it, so the symbol on the
// switch, the symbol heading the amount column and the name a screen reader
// announces can never drift apart.

export const CURRENCY_SYMBOL_KEY: Readonly<Record<DisplayCurrency, string>> = {
  AUD: 'currency.symbolAud',
  VND: 'currency.symbolVnd',
}

export const CURRENCY_NAME_KEY: Readonly<Record<DisplayCurrency, string>> = {
  AUD: 'currency.nameAud',
  VND: 'currency.nameVnd',
}

/**
 * What heads the amount column. Not always the symbol: formatMoney writes AUD
 * as the ISO code for a vi reader, because "AU$" there does not read as
 * unambiguously Australian — so the column head follows the cells under it
 * rather than the symbol on the switch.
 */
export const AMOUNT_HEADER_KEY: Readonly<Record<DisplayCurrency, string>> = {
  AUD: 'table.amount',
  VND: 'table.amountVnd',
}

// The switch shows the symbol alone; the currency is named in the accessible
// label, so the same control reads identically in both languages.
export const CURRENCY_OPTIONS: readonly ChoiceOption<DisplayCurrency>[] = [
  { value: 'AUD', labelKey: CURRENCY_SYMBOL_KEY.AUD, a11yLabelKey: CURRENCY_NAME_KEY.AUD },
  { value: 'VND', labelKey: CURRENCY_SYMBOL_KEY.VND, a11yLabelKey: CURRENCY_NAME_KEY.VND },
]

export const EXCHANGE_RATE_ACTION_KEYS: ExchangeRateActionKeys = {
  overrideLabel: 'currency.overrideLabel',
  apply: 'currency.apply',
  cancel: 'currency.cancel',
  reset: 'currency.reset',
  manualTag: 'currency.manualTag',
}

export const COLOR_MODE_LABEL_KEY: Readonly<Record<ColorMode, string>> = {
  light: 'mode.light',
  dark: 'mode.dark',
}

export const NOTE_ENTRIES: readonly NoteEntry[] = [
  {
    id: 'duty',
    parts: [{ termKey: 'notes.dutyTerm', bodyKey: 'notes.dutyBody' }],
  },
  {
    id: 'fees',
    parts: [{ termKey: 'notes.feesTerm', bodyKey: 'notes.feesBody' }],
  },
  {
    id: 'lmi',
    parts: [{ termKey: 'notes.lmiTerm', bodyKey: 'notes.lmiBody' }],
  },
  {
    id: 'schemes',
    parts: [
      { termKey: 'notes.schemeTerm', bodyKey: 'notes.schemeBody' },
      { termKey: 'notes.htbTerm', bodyKey: 'notes.htbBody' },
    ],
  },
  {
    id: 'grant',
    parts: [{ termKey: 'notes.grantTerm', bodyKey: 'notes.grantBody' }],
  },
  {
    id: 'repayment',
    parts: [{ termKey: 'notes.repaymentTerm', bodyKey: 'notes.repaymentBody' }],
  },
]

/**
 * The multiple-inspection research the pre-auction multiplier exists because
 * of: the Victorian Premier's media release of 12 March 2026, which cites the
 * Consumer Policy Research Centre. Named beside the figures rather than folded
 * into them — the numbers on screen are the user's own.
 */
export const SUNK_COST_RESEARCH: SourcesValue = {
  beforeKey: 'sunk.researchBefore',
  linkKey: 'sunk.researchLink',
  afterKey: 'sunk.researchAfter',
  href: 'https://www.premier.vic.gov.au/no-more-hassles-getting-pre-sale-building-inspections',
}

export const SOURCES: SourcesValue = {
  beforeKey: 'notes.sourcesBefore',
  linkKey: 'notes.sourcesLink',
  afterKey: 'notes.sourcesAfter',
  href: 'https://claude.ai/code/artifact/de316b0d-babe-464d-91c1-c5c12d735ed3',
}
