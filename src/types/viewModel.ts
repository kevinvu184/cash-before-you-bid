import type { DisplayCurrency } from '../logic/currencyConfig'
import type { DisplaySettings } from '../logic/display'
import type { Lang } from '../logic/lang'
import type { ColorMode, SkinId } from '../logic/skins'
import type { ModePreference } from '../logic/urlState'
import type {
  DepositRoute,
  Flag,
  Region,
  RowCode,
  RowHow,
  SafeMaxBidBinding,
  SafeMaxBidStatus,
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
  // what the user typed or what a rule states, and is never rounded. `number`
  // and `numberExact` draw the same distinction for plain numbers: a figure
  // the user entered is quoted exactly, to the same precision the field and
  // the URL hold it at, so the sentence can never disagree with the input.
  // `moneyUnit` is a figure already denominated in the currency on display —
  // a rounding unit out of that currency's own config — so it is written
  // exactly and never put through the exchange rate.
  | {
      format:
        | 'money'
        | 'moneyExact'
        | 'moneyUnit'
        | 'percent'
        | 'number'
        | 'numberExact'
        | 'count'
      value: number
    }
  | { format: 'raw'; value: string }

// ── field ids ────────────────────────────────────────────────────────────────

/**
 * The display switch and the rate it converts at. Not calculator inputs and
 * not chrome: they head the results, because what they change is the currency
 * the results are written in.
 */
export type DisplayFieldId = 'currency' | 'exchangeRate'

export type ChromeFieldId =
  | 'eyebrow'
  | 'title'
  | 'lede'
  | 'translationNotice'
  | 'language'
  | 'skin'
  | 'colorMode'
  | 'print'

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
  | 'inputsPrivacy'
  | 'assumptions'
  | 'conveyancing'
  | 'buildingAndPest'
  | 'propertiesConsidered'
  | 'lenderFees'
  | 'settlementAdjustments'
  | 'buildingInsurance'
  | 'movingCosts'
  | 'bufferMonths'
  | 'capitaliseLmi'
  | 'panelFoot'

export type StatFieldId =
  | 'statTotal'
  | 'statDeposit'
  | 'statCosts'
  | 'statLoan'
  | 'statRepayment'
  // The pre-auction spend, reported beside the cash stack rather than in it.
  | 'statSunkPerProperty'
  | 'statSunkSearch'

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

/**
 * The one number the whole epic is for. One field, not one per outcome: what
 * changes between a ceiling, no affordable price and no ceiling at all is what
 * the sentence says, not which field exists.
 */
export type SafeMaxBidFieldId = 'safeMaxBid'

/**
 * Guidance hangs off a timing band, not off a line: it says what the money in
 * that band has to look like, which is not a figure and has no working. Only
 * the auction-day band has any today, so there is exactly one id.
 */
export type GuidanceFieldId = 'guidanceAuctionDay'

export type ResultsFieldId =
  | 'flags'
  | 'estimateNote'
  | 'sunkFraming'
  | 'sunkResearch'
  | 'notes'
  | 'ratesAsAt'
  | 'sources'

export type ScenarioFieldId =
  | 'scenariosHeading'
  | 'scenarioSave'
  | 'scenarioList'
  | 'scenarioPrivacy'

export type FieldId =
  | DisplayFieldId
  | ChromeFieldId
  | InputFieldId
  | StatFieldId
  | SafeMaxBidFieldId
  | VerdictFieldId
  | LineFieldId
  | GuidanceFieldId
  | ResultsFieldId
  | ScenarioFieldId

/**
 * The exhaustive id set, as a `Record<FieldId, true>` so that adding a member
 * to `FieldId` is a compile error here (missing key) and removing one is too
 * (unknown key). Skins carry the same shape as their `renders` manifest.
 */
const FIELD_IDS: Readonly<Record<FieldId, true>> = {
  currency: true,
  exchangeRate: true,
  eyebrow: true,
  title: true,
  lede: true,
  translationNotice: true,
  language: true,
  skin: true,
  colorMode: true,
  print: true,
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
  inputsPrivacy: true,
  assumptions: true,
  conveyancing: true,
  buildingAndPest: true,
  propertiesConsidered: true,
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
  safeMaxBid: true,
  verdictAuctionDay: true,
  verdictAtSettlement: true,
  statSunkPerProperty: true,
  statSunkSearch: true,
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
  guidanceAuctionDay: true,
  flags: true,
  estimateNote: true,
  sunkFraming: true,
  sunkResearch: true,
  notes: true,
  ratesAsAt: true,
  sources: true,
  scenariosHeading: true,
  scenarioSave: true,
  scenarioList: true,
  scenarioPrivacy: true,
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
  /**
   * Which on-screen keypad the field wants: 'numeric' for a whole count,
   * 'decimal' for anything a locale separator can appear in.
   */
  keypad: 'decimal' | 'numeric'
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

/**
 * A control that does one thing rather than holding a value. `labelKey` names
 * the action; there is nothing to read back, so `value` is null.
 */
export interface ActionField extends Field<null> {
  kind: 'text'
  onActivate(): void
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

/**
 * The safe maximum bid: the highest price this bidder can call out and still
 * be covered on both verdicts.
 *
 * `value` is that price, already rounded down to a callable figure — but it is
 * only a price to show when `status` is `'bound'`. On the other two outcomes
 * there is no ceiling to headline (no price clears at all, or nothing caps the
 * bid below the calculator's own limit) and `summary` is the whole answer; a
 * skin reads `status` to know which it has rather than inspecting the number.
 *
 * `binding` names the pocket that ran out, which is the lever that moves the
 * figure. As with the verdict, the core states the outcome and hands over the
 * sentences; the skin decides how loudly to say it.
 */
export interface SafeMaxBidField extends Field<number> {
  kind: 'money'
  status: SafeMaxBidStatus
  binding: SafeMaxBidBinding
  /** What the figure means, and what stops it there. */
  summary: TextRef
  /** The conservative-rounding disclosure; null when there is no figure. */
  detail: TextRef | null
}

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
  /**
   * What the money in this band has to look like on the day — payment form,
   * timing, who sets the terms. `null` for a band with nothing to say.
   */
  guidance: GuidanceField | null
}

export interface NotePart {
  termKey: string
  bodyKey: string
}

/**
 * A band's guidance: `labelKey` names it — the label a skin puts on the
 * disclosure that reveals the points — and each point is a lead-in term and
 * the sentence that follows it, the same shape as a rules note.
 */
export interface GuidanceField extends Field<readonly NotePart[]> {
  kind: 'text'
}

/**
 * The privacy statement, which sits with the savings field because that is
 * where someone hesitates. `labelKey` is the claim itself — narrow enough to
 * be true of the audited build, so a skin may show it and nothing else — and
 * each point is a lead-in term and the sentence that follows it, the same
 * shape as a rules note.
 */
export interface PrivacyField extends Field<readonly NotePart[]> {
  kind: 'text'
}

export interface NoteEntry {
  id: string
  parts: readonly NotePart[]
}

// ── saved scenarios ──────────────────────────────────────────────────────────

/** What one saved-scenario row is currently showing. */
export type ScenarioRowMode = 'idle' | 'renaming' | 'confirmingDelete'

export interface ScenarioEntry {
  id: string
  name: string
  /** Epoch milliseconds; the skin formats the date for the active locale. */
  savedAt: number
  mode: ScenarioRowMode
  /** Stable DOM id for the rename control, so label and input always pair up. */
  controlId: string
  /** The raw text the rename box is holding while `mode` is `'renaming'`. */
  nameDraft: string
  onLoad(): void
  onRenameStart(): void
  onNameDraftChange(raw: string): void
  onRenameCommit(): void
  onDeleteStart(): void
  onDeleteConfirm(): void
  /** Leaves rename or delete confirmation, changing nothing. */
  onCancel(): void
}

/** The per-row action names. Keys, as everywhere: the skin calls `t()`. */
export interface ScenarioActionKeys {
  /** aria-label for the load control, whose visible text is the name itself. */
  loadNamed: string
  rename: string
  /** aria-label naming the scenario, since "Rename" alone is ambiguous in a list. */
  renameNamed: string
  /** The `<label>` for the rename box. */
  renameLabel: string
  renameSave: string
  remove: string
  removeNamed: string
  /** The confirmation question, with the name interpolated. */
  removeQuestion: string
  cancel: string
  savedAt: string
}

/** The name box and its save action. `value` is the raw text being typed. */
export interface ScenarioSaveField extends Field<string> {
  kind: 'text'
  controlId: string
  actionLabelKey: string
  /** False while the name box is empty; saving an unnamed scenario is a no-op. */
  canSave: boolean
  onDraftChange(raw: string): void
  onSave(): void
}

export interface ScenarioListField extends Field<readonly ScenarioEntry[]> {
  kind: 'text'
  emptyLabelKey: string
  /** Names the last storage failure, or null when there has not been one. */
  errorLabelKey: string | null
  actionKeys: ScenarioActionKeys
}

export interface ScenariosViewModel {
  /** aria-label for the panel as a whole. */
  regionLabelKey: string
  heading: TextField
  save: ScenarioSaveField
  list: ScenarioListField
  /** The promise that these figures never leave the device. */
  privacy: TextField
}

// ── display currency ─────────────────────────────────────────────────────────

/** The per-control labels the rate line needs; keys, as everywhere. */
export interface ExchangeRateActionKeys {
  /** Labels the override box: "Override rate: 1 {{base}} =". */
  overrideLabel: string
  apply: string
  cancel: string
  /** Drops the override, back to the fetched rate. */
  reset: string
  /** The chip shown while a typed rate is in force. */
  manualTag: string
}

/**
 * The rate the converted figures were produced at, where it came from, and
 * when it was quoted — plus the means to replace it.
 *
 * `value` is display-currency units per one base-currency unit. It is not a
 * money amount in the base currency and must never be converted; a skin writes
 * it with `quotedRate`, which is `displayUnit` under a different name.
 *
 * The override exists because this rate is not the one the reader will be
 * given. Someone comparing a bank's transfer quote, or planning against a rate
 * they have already locked, needs the page to speak in their number rather
 * than a mid-market one it fetched.
 */
export interface ExchangeRateField extends Field<number> {
  kind: 'number'
  /** Stable DOM id for the override box, so every skin pairs its label to it. */
  controlId: string
  /** "1 {{base}} = {{quoted}}", filled in by the skin from the two symbols. */
  lineKey: string
  /** Names the base currency one unit of which the rate prices. */
  baseSymbolKey: string
  /** Names the currency it is priced in — the one on display. */
  symbolKey: string
  /** Where this rate came from: the provider, an override, or the fallback. */
  source: TextRef
  /** When the provider repriced it; null for an override, fallback or fetch. */
  updatedAt: number | null
  /** True while a typed rate is standing in for the fetched one. */
  manual: boolean
  actionKeys: ExchangeRateActionKeys
  /** Who quoted the rate. A name, not a key: it is not ours to translate. */
  providerName: string
  /**
   * The reminder that the inputs and the arithmetic are still in the base
   * currency whatever the figures are written in, and that fetching the rate
   * is the one request this page makes. Carries {{currency}} and {{provider}}.
   */
  noteKey: string
  /**
   * Applies a rate the reader typed, in their own locale's separators.
   *
   * Ignored rather than raising: an unusable figure — the rate on screen is
   * still a working one — and one that matches the rate already in force at
   * the precision it is shown at. The latter is what makes opening the
   * override and pressing Apply unedited a no-op rather than a MANUAL
   * override the reader never asked for.
   */
  onOverride(raw: string): void
  /** Drops the override; the fetched rate takes over again. */
  onReset(): void
}

/**
 * What figures are written in, and the control that changes it.
 *
 * `settings` is what every money formatter needs; the skin publishes it to its
 * own tree and the shared text helpers read it back. `rate` is null while the
 * base currency is showing — no rate is doing any work then, and quoting one
 * would suggest the figures had been through it.
 */
export interface DisplayViewModel {
  settings: DisplaySettings
  currency: ChoiceInputField<DisplayCurrency>
  rate: ExchangeRateField | null
}

export interface SourcesValue {
  beforeKey: string
  linkKey: string
  afterKey: string
  href: string
}

/**
 * When the rates behind every figure on the page were last checked, and where
 * to check them again. Same shape as `SourcesValue` plus the date itself:
 * `beforeKey` carries a `{{date}}` placeholder, and the skin formats `asAt`
 * for the active locale rather than the core shipping a formatted string.
 */
export interface RatesAsAtValue extends SourcesValue {
  /** ISO-8601 (YYYY-MM-DD), so every locale can render it its own way. */
  asAt: string
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
  /**
   * Hands the page to the browser's own print pipeline, which is what produces
   * the auction-day one-pager. It is a control rather than a skin ornament
   * because "this page can be printed" is a fact about the app; and it exists
   * at all because on a phone the print command is buried in a share sheet,
   * which is the last place a bidder should be looking the night before.
   */
  print: ActionField
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
  /** What happens to the two figures above, and to everything else typed in. */
  privacy: PrivacyField
  assumptions: GroupField
  foot: TextField
}

export interface TableHeadingKeys {
  line: string
  amount: string
  how: string
}

/**
 * The pre-auction spend: what one property costs to bid on, and what a whole
 * search costs. It is a section of its own rather than two more entries in
 * `stats`, because the money is spent whether or not the auction is won — the
 * cash stack above is the cost of buying one property, and these are not part
 * of it.
 */
export interface SunkCostViewModel {
  headingKey: string
  /** Per property, then across the search. */
  stats: readonly StatField[]
  /** The "gone whether you win or lose" sentence. */
  framing: Field<TextRef>
  /** The published research the multiplier exists because of. */
  research: Field<SourcesValue>
}

export interface ResultsViewModel {
  /** aria-label for the flags region. */
  flagsRegionLabelKey: string
  flags: Field<readonly Flag[]>
  /** Section headings a skin may use for grouping; not fields. */
  statsHeadingKey: string
  stats: readonly StatField[]
  /** Section heading for the safe maximum bid; not a field. */
  safeMaxBidHeadingKey: string
  /** The signature figure: how high this bidder can go. */
  safeMaxBid: SafeMaxBidField
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
  sunkCost: SunkCostViewModel
  notesHeadingKey: string
  notes: Field<readonly NoteEntry[]>
  /** The date the rates were last verified, beside the SRO calculator link. */
  ratesAsAt: Field<RatesAsAtValue>
  sources: Field<SourcesValue>
}

export interface AppViewModel {
  locale: Lang
  /** The currency every figure below is written in, and the switch for it. */
  display: DisplayViewModel
  /** The skin actually rendering — the requested one unless it failed to load. */
  skinId: SkinId
  resolvedMode: ColorMode
  chrome: ChromeViewModel
  controls: ControlsViewModel
  inputs: InputsViewModel
  results: ResultsViewModel
  scenarios: ScenariosViewModel
}
