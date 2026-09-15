/**
 * Highlights the sidebar entry for the section you are reading.
 *
 * The spec is published as one long page, so Starlight's own "current page"
 * marking never moves — every sidebar entry points at the same URL. Starlight
 * scroll-spies its right-hand table of contents natively, but there is no
 * equivalent for the sidebar, so this drives it from scroll position.
 */

/** Sidebar entries that point at an anchor on this page, keyed by target id. */
const links = new Map();
for (const anchor of document.querySelectorAll('.sidebar-content a[href*="#"]')) {
	const id = decodeURIComponent(anchor.hash.slice(1));
	if (id) links.set(id, anchor);
}

/** The headings those entries point at, in document order. */
const headings = [...document.querySelectorAll('.sl-markdown-content h2[id]')].filter((heading) =>
	links.has(heading.id)
);

if (headings.length > 0) {
	/**
	 * How far down the viewport a heading must reach before its section counts
	 * as the one being read, as a fraction of viewport height. At 0.3 the
	 * sidebar moves on once a heading is a third of the way down the screen,
	 * rather than waiting for it to reach the very top.
	 */
	const ACTIVATION_RATIO = 0.3;

	let active = null;
	let queued = false;

	function update() {
		queued = false;

		// Measured per pass, so it follows the viewport through resizes and
		// orientation changes without needing to be recalculated separately.
		const activationLine = window.innerHeight * ACTIVATION_RATIO;

		let next = headings[0];
		for (const heading of headings) {
			if (heading.getBoundingClientRect().top > activationLine) break;
			next = heading;
		}

		// The closing section is shorter than the viewport, so it can never reach
		// the offset on its own. Hand it the highlight at the end of the page.
		const atBottom =
			window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
		if (atBottom) next = headings[headings.length - 1];

		if (next === active) return;
		links.get(active?.id)?.removeAttribute('aria-current');
		active = next;
		links.get(active.id)?.setAttribute('aria-current', 'true');
	}

	function onScroll() {
		if (queued) return;
		queued = true;
		requestAnimationFrame(update);
	}

	window.addEventListener('scroll', onScroll, { passive: true });
	window.addEventListener('resize', onScroll, { passive: true });
	update();
}
