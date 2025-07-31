<script lang="ts">
	import Documentation from '$lib/components/notation/Documentation.svelte';
	import Notation from '$lib/components/notation/Notation.svelte';
	import { onMount } from 'svelte';

	let classes: any = null;
	let glyphnames: any = null;
	let ranges: any = null;
	let metadata: any = null;

	$: data = {
		classes,
		glyphnames,
		ranges,
		metadata
	};

	let loading = true;
	let error: string | null = null;

	let medievalNotes = [
		{
			// Initial barline / clef placeholder (optional in your system)
			type: 'any',
			entity: 'mensuralRestLongaPerfecta'
		},

		{
			// "Dies"
			type: 'chant',
			duration: 'chantPunctum',
			pitch: 'F4',
			lyric: 'Di-'
		},
		{
			type: 'chant',
			duration: 'chantPunctum',
			pitch: 'G4',
			lyric: 'es'
		},

		{
			// Small break for "irae"
			type: 'any',
			entity: 'mensuralRestLongaPerfecta'
		},
		{
			type: 'chant',
			duration: 'chantPunctumVirga',
			pitch: 'A4',
			lyric: 'i-'
		},
		{
			type: 'chant',
			duration: 'chantPunctumInclinatum',
			pitch: 'G4',
			lyric: 'rae'
		},

		{
			// Small break for "dies"
			type: 'any',
			entity: 'mensuralRestLongaPerfecta'
		},
		{
			type: 'chant',
			duration: 'chantPunctum',
			pitch: 'F4',
			lyric: 'di-'
		},
		{
			type: 'chant',
			duration: 'chantPunctum',
			pitch: 'G4',
			lyric: 'es'
		},

		{
			// Small break for "illa"
			type: 'any',
			entity: 'mensuralRestLongaPerfecta'
		},
		{
			type: 'chant',
			duration: 'chantQuilisma',
			pitch: 'A4',
			lyric: 'il-'
		},
		{
			type: 'chant',
			duration: 'chantPunctum',
			pitch: 'G4',
			lyric: 'la'
		},

		{
			// End of phrase
			type: 'any',
			entity: 'mensuralRestLongaPerfecta'
		}
	];

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

	let searchSuggestions = ['clefs', 'individualNotes', 'rests', 'mensuralWhiteFusa', 'medieval'];
</script>

{#if loading}
	<p>Loading SMuFL metadata...</p>
{:else if error}
	<p class="text-red-600">Error: {error}</p>
{:else}
	<!-- <Note {note} {data} /> -->

	<Notation
		title="Dies irae"
		subtitle="The first few lines of the Dies irae from the Requiem Mass"
		fontSize={50}
		notes={medievalNotes}
		{data}
		staff="chantStaff"
		variant="dual"
	/>
	<!-- variant="single"
		variant="dual" -->

	<Documentation {data} defaultFilter="medieval" {searchSuggestions} />
{/if}
