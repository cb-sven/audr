/**
 * The landing page's syntax palette.
 *
 * Its code panels are deep green, against the slate the specification pages
 * use. Expressive Code emits the colours of every theme it is given on each
 * token, so `landing.css` can switch to this one without a second pipeline.
 *
 * The colours match `--code-bg`, `--code-ink` and `--code-ink-dim` in
 * `landing.css`.
 */

const GREEN = {
	bg: '#0c1a11',
	ink: '#e2f3e6',
	dim: '#6d8a76',
	string: '#a8d4b6',
};

/** Scopes that carry the "key" colour — object keys, keywords, tag names. */
const KEY_SCOPES = [
	'support.type.property-name',
	'meta.object-literal.key',
	'keyword',
	'storage.type',
	'storage.modifier',
	'entity.name.tag',
	'variable.language',
];

export const audrGreen = {
	name: 'audr-green',
	type: 'dark',
	colors: {
		'editor.background': GREEN.bg,
		'editor.foreground': GREEN.ink,
	},
	settings: [
		{ settings: { foreground: GREEN.ink } },
		{
			scope: ['comment', 'punctuation.definition.comment'],
			settings: { foreground: GREEN.dim },
		},
		{
			scope: ['string', 'constant.numeric', 'constant.language'],
			settings: { foreground: GREEN.string },
		},
		{ scope: KEY_SCOPES, settings: { foreground: GREEN.ink, fontStyle: 'bold' } },
	],
};
