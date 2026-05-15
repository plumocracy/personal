<script lang="ts">
	import TitleText from '$lib/components/TitleText.svelte';
	import MarkdownView from '$lib/components/MarkdownView.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const post = data.post;
</script>

<div
	class="fixed top-0 left-0 z-10 w-full bg-plum-950/90 px-4 py-2 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none"
>
	<a href="/" class="text-pale-2 transition-colors hover:text-plum-400"> ← home </a>
</div>
<div class="flex h-screen w-full justify-center text-pale-2">
	<div class="mt-10 flex flex-col items-center sm:w-full md:w-full lg:w-1/2">
		<TitleText text={post.title.toUpperCase()} class="mb-4 text-4xl md:text-5xl" />
		<MarkdownView body={post.body} />
	</div>
</div>
