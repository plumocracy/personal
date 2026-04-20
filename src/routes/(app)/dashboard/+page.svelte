<script lang="ts">
	import PostCard from '$lib/components/dashboard/PostCard.svelte';
	import TitleText from '$lib/components/TitleText.svelte';
	import Button from '$lib/components/Button.svelte';
	import type { PageProps } from './$types';
	import { goto } from '$app/navigation';

	let { data }: PageProps = $props();

	const user = data.user;
	const posts = data.visiblePosts.posts;
	const hidden = data.hiddenPosts.posts;

	async function newPost() {
		const res = await fetch('/api/v1/blog/posts/new', { method: 'POST' });
		const json = await res.json();
		goto(`/edit/${json.postId}`);
	}
</script>

<div class="flex h-screen w-full flex-col items-center">
	<div class="flex w-2/3 flex-row space-x-5 pt-10">
		<h1><TitleText text="DASHED FREAKING BORED" class="text-5xl" /></h1>
		<Button class="my-auto text-2xl" onclick={newPost}>New Post</Button>
	</div>
	<div class="mt-5 flex w-2/3 flex-col space-y-5">
		<div class="flex flex-col space-y-2">
			<div class="flex flex-col">
				<h2><TitleText text="PUBLISHED" class="text-3xl" /></h2>
				<hr />
			</div>
			<div class="flex flex-row space-x-2">
				{#each posts as post}
					<PostCard {post} />
				{/each}
			</div>
		</div>

		<div class="flex flex-col space-y-2">
			<div class="flex flex-col">
				<h2><TitleText text="HIDDEN" class="text-3xl" /></h2>
				<hr />
			</div>
			<div class="flex flex-row space-x-2">
				{#each hidden as post}
					<PostCard {post} />
				{/each}
			</div>
		</div>
	</div>
	<!-- Hidden Posts -->
</div>
