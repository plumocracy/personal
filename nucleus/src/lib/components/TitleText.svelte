<script lang="ts">
	let { text: myText, class: className = '' } = $props();
</script>

<span class="font-oswald tracking-tighter text-plum-500 {className}">{myText}</span>
