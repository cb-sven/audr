/**
 * Derives the Starlight spec reference from the canonical specification.
 *
 * `spec/<version>/SPEC.md` is itself generated from `audr.schema.json` and is
 * the single source of truth, so nothing here is hand-maintained. The document
 * is published whole, as one scrolling page with a sidebar of anchor links into
 * it. The schema, the Markdown original, and the worked example are copied out
 * so the canonical `$id` URL keeps resolving.
 *
 * Keeping it in one piece is what lets the spec's own intra-document links
 * (`[section 3.13](#313-…)`) resolve untouched: the heading IDs Starlight
 * generates are the ones the document already expects.
 *
 * Everything this writes is gitignored. Run it via `npm run sync:spec`, which
 * `dev` and `build` both do for you.
 */
import { existsSync } from 'node:fs';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = dirname(siteRoot);

const VERSION = '1.0.0';
const specDir = join(repoRoot, 'spec', `v${VERSION}`);
const contentDir = join(siteRoot, 'src/content/docs/spec', `v${VERSION}`);
const publicDir = join(siteRoot, 'public/spec', `v${VERSION}`);
const base = `/spec/v${VERSION}`;

/** Files served verbatim, so documented URLs keep resolving. */
const PASSTHROUGH = ['audr.schema.json', 'SPEC.md', 'examples/record.json'];

/**
 * GitHub-flavoured heading anchor: lowercase, punctuation dropped, spaces to
 * hyphens. `3.13 Cross-Field Operation Constraints` becomes
 * `313-cross-field-operation-constraints`. This is what the spec's own links
 * use and what Starlight generates, so the two agree without any rewriting.
 */
function anchorize(heading) {
	return heading
		.toLowerCase()
		.replace(/`/g, '')
		.replace(/[^\w\s-]/g, '')
		.trim()
		.replace(/\s+/g, '-');
}

/** `3.6 \`emitter\` Object` -> `3.6 emitter Object`, for the sidebar label. */
function titleize(heading) {
	return heading.replace(/`/g, '').trim();
}

function frontmatter(fields) {
	const yaml = Object.entries(fields)
		.filter(([, v]) => v !== undefined)
		.map(([k, v]) => `${k}: ${typeof v === 'string' ? JSON.stringify(v) : v}`)
		.join('\n');
	return `---\n${yaml}\n---\n`;
}

const source = await readFile(join(specDir, 'SPEC.md'), 'utf8');
const lines = source.split('\n');

/**
 * Everything before the first `##` is the document's own preamble — a generated
 * -file comment, the H1, the version line, and the one-sentence description.
 * Starlight renders the title from frontmatter, so the H1 is dropped and the
 * rest becomes the page's opening.
 */
const firstSection = lines.findIndex((l) => /^##\s+/.test(l));
const intro = lines
	.slice(0, firstSection)
	.filter((l) => !l.startsWith('<!--') && !l.startsWith('# '))
	.join('\n')
	.trim();
const body = lines.slice(firstSection).join('\n').trim();

const lead = intro
	.split('\n')
	.filter((l) => l.trim() && !l.startsWith('**'))
	.join(' ')
	.trim();

/** Every `##` heading, for the sidebar. Fenced code can contain `##` too. */
const headings = [];
let inFence = false;
for (const line of lines) {
	if (/^```/.test(line)) inFence = !inFence;
	const match = !inFence && /^##\s+(.+)$/.exec(line);
	if (match) {
		const heading = match[1].trim();
		headings.push({ label: titleize(heading), link: `${base}/#${anchorize(heading)}` });
	}
}

await rm(contentDir, { recursive: true, force: true });
await mkdir(contentDir, { recursive: true });

await writeFile(
	join(contentDir, 'index.md'),
	`${frontmatter({
		title: 'Agent Usage Detail Record (AUDR)',
		description: lead,
		// The sidebar already lists every section of this page; a second copy of
		// the same list down the right-hand side would only repeat it.
		tableOfContents: false,
	})}
${intro}

| Format | Link |
| --- | --- |
| Markdown | [\`SPEC.md\`](${base}/SPEC.md) |
| JSON Schema | [\`audr.schema.json\`](${base}/audr.schema.json) |
| Worked example | [\`record.json\`](${base}/examples/record.json) |

The schema's canonical URL is its \`$id\`:

\`\`\`
https://openaudr.dev${base}/audr.schema.json
\`\`\`

${body}
`,
);

// Copy the canonical artefacts through to the served site.
await rm(publicDir, { recursive: true, force: true });
for (const rel of PASSTHROUGH) {
	const from = join(specDir, rel);
	if (!existsSync(from)) {
		console.warn(`sync-spec: skipping missing ${rel}`);
		continue;
	}
	await mkdir(dirname(join(publicDir, rel)), { recursive: true });
	await cp(from, join(publicDir, rel));
}

// The sidebar mirrors how the document divides: the prose chapters, then the
// numbered subsections of section 3. Both groups link into the one page.
const isSubsection = (h) => /^3\.\d/.test(h.label);
const sidebar = {
	document: headings.filter((h) => !isSubsection(h)),
	specification: headings.filter(isSubsection),
};
await writeFile(
	join(siteRoot, 'src/generated-sidebar.json'),
	`${JSON.stringify(sidebar, null, '\t')}\n`,
);

console.log(
	`sync-spec: 1 page, ${headings.length} sidebar anchors, ${PASSTHROUGH.length} passthrough files`,
);
