<script lang="ts">
	//import DriversChampionship from '$lib/components/drivers-championship.svelte';
	import TitleText from '$lib/components/TitleText.svelte';
	import PostCard from '$lib/components/PostCard.svelte';
	import NowPlaying from '$lib/components/now-playing.svelte';
	import Button from '$lib/components/Button.svelte';
	import type { PageProps } from './$types';
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';

	let { data }: PageProps = $props();
	let posts = data.posts.posts;

	let imageDiv = $state<HTMLDivElement | null>();

	const projects = [
		{
			name: 'Atom Simulation',
			destination: 'https://atom.plumocracy.com',
			githubLink: ''
		}
	];
</script>

<div class="mt-10 flex h-full w-full flex-col items-center text-pale-2">
	<div class="flex h-full flex-row space-x-5 font-franklin text-pale-2 md:w-1/2">
		<div class="flex w-full flex-col">
			<div class="flex">
				<h2 class="mb-1 flex flex-row items-end">
					<span class="text-5xl font-semibold tracking-tighter">welcome to </span>
					<TitleText text="PLUMOCRACY" class="pl-2 text-6xl" />
				</h2>
				<div class="absolute -top-5 left-8/12 -z-1"></div>
			</div>
			<hr />
			<div class="flex w-full flex-col overflow-clip">
				<!--Header and header paragraph -->
				<div class="flex h-full w-full flex-col font-franklin text-2xl">
					<div class="flex flex-col space-y-2">
						<p class="mt-2">
							It's <span class="text-2xl font-bold">your friend</span>
							<TitleText text="PLUM" class="text-3xl" />. This is my little corner of the internet.
							I'm a software engineer, dance music lover, dweeb/dork/nerd, math fanatic, and a big
							fan of fast moving cars.
						</p>
						<p>
							I solve problems, think a lot, and read far too many whitepapers. I write about my
							engineerscapades here (you've probably read some of them). I've touched a ton of
							disciplines in the engineering world but much prefer software to anything else.
						</p>
					</div>
				</div>
			</div>

			<!-- Plum Facts -->
			<div class="mt-4 flex flex-col text-2xl">
				<h4>
					<span class="font-bold">Facts</span>
				</h4>
				<hr />
				<ul class="mt-2 mb-4 flex flex-col space-y-2">
					<li>
						My primary programming languages are <strong>typescript, go, rust, and c. </strong>
					</li>
					<li>My favorite framework is <strong>svelte.</strong></li>
					<li>
						I make <strong>interactive web apps, games, and AI applications.</strong>
					</li>
				</ul>
			</div>

			<div class="flex w-full flex-row">
				<!-- Blog Posts -->
				<div class="mt-4 flex w-1/2 flex-col pr-2 text-2xl">
					<h4>
						<span class="font-bold">Posts</span>
					</h4>
					<hr />
					<div class="mt-2 flex flex-col">
						{#each posts as post}
							<PostCard {post} />
						{/each}
					</div>
				</div>

				<!-- Projects -->
				<div class="mt-4 flex w-1/2 flex-col pl-2 text-2xl">
					<h4>
						<span class="font-bold">Projects</span>
					</h4>
					<hr />
					<div class="mt-2 flex flex-col">
						{#each projects as proj}
							<div class="flex flex-row">
								<TitleText text={proj.name} class="text-3xl underline" />
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Side bar span -->
</div>
