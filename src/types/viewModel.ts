import type { Lang } from '../logic/lang'
import type { ColorMode, SkinId } from '../logic/skins'
import type { ModePreference } from '../logic/urlState'
import type {
  DepositRoute,
  Flag,
  Region,
  RowCode,
  RowHow,
  TimingBand,
  VerdictCode,
} from './calculator'

/**
 * The contract between the headless core and every skin.
 *
 * The core decides *what* the user is shown: which fields exist, what they are
 * worth, which translation key names them, and how important they are. A skin
 * decides *how* — element, order, grouping, emphasis, colour. Nothing in here
 * is a display string: values are data and keys, and the skin calls `t()`.
 */

export type FieldKind = 'money' | 'number' | 'percent' | 'text' | 'date' | 'boolean'

export type Importance = 'primary' | 'secondary'

export interface Field<T> {
  id: FieldId
  labelKey: string
  value: T
  kind: FieldKind
  importance: Importance
}

/**
 * A translated sentence the core describes but does not build: the key plus
 * the numbers that go into it, each tagged with how it should be formatted.
 */
export interface TextRef {
  key: string
  params: Readonly<Record<string, TextParam>>
}

export type TextParam =
  // `money` is a computed figure, shown as a rounded estimate; `moneyExact` is
  // what the user typed or what a rule states, and is never rounded.
  | { format: 'money' | 'moneyExact' | 'percent' | 'number' | 'count'; value: number }
  | { format: 'raw'; value: string }

// ── field ids ────────────────────────────────────────────────────────────────

export type ChromeFieldId =
  | 'eyebrow'
  | 'title'
  | 'lede'
  | 'translationNotice'
  | 'language'
  | 'skin'
  | 'colorMode'

export type InputFieldId =
  | 'inputsHeading'
  | 'price'
  | 'route'
  | 'depositPct'
  | 'region'
  | 'firstHomeBuyer'
  | 'ownerOccupier'
  | 'newHome'
  | 'offThePlanConstruction'
  | 'foreignPurchaser'
  | 'interestRatePct'
  | 'savings'
  | 'preApprovedLoan'
  | 'assumptions'
  | 'conveyancing'
  | 'buildingAndPest'
  | 'lenderFees'
  | 'settlementAdjustments'
  | 'buildingInsurance'
  | 'movingCosts'
  | 'bufferMonths'
  | 'capitaliseLmi'
  | 'panelFoot'

export type StatFieldId = 'statTotal' | 'statDeposit' | 'statCosts' | 'statLoan' | 'statRepayment'

export type LineFieldId =
  | 'lineDeposit'
  | 'lineStampDuty'
  | 'lineForeignDuty'
  | 'lineTransferFee'
  | 'lineMortgageFee'
  | 'linePexaFees'
  | 'lineLmi'
  | 'lineConveyancing'
  | 'lineBuildingAndPest'
  | 'lineLenderFees'
  | 'lineSettlementAdjustments'
  | 'lineBuildingInsurance'
  | 'lineGrant'
  | 'lineMoving'
  | 'lineBuffer'
  | 'lineSubtotalPreAuction'
  | 'lineSubtotalAuctionDay'
  | 'lineSubtotalAtSettlement'
  | 'lineSubtotalAfterSettlement'
  | 'lineTotal'

export type VerdictFieldId = 'verdictAuctionDay' | 'verdictAtSettlement'

export type ResultsFieldId = 'flags' | 'estimateNote' | 'notes' | 'sources'

export type FieldId =
  | ChromeFieldId
  | InputFieldId
  | StatFieldId
  | VerdictFieldId
  | LineFieldId
  | ResultsFieldId

/**
 * The exhaustive id set, as a `Record<FieldId, true>` so that adding a member
 * to `FieldId` is a compile error here (missing key) and removing one is too
 * (unknown key). Skins carry the same shape as their `renders` manifest.
 */
const FIELD_IDS: Readonly<Record<FieldId, true>> = {
  eyebrow: true,
  title: true,
  lede: true,
  translationNotice: true,
  language: true,
  skin: true,
  colorMode: true,
  inputsHeading: true,
  price: true,
  route: true,
  depositPct: true,
  region: true,
  firstHomeBuyer: true,
  ownerOccupier: true,
  newHome: true,
  offThePlanConstruction: true,
  foreignPurchaser: true,
  interestRatePct: true,
  savings: true,
  preApprovedLoan: true,
  assumptions: true,
  conveyancing: true,
  buildingAndPest: true,
  lenderFees: true,
  settlementAdjustments: true,
  buildingInsurance: true,
  movingCosts: true,
  bufferMonths: true,
  capitaliseLmi: true,
  panelFoot: true,
  statTotal: true,
  statDeposit: true,
  statCosts: true,
  statLoan: true,
  statRepayment: true,
  verdictAuctionDay: true,
  verdictAtSettlement: true,
  lineDeposit: true,
  lineStampDuty: true,
  lineForeignDuty: true,
  lineTransferFee: true,
  lineMortgageFee: true,
  linePexaFees: true,
  lineLmi: true,
  lineConveyancing: true,
  lineBuildingAndPest: true,
  lineLenderFees: true,
  lineSettlementAdjustments: true,
  lineBuildingInsurance: true,
  lineGrant: true,
  lineMoving: true,
  lineBuffer: true,
  lineSubtotalPreAuction: true,
  lineSubtotalAuctionDay: true,
  lineSubtotalAtSettlement: true,
  lineSubtotalAfterSettlement: true,
  lineTotal: true,
  flags: true,
  estimateNote: true,
  notes: true,
  sources: true,
}

