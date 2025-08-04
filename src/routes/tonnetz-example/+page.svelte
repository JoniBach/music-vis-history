<script lang="ts">
	import Tonnetz from '$lib/components/visualization/Tonnetz.svelte';
	import TonnetzControls, { type TonnetzControlsData } from '$lib/components/visualization/TonnetzControls.svelte';

	// State management for controls - this is now at the page level
	let controls: TonnetzControlsData = {
		numOctaves: 2,
		baseOctave: 4,
		gridRadius: 3,
		zoomScale: 1.0,
		startingNote: 'C',
		oscillatorType: 'sawtooth',
		showChordNames: true,
		showRomanNumerals: true,
		showRootHighlight: true,
		showTriangles: true,
		showNoteLabels: true,
		showLegend: true,
		showOnlyKeyTriangles: false,
		showMajorTriangles: true,
		showMinorTriangles: true
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
	<title>Tonnetz Visualization - Refactored</title>
	<meta name="description" content="Interactive Tonnetz visualization with modular controls" />
</svelte:head>

<div class="page-container">
	<header>
		<h1>Tonnetz Visualization</h1>
		<p>
			Explore harmonic relationships in music through this interactive Tonnetz (tone network) 
			visualization. The controls have been separated into a modular component for better 
			architecture and reusability.
		</p>
	</header>

	<!-- Controls component - managed at page level -->
	<TonnetzControls 
		bind:controls 
		on:regenerate={handleRegenerate}
		on:zoomChange={handleZoomChange}
		on:oscillatorChange={handleOscillatorChange}
	/>

	<!-- Tonnetz visualization component -->
	<Tonnetz 
		bind:this={tonnetzComponent}
		{controls}
		width={800} 
		height={600} 
	/>

	<section class="info">
		<h2>About the Tonnetz</h2>
		<p>
			The Tonnetz is a conceptual lattice diagram representing tonal space first described by 
			Leonhard Euler in 1739. This interactive version allows you to:
		</p>
		<ul>
			<li>Click notes to hear individual pitches</li>
			<li>Click triangles to hear major and minor chords</li>
			<li>Drag across elements to play sequences</li>
			<li>Adjust various visual and audio parameters</li>
		</ul>
		
		<h3>Architecture Improvements</h3>
		<p>
			This implementation demonstrates clean frontend architecture with:
		</p>
		<ul>
			<li><strong>Separation of Concerns</strong>: Controls are in a separate component</li>
			<li><strong>State Management</strong>: All form state is managed at the page level</li>
			<li><strong>Event-Driven Communication</strong>: Components communicate via events</li>
			<li><strong>Modularity</strong>: Components can be easily reused and tested</li>
		</ul>
	</section>
</div>

<style>
	.page-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 20px;
	}

	header {
		text-align: center;
		margin-bottom: 30px;
	}

	header h1 {
		color: #333;
		margin-bottom: 10px;
	}

	header p {
		color: #666;
		font-size: 1.1em;
		max-width: 600px;
		margin: 0 auto;
		line-height: 1.6;
	}

	.info {
		margin-top: 40px;
		padding: 20px;
		background: #f8f9fa;
		border-radius: 8px;
		border: 1px solid #dee2e6;
	}

	.info h2, .info h3 {
		color: #333;
		margin-top: 0;
	}

	.info ul {
		padding-left: 20px;
	}

	.info li {
		margin-bottom: 8px;
		line-height: 1.5;
	}

	@media (max-width: 768px) {
		.page-container {
			padding: 10px;
		}
		
		header h1 {
			font-size: 1.8em;
		}
		
		header p {
			font-size: 1em;
		}
	}
</style>
