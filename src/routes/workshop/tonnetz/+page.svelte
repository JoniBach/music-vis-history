<script lang="ts">
	import Tonnetz from '$lib/components/visualization/Tonnetz.svelte';
	import TonnetzControls, {
		type TonnetzControlsData
	} from '$lib/components/visualization/TonnetzControls.svelte';

	// State management for controls - now at page level
	let controls: TonnetzControlsData = {
		numOctaves: 1,
		baseOctave: 4,
		gridRadius: 2,
		zoomScale: 1.5,
		startingNote: 'C',
		oscillatorType: 'sawtooth',
		showChordNames: true,
		showRomanNumerals: true,
		showRootHighlight: true,
		showTriangles: true,
		showDyads: true,
		showNoteLabels: true,
		showLegend: true,
		showOnlyKeyTriangles: false,
		showMajorTriangles: true,
		showMinorTriangles: true,
		triadFilter: [],
		showUniqueTriadsOnly: true,
		showUniqueNotesOnly: false,
		hideOrphanNotes: true,
		hideFilteredElements: true
	};

	// Component references
	let tonnetzComponent: Tonnetz;

	// Event handlers for controls
	const handleRegenerate = () => {
		if (tonnetzComponent) {
			tonnetzComponent.regenerate();
		}
	};

	const handleZoomChange = () => {
		if (tonnetzComponent) {
			tonnetzComponent.applyZoomChange();
		}
	};

	const handleOscillatorChange = () => {
		if (tonnetzComponent) {
			tonnetzComponent.updateOscillatorType();
		}
	};
</script>

<svelte:head>
	<title>Tonnetz (Tone Network) - Music Visualization History</title>
	<meta
		name="description"
		content="Interactive Tonnetz lattice diagram showing pitch relationships in music theory"
	/>
</svelte:head>

<!-- Tonnetz: A hexagonal lattice representing harmonic relationships in music theory -->
<div class="content">
	<h1>The Tonnetz System</h1>
</div>

<div class="tonnetz-example">
	<!-- Interactive Tonnetz Component with Controls -->
	<div class="tonnetz-controls">
		<TonnetzControls
			bind:controls
			on:regenerate={handleRegenerate}
			on:zoomChange={handleZoomChange}
			on:oscillatorChange={handleOscillatorChange}
		/>
	</div>

	<Tonnetz
		bind:this={tonnetzComponent}
		width={800}
		height={600}
		{controls}
	/>
</div>

<style>
	/* Page-specific styles - component handles its own styling */
	.timeline {
		list-style: none;
		padding-left: 0;
		margin: 1rem 0;
	}
	.timeline li {
		margin: 0.5rem 0;
		padding-left: 1rem;
		border-left: 2px solid #ccc;
	}
	.timeline strong {
		color: #333;
	}
	.tonnetz-example {
		display: flex;
		gap: 1rem;
	}
	.tonnetz-controls {
		max-width: 300px;
	}
</style>
