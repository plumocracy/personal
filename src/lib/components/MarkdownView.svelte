<script lang="ts">
	import { marked } from 'marked';
	import DOMPurify from 'isomorphic-dompurify';

	let { body } = $props();

	body = marked.parse(body);
	body = DOMPurify.sanitize(body);

	const proseStyles = ['prose justify-center w-full', 'prose-lg prose-invert text-pale-2 pb-10'];
</script>

<div class={proseStyles.join(' ')}>
	{@html marked(body)}
</div>
