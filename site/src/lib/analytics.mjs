/**
 * Google Analytics, opt-in and host-locked.
 *
 * The measurement ID comes from `PUBLIC_ANALYTICS_ID` and is unset by default,
 * so a fork of this site emits no tag at all. The snippet then checks the
 * hostname before loading anything, so a fork that sets the variable anyway
 * still reports nothing.
 */

/**
 * @param {string | undefined} measurementId GA4 measurement ID, e.g. `G-XXXXXXX`.
 * @param {string} hostname The only host allowed to report, e.g. `openaudr.dev`.
 * @returns {string | null} The inline script, or `null` if unconfigured.
 */
export function analyticsSnippet(measurementId, hostname) {
	if (!measurementId) return null;

	const id = JSON.stringify(measurementId);
	const host = JSON.stringify(hostname);

	return `if (location.hostname === ${host}) {
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ${id};
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }
  gtag('js', new Date());
  gtag('config', ${id});
}`;
}
