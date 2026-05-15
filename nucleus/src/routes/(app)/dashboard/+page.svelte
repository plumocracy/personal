<script lang="ts">
	import PostCard from '$lib/components/dashboard/PostCard.svelte';
	import TitleText from '$lib/components/TitleText.svelte';
	import Button from '$lib/components/Button.svelte';
	import type { PageProps } from './$types';
	import { goto } from '$app/navigation';

	type DashboardPost = PageProps['data']['visiblePosts'][number];

	let props: PageProps = $props();
	let visiblePosts = $state<DashboardPost[]>([]);
	let hiddenPosts = $state<DashboardPost[]>([]);
	let search = $state('');
	let globalFeedback = $state<string | null>(null);
	let pendingPostId = $state<number | null>(null);
	let postFeedback = $state<Record<number, string>>({});
	let initialized = $state(false);

	const normalizedSearch = $derived(search.trim().toLowerCase());
	const filteredVisiblePosts = $derived(visiblePosts.filter(matchesSearch));
	const filteredHiddenPosts = $derived(hiddenPosts.filter(matchesSearch));

	$effect(() => {
		if (initialized) {
			return;
		}

		visiblePosts = [...props.data.visiblePosts];
		hiddenPosts = [...props.data.hiddenPosts];
		initialized = true;
	});

	async function newPost() {
		const res = await fetch('/api/v1/blog/posts/new', { method: 'POST' });
		const json = await res.json();
		goto(`/edit/${json.postId}`);
	}

	function matchesSearch(post: DashboardPost) {
		if (!normalizedSearch) {
			return true;
		}

		const haystack = `${post.title} ${post.summary ?? ''}`.toLowerCase();
		return haystack.includes(normalizedSearch);
	}

	function setFeedback(postId: number, message: string) {
		postFeedback = { ...postFeedback, [postId]: message };
	}

	async function withPendingPost(post: DashboardPost, action: () => Promise<void>) {
		pendingPostId = post.id;
		globalFeedback = null;

		try {
			await action();
		} catch (err) {
			setFeedback(post.id, err instanceof Error ? err.message : 'Something went wrong');
		} finally {
			pendingPostId = null;
		}
	}

	async function deletePost(post: DashboardPost) {
		if (!confirm(`Delete \"${post.title || 'Untitled post'}\"?`)) {
			return;
		}

		await withPendingPost(post, async () => {
			const res = await fetch(`/api/v1/blog/posts/delete/${post.id}`, { method: 'DELETE' });

			if (!res.ok) {
				throw new Error('Failed to delete post');
			}

			visiblePosts = visiblePosts.filter((entry) => entry.id !== post.id);
			hiddenPosts = hiddenPosts.filter((entry) => entry.id !== post.id);
			globalFeedback = `Deleted ${post.title || 'untitled post'}.`;
		});
	}

	async function togglePublish(post: DashboardPost) {
		const nextAction = post.publishedAt ? 'hide' : 'publish';

		await withPendingPost(post, async () => {
			const endpoint = post.publishedAt
				? `/api/v1/blog/posts/unpublish/${post.id}`
				: `/api/v1/blog/posts/publish/${post.id}`;
			const res = await fetch(endpoint, { method: 'POST' });

			if (!res.ok) {
				throw new Error(`Failed to ${nextAction} post`);
			}

			if (post.publishedAt) {
				const updatedPost = { ...post, publishedAt: null };
				visiblePosts = visiblePosts.filter((entry) => entry.id !== post.id);
				hiddenPosts = [updatedPost, ...hiddenPosts.filter((entry) => entry.id !== post.id)];
				setFeedback(post.id, 'Moved to hidden drafts.');
				globalFeedback = `Hid ${post.title || 'untitled post'}.`;
				return;
			}

			const updatedPost = { ...post, publishedAt: new Date() };
			hiddenPosts = hiddenPosts.filter((entry) => entry.id !== post.id);
			visiblePosts = [updatedPost, ...visiblePosts.filter((entry) => entry.id !== post.id)];
			setFeedback(post.id, 'Published successfully.');
			globalFeedback = `Published ${post.title || 'untitled post'}.`;
		});
	}
