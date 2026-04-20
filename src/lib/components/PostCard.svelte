<script lang="ts">
	import TitleText from './TitleText.svelte';

	let { post: post } = $props();
</script>

<div class="flex w-full">
	<div class="flex h-12 w-full flex-row">
		<a href={`/blog/${post.id}`} class="my-auto h-full">
			<TitleText text={post.title} class="my-auto text-3xl underline" />
		</a>
		<p class="my-auto ml-auto text-xl">{new Date(post.date).toDateString()}</p>
	</div>
</div>
