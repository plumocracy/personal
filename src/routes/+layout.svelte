<script lang="ts">
	import './layout.css';
	//import favicon from '/favicon.webp' with { type: 'file' };
	import { onMount } from 'svelte';

	let { children } = $props();

	let scrollY = $state(0);

	const images = ['/weird_star.webp', '/boomerang.webp', '/tv.webp', '/splat.webp'];

	type Image = {
		image: string;
		x: number;
		y: number;
		size: number;
		opacity: number;
		rotation: number;
		speed: number;
		bounce: boolean;
		bounceSpeed: number;
		bounceAmount: number;
	};

	let imageData: Image[] = $state([]);

	function generateImages(count: number, attempts: number = 100): Image[] {
		const particles: Image[] = [];

		for (let i = 0; i < count; i++) {
			let placed = false;

			// TODO: Cleanup these magic numbers.
			for (let attempt = 0; attempt < attempts; attempt++) {
				const candidate: Image = {
					image: images[Math.floor(Math.random() * images.length)],
					x: Math.random() * 100,
					y: Math.random() * 100,
					size: Math.random() * 80 + 40,
					opacity: Math.random() * 0.03 + 0.01,
					rotation: Math.random() * 360,
					speed: Math.random() * 0.005 + 0.015,
					bounce: Math.random() > 0.5, // 30% chance of bouncing
					bounceSpeed: Math.random() * 7 + 5, // 5–7s cycle
					bounceAmount: Math.random() * 6 + 4
				};

				const overlaps = particles.some((p) => {
					const dx = p.x - candidate.x;
					const dy = p.y - candidate.y;
					// convert size to % units (assuming ~1000px viewport)
					const minDist = (p.size + candidate.size) / 2 / 10;
					return Math.sqrt(dx * dx + dy * dy) < minDist;
				});

				if (!overlaps) {
					particles.push(candidate);
					placed = true;
					break;
				}
			}

			// if we couldn't place after max attempts, just skip
			if (!placed) console.warn(`Could not place particle ${i}`);
		}

		return particles;
	}

	onMount(() => {
		imageData = generateImages(50);

		const el = document.querySelector('.bg-atomic') as HTMLElement;

		const parallaxStrength = 0.001;
		// Really gentle parallax effect
		const handleScroll = () => {
			scrollY = window.scrollY;
			const offset = window.scrollY * parallaxStrength; // parallax strength
			el.style.setProperty('--parallax-y', `${offset}px`);
		};

		window.addEventListener('scroll', handleScroll, { passive: true });
		return () => window.removeEventListener('scroll', handleScroll);
	});
</script>

<svelte:head><link rel="icon" href="/favicon.webp" /></svelte:head>

<!-- This div contains the background images -->
<div class="fixed -z-1 h-screen w-screen">
	{#each imageData as img}
		<div
			style="
            position: fixed;
            left: {img.x}%;
            top: {img.y}%;
            transform: translateY({scrollY * img.speed}px) rotate({img.rotation}deg);
        "
		>
			<img
				src={img.image}
				alt="background"
				style="
            width: {img.size}px;
            opacity: {img.opacity};
            {img.bounce ? `animation: bounce ${img.bounceSpeed}s ease-in-out infinite;` : ''}
            --bounce-amount: {img.bounceAmount}px;
        "
			/>
		</div>
	{/each}
</div>

{@render children()}
