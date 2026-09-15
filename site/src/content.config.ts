import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

const link = z.object({
	label: z.string(),
	href: z.string(),
	/** Renders the GitHub glyph before the label. */
	icon: z.enum(['github']).optional(),
	external: z.boolean().default(false),
});

/**
 * Landing page sections — one file per section, ordered by `order`.
 *
 * The split: labels, links and lists live in frontmatter, because they are
 * structured rather than prose; the MDX body carries whatever is the rich
 * content of that section, which is multi-paragraph prose for most of them and
 * a code sample for the two that have one.
 */
const landing = defineCollection({
	loader: glob({ base: './src/content/landing', pattern: '**/*.mdx' }),
	schema: z.object({
		order: z.number(),
		/** `split` sits in the two-column upper half; `wide` runs full width below it. */
		region: z.enum(['split', 'wide']),
		template: z.enum(['hero', 'prose', 'steps', 'code', 'note', 'involve']),
		/** Anchor for the nav to jump to. */
		sectionId: z.string().optional(),
		/** Value of `data-panel`, which the scroll-linked graphic keys off. */
		panel: z.string().optional(),
		title: z.string().optional(),
		eyebrow: z.string().optional(),
		/** The oversized pull-quote that opens a `prose` section. */
		quote: z.string().optional(),
		/** Single-paragraph intro, for sections whose body is a code sample. */
		lede: z.string().optional(),
		actions: z.array(link).optional(),
		steps: z.array(z.object({ title: z.string(), body: z.string() })).optional(),
		items: z.array(z.object({ title: z.string(), body: z.string(), href: z.string() })).optional(),
		/** Label above the adapter marquee. */
		caption: z.string().optional(),
		adapters: z.array(z.object({ name: z.string(), icon: z.enum(['hub', 'route', 'box']) })).optional(),
		/** The License / Stewarded by / Contact line. */
		meta: z.array(z.object({ label: z.string(), value: z.string(), href: z.string().optional() })).optional(),
		/** Whether the mobile-only canvas graphic follows this section. */
		mobileVisual: z.boolean().default(false),
	}),
});

/** One question per file; the body is the answer. */
const faq = defineCollection({
	loader: glob({ base: './src/content/faq', pattern: '**/*.mdx' }),
	schema: z.object({
		order: z.number(),
		question: z.string(),
	}),
});

export const collections = {
	docs: defineCollection({
		loader: docsLoader({
			/**
			 * The default id generator slugifies the file path, which would turn
			 * `spec/v1.0.0/…` into `spec/v100/…` and break the versioned URL the
			 * schema's `$id` points at. The generated filenames are already
			 * URL-safe, so use them as-is.
			 */
			generateId: ({ entry }) => entry.replace(/\.mdx?$/, '').replace(/\/index$/, ''),
		}),
		schema: docsSchema(),
	}),
	landing,
	faq,
};
