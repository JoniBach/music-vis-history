<!-- | Medieval           | ~1000–1200 CE    | Staff Notation                | Place notes on lines to fix pitch          | Guido of Arezzo           | Italy               | [Musical notation](https://en.wikipedia.org/wiki/Musical_notation) | -->

<script lang="ts">
	import StaffNotation from '$lib/components/StaffNotation.svelte';
	import type { NoteData } from '$lib/components/types.js';

	// Example configurations for different musical examples
	const basicScale: NoteData[] = [
		{ pitch: 'C4', duration: 'crotchet' },
		{ pitch: 'D4', duration: 'quaver' },
		{ pitch: 'E4', duration: 'quaver' },
		{ pitch: 'F4', duration: 'quaver' },
		{ pitch: 'G4', duration: 'quaver' },
		{ pitch: 'A4', duration: 'quaver' },
		{ pitch: 'B4', duration: 'quaver' },
		{ pitch: 'C5', duration: 'crotchet' },
		{ pitch: 'D5', duration: 'quaver' },
		{ pitch: 'E5', duration: 'quaver' },
		{ pitch: 'F5', duration: 'quaver' },
		{ pitch: 'G5', duration: 'quaver' },
		{ pitch: 'A5', duration: 'quaver' },
		{ pitch: 'B5', duration: 'quaver' },
		{ pitch: 'C6', duration: 'crotchet' }
	];

	const rhythmExample: NoteData[] = [
		{ pitch: 'C4', duration: 'semi quaver' },
		{ pitch: 'D4', duration: 'semi quaver' },
		{ pitch: 'E4', duration: 'semi quaver' },
		{ pitch: 'D4', duration: 'semi quaver' },
		{ pitch: 'E4', duration: 'quaver' },
		{ pitch: 'F4', duration: 'crotchet' },
		{ pitch: 'B4', duration: 'quaver' },
		{ pitch: 'C5', duration: 'semi quaver' },
		{ pitch: 'B4', duration: 'semi quaver' },
		{ pitch: 'A4', duration: 'semi quaver' },
		{ pitch: 'G4', duration: 'semi quaver' }
	];

	const melodicPhrase: NoteData[] = [
		{ pitch: 'G4', duration: 'crotchet' },
		{ pitch: 'A4', duration: 'crotchet' },
		{ pitch: 'B4', duration: 'crotchet' },
		{ pitch: 'C5', duration: 'crotchet' },
		{ pitch: 'B4', duration: 'crotchet' },
		{ pitch: 'A4', duration: 'crotchet' },
		{ pitch: 'G4', duration: 'minim' }
	];

	// Event handlers
	const handleNotePlay = (event: CustomEvent<{ pitch: string; duration: string }>) => {
		console.log('Note played:', event.detail);
	};

	const handleScalePlay = (event: CustomEvent<{ notes: any[] }>) => {
		console.log('Scale played:', event.detail.notes.length, 'notes');
	};
</script>

<svelte:head>
	<title>Staff Notation - Music Visualization History</title>
</svelte:head>

<h1>Staff Notation</h1>

<p>
	Staff notation, developed by Guido of Arezzo around 1000-1200 CE, revolutionized music by placing
	notes on lines to fix pitch. This system allowed for precise notation of melody and became the
	foundation of Western musical notation.
</p>

<div class="examples">
	<StaffNotation
		notes={basicScale}
		title="Basic C Major Scale"
		description="A simple ascending C major scale demonstrating the fundamental staff notation system."
		clef="treble"
		timeSignature={{ numerator: 4, denominator: 4 }}
		scale={0.3}
		showLabels={true}
		showPlayButton={true}
		interactive={true}
		on:notePlay={handleNotePlay}
		on:scalePlay={handleScalePlay}
	/>

	<StaffNotation
		notes={rhythmExample}
		title="Rhythm Demonstration"
		description="Various note durations from whole notes to sixteenth notes, showing the evolution of rhythmic notation."
		clef="treble"
		timeSignature={{ numerator: 4, denominator: 4 }}
		scale={0.5}
		width={1000}
		showLabels={true}
		showPlayButton={true}
		interactive={true}
		on:notePlay={handleNotePlay}
		on:scalePlay={handleScalePlay}
	/>

	<StaffNotation
		notes={melodicPhrase}
		title="Simple Melodic Phrase"
		description="A basic melodic phrase demonstrating how staff notation captures both pitch and rhythm relationships."
		clef="treble"
		timeSignature={{ numerator: 3, denominator: 4 }}
		scale={0.7}
		showLabels={false}
		showPlayButton={true}
		interactive={true}
		on:notePlay={handleNotePlay}
		on:scalePlay={handleScalePlay}
	/>
</div>