export const ALL_FIELD_IDS = Object.keys(FIELD_IDS) as readonly FieldId[]

/**
 * Table row codes come from the calculator; this names their fields. `null`
 * means the row has no field of its own: `costsSubtotal` adds across timing
 * bands, so the per-band subtotals below say what it used to say, and the
 * purchase-costs stat tile still carries the figure.
 */
export const LINE_FIELD_ID: Readonly<Record<RowCode, LineFieldId | null>> = {
  deposit: 'lineDeposit',
  stampDuty: 'lineStampDuty',
  foreignDuty: 'lineForeignDuty',
  transferFee: 'lineTransferFee',
  mortgageFee: 'lineMortgageFee',
  pexaFees: 'linePexaFees',
  lmi: 'lineLmi',
  conveyancing: 'lineConveyancing',
  buildingAndPest: 'lineBuildingAndPest',
  lenderFees: 'lineLenderFees',
  settlementAdjustments: 'lineSettlementAdjustments',
  buildingInsurance: 'lineBuildingInsurance',
  grant: 'lineGrant',
  costsSubtotal: null,
  moving: 'lineMoving',
  buffer: 'lineBuffer',
  total: 'lineTotal',
}

/** One subtotal field per timing band, in the same shape as a line. */
export const BAND_SUBTOTAL_FIELD_ID: Readonly<Record<TimingBand, LineFieldId>> = {
  preAuction: 'lineSubtotalPreAuction',
  auctionDay: 'lineSubtotalAuctionDay',
  atSettlement: 'lineSubtotalAtSettlement',
  afterSettlement: 'lineSubtotalAfterSettlement',
}

// ── field shapes ─────────────────────────────────────────────────────────────

/** Copy whose whole content is `labelKey`; there is no separate value. */
export interface TextField extends Field<null> {
  kind: 'text'
}

/**
 * A numeric input. `draft` is the raw text the field is holding — half-typed
 * figures and locale separators included — so the skin never has to parse or
 * format anything; it renders `draft` and reports keystrokes back.
 *
 * `value` is `null` only on an optional field the user has left empty, where
 * "not answered" is a state of its own and not a zero. A skin renders `draft`
 * either way, so nullability changes nothing about how one is drawn.
 */
export interface NumberInputField extends Field<number | null> {
  kind: 'money' | 'number' | 'percent'
  /** Stable DOM id, so every skin pairs label and control the same way. */
  controlId: string
  draft: string
  hintKey: string | null
  onDraftChange(raw: string): void
}

export interface BooleanInputField extends Field<boolean> {
  kind: 'boolean'
  controlId: string
  onChange(next: boolean): void
}

export interface ChoiceOption<T extends string> {
  value: T
  labelKey: string
  /** Spelled-out name when `labelKey` is an abbreviation ("EN" -> "English"). */
  a11yLabelKey?: string
  /** BCP 47 tag when the option's own label is in another language. */
  lang?: string
}

export interface ChoiceInputField<T extends string> extends Field<T> {
  kind: 'text'
  controlId: string
  options: readonly ChoiceOption<T>[]
  onChange(next: T): void
}

export type AnyInputField = NumberInputField | BooleanInputField

/** A group of inputs a skin may put behind a disclosure. */
export interface GroupField extends Field<readonly AnyInputField[]> {
  kind: 'text'
}

export interface NoticeField extends Field<null> {
  kind: 'text'
  dismissLabelKey: string
  onDismiss(): void
}

export interface StatField extends Field<number> {
  kind: 'money'
  /** The supporting line under the figure; null when there is nothing to say. */
  detail: TextRef | null
}

/**
 * One of the two verdicts: covered, or short.
 *
 * `value` is the verdict's total shortfall, and is 0 exactly when it is
 * covered — that is what it is for. It is not a figure to headline when more
 * than one pocket is short, because it would then be a cash gap added to a
 * loan gap; `summary` already picks copy that quotes no such total, and the
 * per-pocket figures are in `details`.
 *
 * The core states the outcome and hands over the sentences that say it, each
 * as a key plus its numbers; the skin decides what "covered" and "short" look
 * like. Nothing here is a formatted string, and the two verdicts are never
 * merged — a cash gap and a loan gap have different remedies.
 */
