import type { NotePart, PrivacyField } from '../types/viewModel'

/**
 * The privacy statement, and the audit it has to stay true to.
 *
 * Competitors take a calculator input and hand it to a broker. This app does
 * not, which is worth nothing as a differentiator while it is only true in the
 * source. So it is said on screen, beside the savings field — and said
 * narrowly, because a claim is only worth as much as the audit behind it.
 *
 * The claim is "your figures never leave your browser" rather than "nothing
 * leaves your browser". When it was written the page fetched web fonts from
 * Google, so the broader sentence would have been false and the whole
 * statement with it. #23 self-hosted those fonts, and for a short while no
 * third-party request remained — but the broad claim was deliberately still
 * not made, on the grounds that it is about the page while the narrow one is
 * about the reader's money and stays true whatever the page later loads.
 *
 * That judgement earned itself out within the day. #35 added the display
 * currency switch, which fetches an exchange rate from a third party when the
 * reader asks for đồng. The narrow claim is untouched by it — the request
 * carries no figures, and `no-referrer` keeps even the query string this page
 * sits on out of it. The broad one would have had to be walked back.
 *
 * `THIRD_PARTY_HOSTS` below is the other half. It is the audited list of hosts
 * the built page contacts on its own, established by loading `dist/` in a
 * browser — the audit is in the pull request that added this file. What keeps
 * it current is `privacy.test.ts`, which holds this repository's sources to it
 * in both directions: no source may reach a host this file has not declared —
 * in markup, in a stylesheet, or in a `fetch` from one of the callers below —
 * and no host declared here may go unreferenced. So neither adding a request
 * nor removing one can happen without an edit landing next to the wording.
 * That is the mechanism behind the last sentence of
 * `privacy.thirdPartyBody`.
 *
 * Its limits, stated rather than glossed. It is a check on the build's inputs,
 * not on its output: a request arriving through a dependency or a build plugin
 * would pass it, and only re-running the audit would catch one — which is what
 * to do after a dependency bump or a build-config change. And on the forward
 * side it reads hosts out of markup, stylesheets, and the callers below; a
 * fetch target defined in another module and imported — which is where this
 * app's own endpoint lives, in `logic/exchangeRate.ts` beside the rest of the
 * rate rules — is caught by the caller gate rather than by name. The reverse
 * side is broad and does read every source, because "has this host stopped
 * being mentioned" cannot false-positive on a link a reader clicks.
 */

/**
 * Every host the production build requests on its own, with why.
 *
 * It was empty for one day. `fonts.googleapis.com` and `fonts.gstatic.com`
 * were here until #23 self-hosted the faces; `src/fonts.css` serves them from
 * `public/fonts` now, and `src/fonts.test.ts` holds index.html to that. The
 * audit behind that state — loading `dist/` across a cold load, a full
 * interaction pass, both skins and a service-worker reload — found 70 requests
 * and not one leaving this origin.
 *
 * The single entry below is what the mechanism was built for. It cannot be
 * added without editing this file, which is where `privacy.thirdPartyBody`
 * sits, so the sentence had to be rewritten in the same commit — and it was.
 * That is the tripwire doing its job rather than a hole in it.
 *
 * Links a reader can *click* are not in here — a navigation the user chooses
 * is not a request the page made. Same-origin requests for the app's own
 * assets are not in here either; the claim is about third parties.
 */
export const THIRD_PARTY_HOSTS: Readonly<Record<string, string>> = {
  'open.er-api.com':
    'the exchange rate, for the display currency switch. Requested only when ' +
    'the reader asks for đồng and never on arrival, so no one is in a ' +
    'position to see a visit. It is a keyless GET of a public rate table ' +
    'carrying nothing about the reader: referrerPolicy no-referrer keeps even ' +
    'the query string this page sits on — which holds their savings — out of ' +
    'it, and credentials omit keeps cookies out. See ' +
    'src/hooks/useExchangeRate.ts and the README.',
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
  'src/hooks/useExchangeRate.ts':
    'the exchange rate for the display currency switch, from the one host ' +
    'declared above. Nothing is fetched for the base currency, so the default ' +
    'view makes no request at all; the first switch to đồng is what goes out.',
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
