<script lang="ts">
	import Button from '../Button.svelte';
	import MarkdownView from '../MarkdownView.svelte';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { fade, fly } from 'svelte/transition';

	let { post, form } = $props();

	type Tab = 'edit' | 'view';
	type Toast = {
		type: 'success' | 'error';
		message: string;
	};

	let currentTab = $state<Tab>('edit');

	let title = $state('');
	let body = $state('');
	let publishedAt = $state<Date | null>(null);
	let lastSavedSnapshot = $state('');
	let autosaveState = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');
	let lastAutosavedAt = $state<Date | null>(null);
	let isSaving = $state(false);
	let isPublishing = $state(false);
	let isDeleting = $state(false);
	let toast = $state<Toast | null>(null);
	let toastTimeout = $state<ReturnType<typeof setTimeout> | null>(null);
	const publishText = $derived(publishedAt ? 'Unpublish' : 'Publish');
	const autosaveMessage = $derived.by(() => {
		if (publishedAt) {
			return null;
		}

		if (autosaveState === 'saving') {
			return 'Autosaving draft...';
		}

		if (autosaveState === 'error') {
			return 'Autosave failed';
		}

		if (lastAutosavedAt) {
			return `Autosaved at ${lastAutosavedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
		}

		return 'Autosave every 15 seconds';
	});

	$effect(() => {
		title = post.post.title;
		body = post.post.body;
		publishedAt = post.post.publishedAt ? new Date(post.post.publishedAt) : null;
		lastSavedSnapshot = JSON.stringify({ title: post.post.title, body: post.post.body });
		autosaveState = 'idle';
		lastAutosavedAt = null;
	});

	$effect(() => {
		if (publishedAt) {
			return;
		}

		const interval = setInterval(() => {
			void autosaveDraft();
		}, 15000);

		return () => {
			clearInterval(interval);
		};
	});

	function setCurrentTab(tab: Tab) {
		currentTab = tab;
	}

	function showToast(type: Toast['type'], message: string) {
		if (toastTimeout) {
			clearTimeout(toastTimeout);
		}

		toast = { type, message };
		toastTimeout = setTimeout(() => {
			toast = null;
			toastTimeout = null;
		}, 3000);
	}

	function getSnapshot() {
		return JSON.stringify({ title, body });
	}

	async function persistDraft({ showSuccessToast }: { showSuccessToast: boolean }) {
		if (publishedAt || isSaving || isPublishing || isDeleting) {
			return false;
		}

		const snapshot = getSnapshot();

		if (snapshot === lastSavedSnapshot) {
			return true;
		}

		autosaveState = 'saving';

		const res = await fetch(`/api/v1/blog/posts/${post.post.id}`, {
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ title, body })
		});

		if (!res.ok) {
			autosaveState = 'error';
			throw new Error('Failed to save draft');
		}

		lastSavedSnapshot = snapshot;
		lastAutosavedAt = new Date();
		autosaveState = 'saved';

		if (showSuccessToast) {
			showToast('success', 'Saved successfully.');
		}

		return true;
	}

	async function autosaveDraft() {
		try {
			await persistDraft({ showSuccessToast: false });
		} catch {
			return;
		}
	}

	async function deletePost() {
		if (!confirm('Are you sure you want to delete this post?')) {
			return;
		}

		isDeleting = true;

		try {
			const res = await fetch(`/api/v1/blog/posts/delete/${post.post.id}`, { method: 'DELETE' });

			if (!res.ok) {
				throw new Error('Failed to delete post');
			}

			showToast('success', 'Post deleted.');
			goto('/dashboard');
		} catch (error) {
			showToast('error', error instanceof Error ? error.message : 'Failed to delete post');
		} finally {
			isDeleting = false;
		}
	}

	async function publishPost() {
		if (!confirm('Are you sure you want to publish this post?')) {
			return;
		}

		isPublishing = true;

		try {
			const res = await fetch(`/api/v1/blog/posts/publish/${post.post.id}`, { method: 'POST' });

			if (!res.ok) {
				throw new Error('Failed to publish post');
			}

			publishedAt = new Date();
			showToast('success', 'Post published.');
		} catch (error) {
			showToast('error', error instanceof Error ? error.message : 'Failed to publish post');
		} finally {
			isPublishing = false;
		}
	}

	async function unpublishPost() {
		if (!confirm('Are you sure you want to hide this post?')) {
			return;
		}

		isPublishing = true;

		try {
			const res = await fetch(`/api/v1/blog/posts/unpublish/${post.post.id}`, { method: 'POST' });

			if (!res.ok) {
				throw new Error('Failed to hide post');
			}

			publishedAt = null;
			showToast('success', 'Post moved back to drafts.');
		} catch (error) {
			showToast('error', error instanceof Error ? error.message : 'Failed to hide post');
		} finally {
			isPublishing = false;
		}
	}
</script>

<form
	class="flex h-full w-full flex-col items-center"
	method="POST"
	id="form"
	use:enhance={() => {
		return async ({ result, update }) => {
			isSaving = true;

			if (result.type === 'success') {
				await update({ reset: false });
				lastSavedSnapshot = getSnapshot();
				if (!publishedAt) {
					lastAutosavedAt = new Date();
					autosaveState = 'saved';
				}
				showToast('success', 'Saved successfully.');
			} else if (result.type === 'failure') {
				await update({ reset: false });
				autosaveState = 'error';
				showToast('error', 'Failed to save post.');
			} else if (result.type === 'error') {
				autosaveState = 'error';
				showToast('error', 'Something went wrong while saving.');
			}

			isSaving = false;
		};
	}}
>
	{#if toast}
		<div class="fixed right-6 bottom-6 z-50 max-w-sm rounded-2xl border px-4 py-3 text-sm shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur {toast.type === 'success' ? 'border-emerald-500/40 bg-emerald-950/90 text-emerald-100' : 'border-red-500/40 bg-red-950/90 text-red-100'}">
			{toast.message}
		</div>
	{/if}

	<div class="flex h-full w-full max-w-6xl flex-col px-4 pb-8 md:px-8">
		<div class="flex flex-col gap-4 border-b border-plum-800/80 pb-4 lg:flex-row lg:items-center lg:justify-between">
			<div class="flex flex-col gap-4 lg:flex-row lg:items-center">
				<div class="inline-flex w-fit rounded-full border border-plum-800 bg-plum-950/70 p-1">
					<button
						type="button"
						class={`rounded-full px-4 py-2 text-sm font-medium transition ${currentTab === 'edit' ? 'bg-plum-500 text-pale' : 'text-pale-2 hover:text-pale'}`}
						onclick={() => {
							setCurrentTab('edit');
						}}
					>
						Edit
					</button>
					<button
						type="button"
						class={`rounded-full px-4 py-2 text-sm font-medium transition ${currentTab === 'view' ? 'bg-plum-500 text-pale' : 'text-pale-2 hover:text-pale'}`}
						onclick={() => {
							setCurrentTab('view');
						}}
					>
						Preview
					</button>
				</div>

					<button
						type="button"
						class="rounded-full border border-plum-800 px-3 py-1 text-xs uppercase tracking-[0.2em] text-plum-300"
					>
						{publishedAt ? 'Published' : 'Draft'}
					</button>
					{#if autosaveMessage}
						<p class={`text-xs ${autosaveState === 'error' ? 'text-red-300' : 'text-pale-2/70'}`}>
							{autosaveMessage}
						</p>
					{/if}
				</div>

			<div class="flex flex-wrap gap-2 lg:justify-end">
				<Button
					class="h-10 px-4 text-sm md:text-base"
					onclick={() => {
						const el = document.getElementById('form') as HTMLFormElement;
						el.requestSubmit();
					}}
				>{isSaving ? 'Saving...' : 'Save'}</Button
				>
				<Button
					class="h-10 px-4 text-sm md:text-base"
					onclick={async (e: MouseEvent) => {
						e.preventDefault();
						if (publishedAt) {
							await unpublishPost();
						} else {
							await publishPost();
						}
					}}
				>{isPublishing ? 'Working...' : publishText}</Button
				>
				<Button class="h-10 px-4 text-sm md:text-base" onclick={deletePost}
					>{isDeleting ? 'Deleting...' : 'Delete'}</Button
				>
			</div>
		</div>

		<div class="mt-6 flex w-full flex-col gap-3">
			<label for="post-title" class="text-xs uppercase tracking-[0.2em] text-plum-300">Title</label>
			<input
				id="post-title"
				type="text"
				class="w-full rounded-3xl border border-plum-900 bg-plum-950/35 px-4 py-3 text-lg text-plum-400 outline-none transition placeholder:text-plum-700 focus:border-plum-500 md:text-xl"
				bind:value={title}
				name="title"
				placeholder="Untitled post"
			/>
		</div>

		{#if currentTab === 'edit'}
			<div
				class="mt-6 flex h-full w-full rounded-3xl border border-plum-900 bg-plum-950/35 p-4 md:p-6"
				in:fly={{ y: 10, duration: 160 }}
				out:fade={{ duration: 120 }}
			>
				<textarea
					class="h-full min-h-[60vh] w-full resize-none border-0 bg-transparent font-franklin text-lg text-pale-2 ring-0 outline-none focus:border-0 focus:ring-0 md:text-xl"
					bind:value={body}
					name="body"
					placeholder="Write something worth publishing..."
				>
				</textarea>
			</div>
		{:else}
			<div
				class="mt-6 mb-6 flex min-h-[60vh] w-full overflow-auto rounded-3xl border border-plum-900 bg-plum-950/35 px-2 py-4 md:px-6"
				in:fade={{ duration: 160 }}
				out:fade={{ duration: 120 }}
			>
				<MarkdownView {body} />
			</div>
		{/if}
	</div>
</form>
