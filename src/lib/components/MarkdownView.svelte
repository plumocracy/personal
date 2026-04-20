<script lang="ts">
	import { marked } from 'marked';
	import DOMPurify from 'isomorphic-dompurify';

	let { body } = $props();

	const html = DOMPurify.sanitize(marked.parse(body) as string);
</script>

<div class="prose-theme prose w-full max-w-none px-4 pb-10">
	{@html html}
</div>

<style>
	:global(.prose-theme) {
		font-family: var(--font-franklin);
		color: var(--color-pale-2);
		font-size: 1.3rem;
	}

	/* Headings */
	:global(.prose-theme h1, .prose-theme h2, .prose-theme h3, .prose-theme h4) {
		font-family: var(--font-franklin);
		color: var(--color-pale);
		font-weight: 600;
		letter-spacing: -0.02em;
	}
	:global(.prose-theme h1) {
		font-size: clamp(2.16rem, 6vw, 3rem);
	}
	:global(.prose-theme h2) {
		font-size: clamp(1.68rem, 4.8vw, 2.4rem);
	}
	:global(.prose-theme h3) {
		font-size: clamp(1.44rem, 3.6vw, 1.8rem);
	}

	/* Links */
	:global(.prose-theme a) {
		color: var(--color-plum-400);
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	:global(.prose-theme a:hover) {
		color: var(--color-plum-300);
	}

	/* Strong / em */
	:global(.prose-theme strong) {
		color: var(--color-pale);
		font-weight: 700;
	}
	:global(.prose-theme em) {
		color: var(--color-poink);
	}

	/* Code */
	:global(.prose-theme code) {
		background: var(--color-plum-950);
		color: var(--color-mint);
		padding: 0.15em 0.4em;
		border-radius: 4px;
		font-size: 0.9em;
	}
	:global(.prose-theme pre) {
		background: var(--color-plum-950);
		border: 1px solid var(--color-plum-800);
		border-radius: 8px;
		padding: 1rem;
		overflow-x: auto;
	}
	:global(.prose-theme pre code) {
		background: transparent;
		padding: 0;
	}

	/* Blockquote */
	:global(.prose-theme blockquote) {
		border-left: 3px solid var(--color-plum-500);
		color: var(--color-pale-2);
		padding-left: 1rem;
		font-style: italic;
	}

	/* HR */
	:global(.prose-theme hr) {
		border-color: var(--color-plum-800);
	}

	/* Lists */
	:global(.prose-theme ul, .prose-theme ol) {
		color: var(--color-pale-2);
	}
	:global(.prose-theme li::marker) {
		color: var(--color-plum-400);
	}
</style>
