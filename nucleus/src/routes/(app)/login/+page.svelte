<script lang="ts">
	import { signIn, signOut } from '$lib/auth-client';
	import type { PageProps } from './$types';
	import Button from '$lib/components/Button.svelte';

	let { data }: PageProps = $props();
</script>

<div class="flex h-screen w-full items-center justify-center">
	{#if data.user}
		<div class="flex flex-col">
			<Button onclick={() => signOut()} class="text-2xl">Sign out</Button>
		</div>
	{:else}
		<div class="flex flex-col">
			<Button onclick={() => signIn()} class="text-2xl">Sign in with Github</Button>
		</div>
	{/if}
</div>
