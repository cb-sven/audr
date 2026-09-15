import type { CollectionEntry } from 'astro:content';

/**
 * Flattens a FAQ answer's Markdown body into the single paragraph of plain text
 * schema.org expects. Answers are short prose — paragraphs and the odd bit of
 * emphasis — so unwrapping soft line breaks and stripping `*`/`_` is enough.
 */
function toPlainText(markdown: string): string {
	return markdown
		.trim()
		.split(/\n\s*\n/)
		.map((paragraph) => paragraph.replace(/\s+/g, ' ').replace(/[*_`]/g, '').trim())
		.join(' ');
}

/**
 * Builds the FAQPage node from the FAQ content files, so the structured data
 * and the rendered accordion can never disagree.
 */
export function faqJsonLd(entries: CollectionEntry<'faq'>[], siteUrl: string) {
	return {
		'@type': 'FAQPage',
		'@id': `${siteUrl}#faq`,
		url: `${siteUrl}#faqs`,
		isPartOf: { '@id': `${siteUrl}#homepage` },
		mainEntity: entries.map((entry) => ({
			'@type': 'Question',
			name: entry.data.question,
			acceptedAnswer: {
				'@type': 'Answer',
				text: toPlainText(entry.body ?? ''),
			},
		})),
	};
}
