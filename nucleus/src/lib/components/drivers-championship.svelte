<script lang="ts">
	import { onMount } from 'svelte';
	import { type DriverStanding } from '$lib/types/f1types';

	let driverData = $state<DriverStanding | null>();
	let loading = $state<boolean>(true);

	onMount(async () => {
		const apiResult = await fetch('api/v1/f1/driver');
		const resultJson = await apiResult.json();
		driverData = resultJson.driverData;
		loading = false;
	});
</script>

<div class="flex h-48 flex-row p-4">
	{#if loading}
		<p>Loading...</p>
	{:else}
		<div class="flex h-full w-full flex-row text-2xl">
			<p><strong>Piastri</strong> is currently in {driverData!.championshipPosition}</p>

			<img
				class="my-auto ml-auto h-48"
				src="https://media.formula1.com/image/upload/c_fill,w_720/q_auto/v1740000001/common/f1/2026/mclaren/oscpia01/2026mclarenoscpia01right.webp"
			/>
		</div>
	{/if}
</div>
