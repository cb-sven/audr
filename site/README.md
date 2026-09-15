# AUDR site

The openaudr.dev website: a landing page and the AUDR v1.0.0 specification
reference, built with [Astro](https://astro.build) and
[Starlight](https://starlight.astro.build).

```bash
cd site
npm install
npm run dev      # http://localhost:4321
```

| Command | Does |
| --- | --- |
| `npm run dev` | Dev server, with the spec synced first |
| `npm run build` | Static build into `site/dist/` |
| `npm run preview` | Serve the built output |
| `npm run sync:spec` | Regenerate the spec page by hand (`dev` and `build` do it for you) |

## Content and templates are separate

No copy lives in a component. Every word on the landing page comes from
`src/content/`, and the components are markup only.

```
src/content/
├── landing/              One file per page section, in order
│   ├── 1-hero.mdx
│   ├── 2-problem.mdx
│   ├── 3-how-it-works.mdx
│   ├── 4-try-it.mdx
│   ├── 5-stewardship.mdx
│   └── 6-get-involved.mdx
└── faq/                  One file per question; the body is the answer
    └── 1-why-audr.mdx …
```

Within a section file the split is:

- **Frontmatter** carries the structured parts — headings, labels, links, and
  lists such as the numbered steps or the "Get involved" items — plus `template`,
  which names the component that renders it.
- **The body** carries the rich part: multi-paragraph prose for most sections,
  and a fenced code block for the two that show a sample.

To add a section, drop in a file with an `order` and a `template`; to reword
one, edit only its file. `src/components/landing/Section.astro` maps `template`
to a component, and `src/pages/index.astro` just orders them and hands them over.

Site chrome that is data rather than prose — nav and footer links, the page
title, the analytics ID — lives in `src/data/site.json`, and the not-found
page's copy in `src/data/not-found.json`.

### Structured data follows the content

The homepage JSON-LD is assembled at build time: the static nodes come from
`src/data/homepage-jsonld.json`, and the `FAQPage` node is generated from the
FAQ content files by `src/lib/faq-jsonld.ts`. Edit a FAQ answer and the
structured data follows it, so the two cannot drift apart.

## Layout

```
site/
├── astro.config.mjs          Starlight config: theme, sidebar, code blocks
├── scripts/sync-spec.mjs     Publishes ../spec/v1.0.0/SPEC.md as one page
├── src/
│   ├── content/              All copy (above)
│   ├── data/site.json        Nav, footer, page metadata
│   ├── layouts/Landing.astro Document shell for the landing page
│   ├── pages/index.astro     Orders sections and hands them to templates
│   ├── pages/404.astro       Not-found page, in the landing page's shell
│   ├── components/landing/   The templates — markup, no copy
│   ├── components/icons/     Line glyphs and the GitHub mark
│   ├── scripts/              Landing behaviour, plus the sidebar scroll-spy
│   ├── styles/landing.css    Landing page theme
│   ├── styles/theme.css      Starlight, themed to match the spec pages
│   ├── styles/code-themes.mjs  The landing page's syntax palette
│   └── assets/audr-mark.svg  The AUDR mark, used in both halves
└── public/                   favicon, robots.txt, index.md, index.schema.json
```

## The spec page is generated

`spec/v1.0.0/SPEC.md` at the repo root is itself generated from
`audr.schema.json` and stays the single source of truth. `scripts/sync-spec.mjs`
publishes it as **one scrolling page** at `/spec/v1.0.0/`, the way it reads on
openaudr.dev, with a sidebar of anchor links into it. It also copies the schema,
the Markdown original, and the worked example into `public/` so
`https://openaudr.dev/spec/v1.0.0/audr.schema.json` — the schema's own `$id` —
keeps resolving.

Publishing the document whole is what keeps the script small: the spec's own
cross-references (`[section 3.13](#313-…)`) resolve by themselves, because the
heading IDs Starlight generates are exactly the ones the document already
expects. Nothing has to be rewritten.

Because every sidebar entry points at the same URL, Starlight's own "current
page" marking never moves. `src/scripts/sidebar-scrollspy.js` highlights the
section you are reading instead, and `src/components/Sidebar.astro` is the
stock sidebar with that script attached.

Nothing it writes is checked in (see `.gitignore`). To change the spec text,
change `SPEC.md`; the site follows.

The page stays Markdown rather than MDX. It embeds no components, and MDX would
make the build fail on ordinary Markdown that appears in a generated document —
a bare `<br>`, or a stray `{` — for no gain.

## Two palettes

The landing page is green; the specification pages use a neutral slate-and-blue
document theme. The tokens live in `src/styles/landing.css` and
`src/styles/theme.css` respectively.

Code blocks follow the same split. Expressive Code processes all Markdown and
MDX in the project, so it is configured with the spec pages' slate theme as the
base and the landing page's green one alongside it; it emits both palettes on
every token, and `landing.css` switches to the green set within `.chunk`. That
keeps each half's code styling in that half's stylesheet.

## Analytics and SEO

Google Analytics is **not configured by default**. The measurement ID comes from
`PUBLIC_ANALYTICS_ID` (see `.env.example`); without it no tag is emitted at all,
so local builds and forks report nothing. When it is set, the tag is still
guarded at runtime and refuses to load on any host other than the configured
`site`, so a fork that inherits the variable makes no request either.

`src/lib/analytics.mjs` builds the snippet; both halves of the site use it — the
landing page in its layout, the specification pages through Starlight's `head`
config.

Starlight generates the canonical URL, Open Graph and Twitter tags, and
`sitemap-index.xml` for the specification pages; `public/robots.txt` points at
the sitemap. The landing page carries its own JSON-LD (see above) and both pages
link to the Markdown and JSON Schema representations of what they describe.

## Deployment

The build is static and self-contained: `site/dist/` is the document root, and
can be served by any static host.

`dist/404.html` is the not-found page. Starlight's own is turned off in
`astro.config.mjs` so `src/pages/404.astro` owns the route. On CloudFront, map
both 403 and 404 to `/404.html` and return status **404** — an S3 REST origin
answers a missing object with 403.
