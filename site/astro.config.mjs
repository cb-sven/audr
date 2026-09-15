// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mdx from '@astrojs/mdx';

import { audrGreen } from './src/styles/code-themes.mjs';

// Written by `npm run sync:spec`, which `dev` and `build` both run first.
import sidebar from './src/generated-sidebar.json' with { type: 'json' };
import { analyticsSnippet } from './src/lib/analytics.mjs';

const SITE = 'https://openaudr.dev';
const SPEC_BASE = '/spec/v1.0.0';

const analyticsScript = analyticsSnippet(
	process.env.PUBLIC_ANALYTICS_ID,
	new URL(SITE).hostname
);
const analytics = analyticsScript ? [{ tag: 'script', content: analyticsScript }] : [];

// Type for the specification pages. The landing page loads its own faces in
// its own layout.
const FONTS =
	'https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Work+Sans:wght@500;600;700&display=swap';

export default defineConfig({
	site: SITE,
	markdown: {
		// SPEC.md is written with straight quotes; leave the source punctuation
		// alone rather than curling it.
		smartypants: false,
	},
	integrations: [
		starlight({
			title: 'AUDR',
			description: 'A JSON record format for agent cost monitoring and monetization.',
			favicon: '/favicon.svg',
			// `src/pages/404.astro` owns the route; Starlight's would collide.
			disable404Route: true,
			logo: { src: './src/assets/audr-mark.svg' },
			customCss: ['./src/styles/theme.css'],
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/openaudr/audr' },
			],
			head: [
				{ tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.googleapis.com' } },
				{
					tag: 'link',
					attrs: { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true },
				},
				{ tag: 'link', attrs: { rel: 'stylesheet', href: FONTS } },
				// The specification in its other representations.
				{
					tag: 'link',
					attrs: {
						rel: 'alternate',
						type: 'text/markdown',
						href: `${SPEC_BASE}/SPEC.md`,
						title: 'AUDR specification (Markdown)',
					},
				},
				{
					tag: 'link',
					attrs: {
						rel: 'describedby',
						href: `${SPEC_BASE}/audr.schema.json`,
						title: 'AUDR JSON Schema',
					},
				},
				...analytics,
			],
			components: {
				// The site is light-only, so the theme toggle has nothing to toggle.
				ThemeSelect: './src/components/EmptyThemeSelect.astro',
				// The default sidebar plus scroll-spy, since the spec is one page.
				Sidebar: './src/components/Sidebar.astro',
			},
			expressiveCode: {
				// Expressive Code processes every Markdown and MDX file in the project,
				// landing-page content included. The specification pages' slate theme is
				// the base; the landing page's green palette rides along as a second
				// theme, whose colours are emitted on every token as `--1`, and
				// `landing.css` switches to those.
				themes: ['github-dark', audrGreen],
				useDarkModeMediaQuery: false,
				// Off, so panels use their theme's exact colours; otherwise the dim
				// comment green gets lightened for contrast.
				minSyntaxHighlightingColorContrast: 0,
				styleOverrides: {
					borderRadius: '4px',
					codeFontSize: '0.82rem',
					codeLineHeight: '1.7',
					codeFontFamily: "'Fira Code', SFMono-Regular, Consolas, monospace",
					codeBackground: '#223142',
					borderColor: '#223142',
					codePaddingBlock: '20px',
					codePaddingInline: '22px',
					frames: { frameBoxShadowCssValue: 'none' },
				},
			},
			sidebar: [
				{ label: 'Document', items: sidebar.document },
				{ label: '3 · Specification', items: sidebar.specification },
			],
			// No edit links: these pages are generated from spec/v1.0.0/SPEC.md and
			// are not themselves checked in, so there is nothing to edit at the
			// path Starlight would link to.
			lastUpdated: false,
		}),
		// Must come after starlight(), which registers Expressive Code.
		mdx(),
	],
});
