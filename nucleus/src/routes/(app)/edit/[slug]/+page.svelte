<script lang="ts">
	import MarkdownEditor from '$lib/components/dashboard/MarkdownEditor.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<div class="h-screen w-full pt-10">
	<MarkdownEditor post={data.post} {form} />
</div>
