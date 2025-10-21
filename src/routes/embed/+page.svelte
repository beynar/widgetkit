<script lang="ts">
	import { onMount } from 'svelte';

	onMount(() => {
		console.log('onMount');
	});
	let count = $state(0);
</script>

<svelte:head>
	<title>Embed Page</title>
	<base href="/" />
</svelte:head>
<h1>heello</h1>
<button
	onclick={() => {
		console.log('button clicked');
		count++;
	}}>Click me {count}</button
>
