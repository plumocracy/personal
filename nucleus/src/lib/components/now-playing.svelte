<script>
	import { onMount } from 'svelte';

	let count = 0;
	let interval;

	let nowPlaying = $state();

	onMount(async () => {
		let res = await fetch('/api/v1/spotify/now_listening');
		nowPlaying = await res.json();
		interval = setInterval(async () => {
			let res = await fetch('/api/v1/spotify/now_listening');
			nowPlaying = await res.json();
		}, 5_000);
	});
</script>

<div class="flex flex-row space-y-2 rounded-sm p-4">
	{#if nowPlaying}
		<div class="flex h-40 w-40 flex-col">
			<img src={nowPlaying.albumArt} />
		</div>
		<div class="flex flex-col text-center text-wrap">
			<p>{nowPlaying.title}</p>
			<p>{nowPlaying.artist}</p>
		</div>
	{/if}
</div>
