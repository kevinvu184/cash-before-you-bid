import type { NotePart, PrivacyField } from '../types/viewModel'

/**
 * The privacy statement, and the audit it has to stay true to.
 *
 * Competitors take a calculator input and hand it to a broker. This app does
 * not, which is worth nothing as a differentiator while it is only true in the
 * source. So it is said on screen, beside the savings field — and said
 * narrowly, because a claim is only worth as much as the audit behind it.
 *
 * The claim is "your figures never leave your browser", not "nothing leaves
 * your browser": the page fetches web fonts from Google, so the broader
 * sentence would be false and the whole statement with it. A narrow claim that
 * survives the audit beats a broad one with an asterisk.
 *
 * `THIRD_PARTY_HOSTS` below is the other half. It is the audited list of hosts
 * the built page contacts on its own, established by loading `dist/` in a
 * browser — the audit is in the pull request that added this file. What keeps
 * it current is `privacy.test.ts`, which holds this repository's sources to
 * it: `index.html` may reference no host declared nowhere here, and no source
 * file may open a connection this file does not name. So a new outbound
 * request cannot be added without an edit landing next to the wording. That is
 * the mechanism behind the last sentence of `privacy.thirdPartyBody`.
 *
 * Its limit, stated rather than glossed: that is a check on the build's
 * inputs, not on its output. A request arriving through a dependency or a
 * build plugin would pass it, and only re-running the audit would catch one —
 * which is what to do after a dependency bump or a build-config change.
 */

/**
 * Every host the production build requests on its own, with why. Verified by
 * loading `dist/` in a browser and recording every request; the audit is in
 * the pull request that introduced this file.
 *
 * Links a reader can *click* are not in here — a navigation the user chooses
 * is not a request the page made. Same-origin requests for the app's own
 * assets are not in here either; the claim is about third parties.
 */
export const THIRD_PARTY_HOSTS: Readonly<Record<string, string>> = {
  // index.html loads the Libre Franklin / Source Code Pro stylesheet, which in
  // turn pulls the font files from gstatic. Google therefore sees an IP and a
  // user agent on every visit. It never sees an input value: the request is
  // for a fixed stylesheet URL with no per-visitor part to it.
  'fonts.googleapis.com': 'web font stylesheet, loaded from index.html',
  'fonts.gstatic.com': 'the font files that stylesheet points at',
}

/**
 * Every file allowed to open a connection at runtime, and what for. A file
 * that is not in here may not call `fetch`, `XMLHttpRequest`, `sendBeacon`,
 * `EventSource` or `WebSocket`; `privacy.test.ts` walks the tree and fails if
 * one does. Same-origin `import()` of the app's own chunks is not a call of
 * that kind and is not scanned for.
 *
 * That is the tripwire, and it is pointed at this file on purpose: a request
 * cannot be added anywhere in the app without an edit here, next to the
 * wording it would make stale.
 */
export const NETWORK_CALLERS: Readonly<Record<string, string>> = {
  'public/sw.js':
    'the offline cache. Same-origin only — the fetch handler returns before ' +
    'touching a request from any other origin, so nothing it does reaches a ' +
    'third party.',
}

/**
 * What the claim rests on, in the order a hesitating reader needs it: what the
 * page does, then the two places their own figures end up, then what the page
 * fetches from anyone else.
 */
const PRIVACY_POINTS: readonly NotePart[] = [
  { termKey: 'privacy.localTerm', bodyKey: 'privacy.localBody' },
  { termKey: 'privacy.linkTerm', bodyKey: 'privacy.linkBody' },
  { termKey: 'privacy.storageTerm', bodyKey: 'privacy.storageBody' },
  { termKey: 'privacy.thirdPartyTerm', bodyKey: 'privacy.thirdPartyBody' },
]

/**
 * Primary, not secondary: it is the reason someone is willing to type a
 * savings balance in at all, so no skin may treat it as small print.
 */
export const PRIVACY_STATEMENT: PrivacyField = {
  id: 'inputsPrivacy',
  labelKey: 'privacy.claim',
  value: PRIVACY_POINTS,
  kind: 'text',
  importance: 'primary',
}