export interface VerdictField extends Field<number> {
  kind: 'money'
  code: VerdictCode
  status: VerdictStatus
  /** The one word for `status`, so no skin has to name the states itself. */
  statusKey: string
  /** The headline: what this moment demands, and how it stands. */
  summary: TextRef
  /**
   * The supporting lines: one per pocket that is short, naming the pocket, and
   * a line for the finance check when no pre-approval was entered to run it.
   * Empty when the verdict is covered and nothing was left unchecked.
   */
  details: readonly TextRef[]
}

export type VerdictStatus = 'covered' | 'short'

export const VERDICT_FIELD_ID: Readonly<Record<VerdictCode, VerdictFieldId>> = {
  auctionDay: 'verdictAuctionDay',
  atSettlement: 'verdictAtSettlement',
}

export interface LineField extends Field<number> {
  kind: 'money'
  /** The working, as calculator codes; the skin turns it into a sentence. */
  how: RowHow | null
  /** Subtotals and totals; the skin decides what "emphasised" looks like. */
  emphasis: boolean
  /**
   * When the money is due. `null` on the grand total, which adds across bands.
   * A band subtotal carries the band it closes.
   */
  band: TimingBand | null
}

/**
 * One timing band: the lines due at that point, and their subtotal. The core
 * does the arithmetic and names the band; the skin decides whether to draw the
 * grouping and what a section looks like.
 */
export interface LineGroup {
  band: TimingBand
  labelKey: string
  /** The one-line "when is this due" gloss under the band's name. */
  noteKey: string
  lines: readonly LineField[]
  subtotal: LineField
}

export interface NotePart {
  termKey: string
  bodyKey: string
}

export interface NoteEntry {
  id: string
  parts: readonly NotePart[]
}

export interface SourcesValue {
  beforeKey: string
  linkKey: string
  afterKey: string
  href: string
}

// ── screen view models ───────────────────────────────────────────────────────

export interface ChromeViewModel {
  eyebrow: TextField
  title: TextField
  lede: TextField
  /** Null when the machine-translation notice does not apply or was dismissed. */
  notice: NoticeField | null
}

export type ModeChoice = ModePreference

export interface ControlsViewModel {
  language: ChoiceInputField<Lang>
  skin: ChoiceInputField<SkinId>
  colorMode: ChoiceInputField<ModeChoice>
}

export interface InputsViewModel {
  /** aria-label for the panel as a whole. */
  regionLabelKey: string
  heading: TextField
  price: NumberInputField
  route: ChoiceInputField<DepositRoute>
  depositPct: NumberInputField
  region: ChoiceInputField<Region>
  firstHomeBuyer: BooleanInputField
  ownerOccupier: BooleanInputField
  newHome: BooleanInputField
  offThePlanConstruction: NumberInputField
  foreignPurchaser: BooleanInputField
  interestRatePct: NumberInputField
  /** What the bidder has. Primary: the verdict cannot be reached without it. */
  savings: NumberInputField
  /** Optional; an empty draft means "not yet pre-approved", and `value` null. */
  preApprovedLoan: NumberInputField
  assumptions: GroupField
  foot: TextField
}

export interface TableHeadingKeys {
  line: string
  amount: string
  how: string
}

export interface ResultsViewModel {
  /** aria-label for the flags region. */
  flagsRegionLabelKey: string
  flags: Field<readonly Flag[]>
  /** Section headings a skin may use for grouping; not fields. */
  statsHeadingKey: string
  stats: readonly StatField[]
  /** Section heading for the verdicts; not a field. */
  verdictsHeadingKey: string
  /** Always two, in the order the purchase runs. */
  verdicts: readonly VerdictField[]
  linesHeadingKey: string
  tableHeadingKeys: TableHeadingKeys
  /**
   * Every line field the skin renders, in display order: each band's lines
   * followed by its subtotal, then the grand total. `lineGroups` is the same
   * fields arranged into their bands — a skin renders one or the other, and
   * either way puts the same field set in the DOM.
   */
  lines: readonly LineField[]
  lineGroups: readonly LineGroup[]
  /** The grand total, which belongs to no band. */
  total: LineField
  /** The one disclosure that every computed figure above is a rounded estimate. */
  estimateNote: Field<readonly TextRef[]>
  notesHeadingKey: string
  notes: Field<readonly NoteEntry[]>
  sources: Field<SourcesValue>
}

export interface AppViewModel {
  locale: Lang
  /** The skin actually rendering — the requested one unless it failed to load. */
  skinId: SkinId
  resolvedMode: ColorMode
  chrome: ChromeViewModel
  controls: ControlsViewModel
  inputs: InputsViewModel
  results: ResultsViewModel
}
