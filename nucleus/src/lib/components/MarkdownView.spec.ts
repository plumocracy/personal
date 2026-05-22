import { render } from 'svelte/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('isomorphic-dompurify', () => {
	throw new Error('isomorphic-dompurify must not be imported while rendering markdown on the server');
});

describe('MarkdownView SSR', () => {
	it('renders without importing the browser-only sanitizer path', async () => {
		const { default: MarkdownView } = await import('./MarkdownView.svelte');

		const output = render(MarkdownView, {
			props: { body: '# Blog post\n\n<script>alert("xss")</script>' }
		});

		expect(output.body).toContain('prose-theme');
		expect(output.body).not.toContain('<script>');
	});
});
