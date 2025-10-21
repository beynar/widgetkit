<script lang="ts">
	let { data } = $props();
</script>

<iframe
	class="h-full w-full border-none bg-amber-200"
	frameborder="0"
	title="Nested Page"
	height="100%"
	width="100%"
	srcdoc={data.html}
></iframe>
