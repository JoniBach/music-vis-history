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
	let classicalNotes = [
		//
		{
			// note: 'barlineSingle',
			type: 'barline',
			duration: 'Single'
		},

		{
			// note: 'noteDoubleWhole',
			type: 'note',
			duration: 'DoubleWhole',
			// y: -1,
			pitch: 'D4',
			lyric: 'Notes of different lengths at different pitches'
		},
		{
			// note: 'noteDoubleWholeSquare',
			type: 'note',
			duration: 'DoubleWholeSquare',
			// y: 0,
			pitch: 'E4'
		},
		{
			// note: 'noteDoubleWhole',
			type: 'note',
			duration: 'DoubleWhole',
			// y: 1,
			pitch: 'F4'
		},
		{
			// note: 'noteWhole',
			type: 'note',
			duration: 'Whole',
			// y: 2,
			pitch: 'G4'
		},
		{
			// note: 'noteHalfUp',
			type: 'note',
			duration: 'Half',
			// y: 3,
			pitch: 'A5'
		},
		{
			// note: 'noteHalfDown',
			type: 'note',
			duration: 'Half',
			// y: 4,
			pitch: 'B5'
		},
		{
			// note: 'noteQuarterUp',
			type: 'note',
			duration: 'Quarter',
			// y: 5,
			pitch: 'C5'
		},
		{
			// note: 'note8thUp',
			type: 'note',
			duration: '8th',
			// y: 6,
			pitch: 'D5'
		},
		{
			// note: 'note16thUp',
			type: 'note',
			duration: '16th',
			// y: 7,
			pitch: 'E5'
		},
		{
			// note: 'note32ndUp',
			type: 'note',
			duration: '32nd',
			// y: 8,
			pitch: 'F5'
		},
		{
			// note: 'note64thUp',
			type: 'note',
			duration: '64th',
			// y: 9,
			pitch: 'G5'
		},

		{
			// note: 'barlineSingle',
			type: 'barline',
			duration: 'Single'
		},
		{
			// note: 'noteQuarterUp',
			type: 'note',
			duration: 'Quarter',
			// y: 10,
			pitch: 'A6',
			lyric: 'Extended Ledger Lines'
		},
		{
			// note: 'noteQuarterUp',
			type: 'note',
			duration: 'Quarter',
			// y: 11,
			pitch: 'B6'
		},
		{
			// note: 'noteQuarterUp',
			type: 'note',
			duration: 'Quarter',
			// y: 12,
			pitch: 'C6'
		},

		{
			// note: 'noteQuarterUp',
			type: 'note',
			duration: 'Quarter',
			// y: -4,
			pitch: 'A4'
		},
		{
			// note: 'noteQuarterUp',
			type: 'note',
			duration: 'Quarter',
			// y: -3,
			pitch: 'B4'
		},
		{
			// note: 'noteQuarterUp',
			type: 'note',
			duration: 'Quarter',
			// y: -2,
			pitch: 'C4'
		},
		{
			// note: 'barlineFinal',
			type: 'barline',
			duration: 'Double',
			pitch: ''
		},
		{
			// note: 'restQuarter',
			type: 'rest',
			duration: 'Half',
			y: 4,
			lyric: 'Rests of different lengths'
		},
		{
			// note: 'restQuarter',
			type: 'rest',
			duration: 'Quarter',
			y: 4
		},
		{
			// note: 'rest8th',
			type: 'rest',
			duration: '8th',
			y: 4
		},
		{
			// note: 'rest16th',
			type: 'rest',
			duration: '16th',
			y: 4
		},
		{
			// note: 'rest32nd',
			type: 'rest',
			duration: '32nd',
			y: 4
		},
		{
			// note: 'rest64th',
			type: 'rest',
			duration: '64th',
			y: 4
		},

		{
			// note: 'barlineFinal',
			type: 'barline',
			duration: 'Final',
			pitch: ''
		}

		// {
		// 	// note: 'barlineFinal',
		// 	type: 'any',
		// 	entity: 'mensuralRestMaxima',
		// }
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

	let searchSuggestions = [
		'clefs',
		'dynamics',
		'individualNotes',
		'barlines',
		'rests',
		'note16thDown',
		'medieval'
	];
</script>

{#if loading}
	<p>Loading SMuFL metadata...</p>
{:else if error}
	<p class="text-red-600">Error: {error}</p>
{:else}
	<!-- <Note {note} {data} /> -->
	<Notation
		title="Basic Classical Music Notation"
		subtitle="Some examples of different notes, rests, and other musical elements"
		fontSize={50}
		notes={classicalNotes}
		{data}
		staff="staff5Lines"
		thoroughbass
	/>

	<Documentation {data} {searchSuggestions} />
{/if}
