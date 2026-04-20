<script lang="ts">
	import TitleText from '$lib/components/TitleText.svelte';
	import MarkdownView from '$lib/components/MarkdownView.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const post = data.post;
</script>

<div class="flex h-screen w-full justify-center text-pale-2">
	<div class="mt-10 flex w-1/2 flex-col items-center">
		<TitleText text={post.title.toUpperCase()} class="mb-4 text-4xl" />
		<MarkdownView body={post.body} />
	</div>
</div>