</script>

<div class="min-h-screen w-full px-4 pb-16 pt-10 text-pale-2 md:px-8">
	<div class="mx-auto flex w-full max-w-6xl flex-col gap-10">
		<div class="flex flex-col gap-4 border-b border-plum-800/80 pb-6 xl:flex-row xl:items-end xl:justify-between">
			<div class="space-y-2">
				<p class="text-sm uppercase tracking-[0.3em] text-plum-300">Admin</p>
				<h1><TitleText text="DASHED FREAKING BORED" class="text-4xl md:text-5xl" /></h1>
				<p class="max-w-2xl text-sm text-pale-2/80 md:text-base">
					Manage published posts and drafts without digging through full article payloads.
				</p>
			</div>
			<div class="flex flex-col gap-3 xl:min-w-[30rem] xl:max-w-[38rem] xl:flex-row xl:items-end xl:justify-end">
				<label class="flex flex-1 flex-col gap-2 text-sm text-pale-2/80 xl:min-w-[22rem]">
					<span class="uppercase tracking-[0.2em] text-plum-300">Search posts</span>
					<input
						bind:value={search}
						type="search"
						placeholder="Search titles or summaries"
						class="h-11 rounded-full border border-plum-800 bg-plum-950/70 px-4 text-pale outline-none transition placeholder:text-pale-2/45 focus:border-plum-400"
					/>
				</label>

				<Button class="h-11 self-start px-4 text-base md:self-auto md:text-lg" onclick={newPost}
					>New Post</Button
				>
			</div>
		</div>

		{#if globalFeedback}
			<div class="rounded-2xl border border-plum-700/70 bg-plum-900/40 px-4 py-3 text-sm text-plum-100">
				{globalFeedback}
			</div>
		{/if}

		<div class="space-y-10">
			<section class="space-y-4">
				<div class="flex items-center justify-between gap-4">
					<div>
						<h2><TitleText text="PUBLISHED" class="text-2xl md:text-3xl" /></h2>
						<p class="text-sm text-pale-2/75">Live posts sorted by publish date.</p>
					</div>
					<p class="text-sm text-pale-2/75">{visiblePosts.length} total</p>
				</div>

				{#if filteredVisiblePosts.length > 0}
					<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
						{#each filteredVisiblePosts as post}
							<PostCard
								{post}
								onDelete={deletePost}
								onTogglePublish={togglePublish}
								pending={pendingPostId === post.id}
								feedback={postFeedback[post.id] ?? null}
							/>
						{/each}
					</div>
				{:else if visiblePosts.length > 0}
					<div class="rounded-2xl border border-dashed border-plum-800/80 px-5 py-8 text-sm text-pale-2/75">
						No published posts match the current search.
					</div>
				{:else}
					<div class="rounded-2xl border border-dashed border-plum-800/80 px-5 py-8 text-sm text-pale-2/75">
						No published posts yet.
					</div>
				{/if}
			</section>

			<section class="space-y-4">
				<div class="flex items-center justify-between gap-4">
					<div>
						<h2><TitleText text="HIDDEN" class="text-2xl md:text-3xl" /></h2>
						<p class="text-sm text-pale-2/75">Drafts and unpublished work.</p>
					</div>
					<p class="text-sm text-pale-2/75">{hiddenPosts.length} total</p>
				</div>

				{#if filteredHiddenPosts.length > 0}
					<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
						{#each filteredHiddenPosts as post}
							<PostCard
								{post}
								onDelete={deletePost}
								onTogglePublish={togglePublish}
								pending={pendingPostId === post.id}
								feedback={postFeedback[post.id] ?? null}
							/>
						{/each}
					</div>
				{:else if hiddenPosts.length > 0}
					<div class="rounded-2xl border border-dashed border-plum-800/80 px-5 py-8 text-sm text-pale-2/75">
						No drafts match the current search.
					</div>
				{:else}
					<div class="rounded-2xl border border-dashed border-plum-800/80 px-5 py-8 text-sm text-pale-2/75">
						No hidden posts waiting on edits.
					</div>
				{/if}
			</section>
		</div>
	</div>
</div>
