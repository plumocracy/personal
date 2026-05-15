<script lang="ts">
	import Button from '../Button.svelte';
	import MarkdownView from '../MarkdownView.svelte';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let { post, form } = $props();

	type Tabs = {
		EDIT: string;
		VIEW: string;
	};

	let tabs: Tabs = {
		EDIT: 'edit',
		VIEW: 'view'
	} as const;

	let currentTab = $state(tabs.EDIT);
	const publishText = $derived(post.post.publishedAt ? 'Unpublish' : 'Publish');

	let body = $state('');

	$effect(() => {
		body = post.post.body;
	});

	function setCurrentTab(tab: 'edit' | 'view') {
		tab == 'edit' ? (currentTab = tabs.EDIT) : (currentTab = tabs.VIEW);
	}

	async function deletePost() {
		if (!confirm('Are you sure you want to delete this post?')) {
			return;
		}

		const res = await fetch(`/api/v1/blog/posts/delete/${post.post.id}`, { method: 'DELETE' });
		if (res.status == 200) {
			goto('/dashboard');
		}
	}

	async function publishPost() {
		if (!confirm('Are you sure you want to publish this post?')) {
			return;
		}

		const res = await fetch(`/api/v1/blog/posts/publish/${post.post.id}`, { method: 'POST' });
		if (res.status == 200) {
			alert('Success!');
			location.reload();
		}
	}

	async function unpublishPost() {
		if (!confirm('Are you sure you want to hide this post?')) {
			return;
		}

		const res = await fetch(`/api/v1/blog/posts/unpublish/${post.post.id}`, { method: 'POST' });
		if (res.status == 200) {
			alert('Success!');
			location.reload();
		}
	}
</script>

<form
	class="flex h-full w-full flex-col items-center"
	method="POST"
	id="form"
	use:enhance={() => {
		return async ({ update }) => {
			await update({ reset: false }); // don't reset form fields
		};
	}}
>
	<div class="flex h-full w-2/3 flex-col">
		<div class="flex flex-row border-b text-2xl">
			<div class="flex flex-row space-x-4">
				<button
					class="px-4 outline {currentTab == tabs.EDIT
						? 'bg-plum-500'
						: 'bg-transparent'} hover:cursor-pointer"
					onclick={(e) => {
						e.preventDefault();
						setCurrentTab('edit');
					}}
				>
					Edit
				</button>
				<button
					class="px-4 outline {currentTab == tabs.VIEW
						? 'bg-plum-500'
						: 'bg-transparent'} hover:cursor-pointer"
					onclick={(e) => {
						e.preventDefault();
						setCurrentTab('view');
					}}
				>
					View
				</button>
			</div>
			<input
				type="text"
				class="border-0 bg-transparent text-2xl text-plum-500 outline-none focus:ring-0"
				value={post.post.title}
				name="title"
			/>
			{#if form?.error}
				<p class="my-auto text-sm text-red-500">{form?.error}</p>
			{/if}

			{#if form?.success}
				<p class="my-auto text-sm text-green-500">{form?.success}</p>
			{/if}
			<div class="ml-auto flex flex-row space-x-2">
				<Button
					class="text-md my-auto"
					onclick={() => {
						// Janky awful form submit bc I don't want to fix the button rn.
						const el = document.getElementById('form') as HTMLFormElement;
						el.requestSubmit();
					}}>Save</Button
				>
				<Button
					class="text-md my-auto"
					onclick={async (e: MouseEvent) => {
						e.preventDefault();
						if (post.post.publishedAt) {
							unpublishPost();
						} else {
							publishPost();
						}
					}}>{publishText}</Button
				>
				<Button class="text-md my-auto" onclick={deletePost}>Delete</Button>
			</div>
		</div>

		{#if currentTab == tabs.EDIT}
			<div class="mb-10 flex h-full w-full">
				<textarea
					class="h-full w-full resize-none border-0 bg-transparent text-xl ring-0 focus:border-0 focus:ring-0"
					bind:value={body}
					name="body"
				>
				</textarea>
			</div>
		{:else}
			<div class="mt-10 mb-10 flex w-full justify-center overflow-scroll">
				<MarkdownView {body} />
			</div>
		{/if}
	</div>
</form>
