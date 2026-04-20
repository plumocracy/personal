<script lang="ts">
	let { class: className, onclick, children } = $props();
</script>

<button
	class="h-fit rounded-full bg-plum-500 px-4 text-pale-2 hover:cursor-pointer hover:bg-plum-300 active:bg-plum-700 {className}"
	{onclick}
>
	{@render children()}
</button>
