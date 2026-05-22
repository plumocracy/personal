<script lang="ts">
	import TitleText from './TitleText.svelte';

	let { post: post } = $props();
</script>

<div class="flex w-full">
	<div class="flex w-full flex-col min-[500px]:flex-row">
		<a href={`/blog/${post.id}`} class="my-auto h-full">
			<TitleText text={post.title} class="my-auto text-3xl underline" />
		</a>
	</div>
</div>
