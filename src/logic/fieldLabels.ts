import type { Lang } from './lang'
import type { ColorMode, SkinId } from './skins'
import type { ModePreference } from './urlState'
import type { DepositRoute, Region, RowCode } from '../types/calculator'
import type { ChoiceOption, NoteEntry, SourcesValue } from '../types/viewModel'

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
