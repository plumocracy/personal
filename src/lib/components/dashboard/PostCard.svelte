<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import { goto } from '$app/navigation';

	let { post } = $props();
</script>

<div class="flex max-w-xl flex-row items-center space-x-5 p-4 outline">
	<div class="flex flex-col">
		<h3 class="text-2xl">{post.title}</h3>
		<p>{new Date(post.createdAt).toDateString().slice(3)}</p>
	</div>
	<div class="ml-auto flex flex-row space-x-2 text-xl">
		<Button
			class=""
			onclick={() => {
				goto(`/edit/${post.id}`);
			}}>Edit</Button
		>
		<Button
			class=""
			onclick={() => {
				goto(`/blog/${post.id}`);
			}}>View</Button
		>
	</div>
</div>
