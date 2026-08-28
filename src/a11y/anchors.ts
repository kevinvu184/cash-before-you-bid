/**
 * DOM ids the shell and the skins have to agree on.
 *
 * The shell draws the skip link, because it has to be the first focusable
 * thing on the page whichever skin is mounted; the skin draws the results,
 * because markup is a skin's job. That split means the target id is a contract
 * between them rather than a detail of either, so it lives here and
 * src/a11y/structure.test.tsx fails a skin that stops honouring it.
 */

/** The results landmark. Carries `tabindex="-1"` so focus actually lands. */
export const RESULTS_ANCHOR_ID = 'results'
