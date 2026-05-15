<script lang="ts">
	//import DriversChampionship from '$lib/components/drivers-championship.svelte';
	import TitleText from '$lib/components/TitleText.svelte';
	import PostCard from '$lib/components/PostCard.svelte';
	import type { PageProps } from './$types';
	import { fade } from 'svelte/transition';

	let { data }: PageProps = $props();
	let posts = data.posts.posts;

	let imageDiv = $state<HTMLDivElement | null>();

	let visible = true;

	const projects = [
		{
			name: 'Atom Simulation',
			destination: 'https://atom.plumocracy.com',
			githubLink: ''
		}
	];
</script>

{#if visible}
	<div class="my-10 flex h-full w-full flex-col items-center text-pale-2" in:fade>
		<div
			class="flex h-full w-full flex-row space-x-5 px-4 font-franklin text-pale-2 md:w-2/3 md:px-0"
		>
			<div class="flex w-full flex-col">
				<div class="flex">
					<h2 class="mb-1 flex flex-row flex-wrap items-end">
						<span class="text-3xl font-semibold tracking-tighter md:text-5xl">welcome to </span>
						<TitleText text="PLUMOCRACY" class="pl-2 text-4xl md:text-6xl" />
					</h2>
					<div class="absolute -top-5 left-8/12 -z-1"></div>
				</div>
				<hr />
				<div class="flex w-full flex-col overflow-clip">
					<div class="flex h-full w-full flex-col font-franklin text-xl md:text-2xl">
						<div class="flex flex-col space-y-2">
							<p class="mt-2">
								It's <span class="text-xl font-bold md:text-2xl">your friend</span>
								<TitleText text="PLUM" class="text-2xl md:text-3xl" />. This is my little corner of
								the internet. I'm a software engineer, dance music lover, dweeb/dork/nerd, math
								fanatic, and a big fan of fast moving cars.
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
				<div class="mt-4 flex flex-col text-xl md:text-2xl">
					<h4>
						<span class="font-bold">Facts</span>
					</h4>
					<hr />
					<ul class="mt-2 flex flex-col space-y-2">
						<li>
							My primary programming languages are <strong>typescript, go, rust, and c. </strong>
						</li>
						<li>My favorite framework is <strong>svelte.</strong></li>
						<li>
							I make <strong>interactive web apps, games, and AI applications.</strong>
						</li>
					</ul>
				</div>
				<div class="mt-4 flex w-full flex-col lg:mt-0 lg:flex-row">
					<!-- Blog Posts -->
					<div class="flex w-full flex-col text-xl md:text-2xl lg:mt-4 lg:w-1/2 lg:pr-2">
						<h4>
							<span class="font-bold">Posts</span>
						</h4>
						<hr />
						<div class="mt-2 flex flex-col space-y-4 md:space-y-1">
							{#if posts.length > 0}
								{#each posts as post}
									<PostCard {post} />
								{/each}
							{:else}
								<p class="text-2xl">No posts yet.</p>
							{/if}
						</div>
					</div>
					<!-- Projects -->
					<div class="mt-8 flex w-full flex-col text-xl md:text-2xl lg:mt-4 lg:w-1/2 lg:pl-2">
						<h4>
							<span class="font-bold">Projects</span>
						</h4>
						<hr />
						<div class="flex flex-col pt-2">
							{#each projects as proj}
								<div class="flex flex-row">
									<a href={proj.destination}>
										<TitleText text={proj.name} class="text-3xl underline md:text-3xl" />
									</a>
								</div>
							{/each}
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
