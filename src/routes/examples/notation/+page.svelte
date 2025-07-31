<script lang="ts">
	import { onMount } from 'svelte';

	let classes: any = null;
	let glyphnames: any = null;
	let ranges: any = null;
	let metadata: any = null;

	let loading = true;
	let error: string | null = null;

	onMount(async () => {
		try {
			const [classesRes, glyphnamesRes, rangesRes, metadataRes] = await Promise.all([
				fetch('/smufl/metadata/classes.json'),
				fetch('/smufl/metadata/glyphnames.json'),
				fetch('/smufl/metadata/ranges.json'),
				fetch('/smufl/metadata/bravura_metadata.json')
			]);

			if (!classesRes.ok || !glyphnamesRes.ok || !rangesRes.ok || !metadataRes.ok) {
				throw new Error('One or more files failed to load');
			}

			[classes, glyphnames, ranges, metadata] = await Promise.all([
				classesRes.json(),
				glyphnamesRes.json(),
				rangesRes.json(),
				metadataRes.json()
			]);
		} catch (err) {
			error = err.message;
		} finally {
			loading = false;
		}
	});
</script>

{#if loading}
	<p>Loading SMuFL metadata...</p>
{:else if error}
	<p class="text-red-600">Error: {error}</p>
{:else}
	<h1 class="text-xl font-bold mb-4">Baruvra Metadata Viewer</h1>

	<section class="mb-6">
		<h2 class="text-lg font-semibold">Engraving Defaults</h2>
		<pre class="bg-gray-100 p-2 overflow-auto text-sm">{JSON.stringify(
				metadata.engravingDefaults,
				null,
				2
			)}</pre>
	</section>

	<section class="mb-6">
		<h2 class="text-lg font-semibold">Glyphs (first 20)</h2>
		{#if metadata.glyphs}
			<ul class="text-sm grid grid-cols-2 gap-1">
				{#each Object.entries(metadata.glyphs).slice(0, 20) as [name, data]}
					<li><strong>{name}</strong>: {data.codepoint}</li>
				{/each}
			</ul>
		{:else}
			<p class="text-gray-500">No glyphs data available</p>
		{/if}
	</section>

	<section class="mb-6">
		<h2 class="text-lg font-semibold">Classes</h2>
		<pre class="bg-gray-100 p-2 overflow-auto text-sm">{JSON.stringify(classes, null, 2)}</pre>
	</section>

	<section class="mb-6">
		<h2 class="text-lg font-semibold">Ranges</h2>
		<pre class="bg-gray-100 p-2 overflow-auto text-sm">{JSON.stringify(ranges, null, 2)}</pre>
	</section>
{/if}

<style>
	h1,
	h2 {
		font-family: system-ui, sans-serif;
	}
</style>
