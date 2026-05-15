<script lang="ts">
	import { goto } from '$app/navigation';

	type PostListItem = {
		id: number;
		title: string;
		summary: string | null;
		createdAt: Date;
		publishedAt: Date | null;
	};

	let {
		post,
		onDelete,
		onTogglePublish,
		pending = false,
		feedback = null
	}: {
		post: PostListItem;
		onDelete: (post: PostListItem) => Promise<void>;
		onTogglePublish: (post: PostListItem) => Promise<void>;
		pending?: boolean;
		feedback?: string | null;
	} = $props();

	const createdDate = $derived(
		new Date(post.createdAt).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		})
	);
	const publishedDate = $derived(
		post.publishedAt
			? new Date(post.publishedAt).toLocaleDateString(undefined, {
					month: 'short',
					day: 'numeric',
					year: 'numeric'
				})
			: null
	);
	const status = $derived(post.publishedAt ? 'Published' : 'Draft');
	const toggleLabel = $derived(post.publishedAt ? 'Hide' : 'Publish');
</script>

<div class="flex h-full min-h-52 flex-col rounded-2xl border border-plum-800/80 bg-plum-950/60 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
	<div class="flex items-start justify-between gap-4">
		<div class="min-w-0">
			<p class="text-xs font-semibold uppercase tracking-[0.2em] text-plum-300">{status}</p>
			<h3 class="mt-2 line-clamp-2 text-2xl text-pale">{post.title || 'Untitled post'}</h3>
			<div class="mt-3 space-y-1 text-sm text-pale-2">
				<p>Created {createdDate}</p>
				<p>{publishedDate ? `Published ${publishedDate}` : 'Not published yet'}</p>
			</div>
		</div>
	</div>

	<div class="mt-4 min-h-12 text-sm leading-6 text-pale-2/85">
		<p class="line-clamp-2">{post.summary || 'No summary yet. Open the editor to add one.'}</p>
	</div>

	{#if feedback}
		<p class="mt-4 text-sm text-plum-200">{feedback}</p>
	{/if}

	<div class="mt-auto flex flex-wrap gap-2 pt-5 text-base">
		<button
			type="button"
			class="rounded-full bg-plum-500 px-3 py-1.5 text-pale-2 transition hover:cursor-pointer hover:bg-plum-300 disabled:cursor-not-allowed disabled:bg-plum-900 disabled:text-pale-2/60"
			disabled={pending}
			onclick={() => {
				goto(`/edit/${post.id}`);
			}}
		>
			Edit
		</button>
		<button
			type="button"
			class="rounded-full bg-plum-500 px-3 py-1.5 text-pale-2 transition hover:cursor-pointer hover:bg-plum-300 disabled:cursor-not-allowed disabled:bg-plum-900 disabled:text-pale-2/60"
			disabled={pending}
			onclick={() => {
				goto(`/blog/${post.id}`);
			}}
		>
			View
		</button>
		<button
			type="button"
			class="rounded-full border border-plum-700 px-3 py-1.5 text-pale-2 transition hover:cursor-pointer hover:border-plum-400 hover:text-plum-200 disabled:cursor-not-allowed disabled:border-plum-900 disabled:text-pale-2/60"
			disabled={pending}
			onclick={() => onTogglePublish(post)}
		>
			{toggleLabel}
		</button>
		<button
			type="button"
			class="rounded-full border border-red-900/70 px-3 py-1.5 text-red-200 transition hover:cursor-pointer hover:border-red-500 hover:text-red-100 disabled:cursor-not-allowed disabled:border-red-950 disabled:text-red-200/50"
			disabled={pending}
			onclick={() => onDelete(post)}
		>
			Delete
		</button>
	</div>
</div>
