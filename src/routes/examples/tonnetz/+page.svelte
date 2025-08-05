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
	<iframe
		width="560"
		height="315"
		src="https://www.youtube.com/embed/I5Bj9GyAfRc?si=KE21UpbG8mJFnX3T"
		title="YouTube video player"
		frameborder="0"
		allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
		referrerpolicy="strict-origin-when-cross-origin"
		allowfullscreen
	></iframe>
	<h4>A geometric map of musical harmony</h4>
	<p>
		The <strong>Tonnetz</strong> (German for <em>tone network</em>) is a two-dimensional grid that
		shows how musical pitches and chords are related by simple, consonant intervals. First sketched
		by mathematician <strong>Leonhard Euler</strong> in the 18th century, it reveals that harmony is
		not random—it can be mapped like a city, with every note and chord having neighbors just a short
		step away.
	</p>

	<h4>How it works</h4>
	<p>
		The Tonnetz places pitches so that moving in specific directions corresponds to moving by
		certain musical intervals:
	</p>
	<ul>
		<li><strong>Moving right (horizontal):</strong> Perfect fifths (ratio 3:2)</li>
		<li><strong>Moving up-right (diagonal):</strong> Major thirds (ratio 5:4)</li>
		<li><strong>Moving down-right (diagonal):</strong> Minor thirds (ratio 6:5)</li>
	</ul>
	<p>
		Because these intervals have simple whole-number frequency ratios, they align in a perfect,
		repeating grid. Major chords appear as triangles pointing one way; minor chords as triangles
		pointing the other. Moving to a closely related chord is just a tiny step in this harmonic map.
	</p>

	<h4>Not a coincidence</h4>
	<p>
		This perfect grid is no accident—it’s the direct result of the mathematics of harmony. Euler
		realized that by plotting powers of 3 (perfect fifths) and powers of 5 (major thirds), a
		two-dimensional lattice emerges. Composers throughout history may not have drawn the Tonnetz,
		but they instinctively navigated its paths, moving between chords in ways that feel “close” to
		the ear.
	</p>

	<h4>Neo-Riemannian transformations</h4>
	<p>
		In the 19th century, music theorists began using the Tonnetz to track elegant chord shifts in
		chromatic harmony. Three famous moves are:
	</p>
	<ul>
		<li><strong>P (Parallel):</strong> C major → C minor</li>
		<li><strong>L (Leading-tone exchange):</strong> C major → E minor</li>
		<li><strong>R (Relative):</strong> C major → A minor</li>
	</ul>
	<p>Each is just a short slide along the grid—visual proof of smooth voice-leading.</p>

	<h4>A tool for composers and analysts</h4>
	<p>
		Today, the Tonnetz is used to visualize harmonic motion in classical, jazz, film, and even pop
		music. It bridges <b>math</b> and <b>music</b>, showing that harmony is both a physical
		phenomenon and a navigable landscape.
	</p>

	<!-- Brief Historical Timeline -->
	<h4>A brief history of the Tonnetz</h4>
	<ul class="timeline">
		<li>
			<strong>1739 – Leonhard Euler:</strong> Publishes his <em>Speculum Musicum</em>, mapping
			pitches into a two-dimensional lattice based on perfect fifths and major thirds.
		</li>
		<li>
			<strong>Late 18th century:</strong> The idea circulates among theorists, though most composers
			use it intuitively rather than diagramming it.
		</li>
		<li>
			<strong>Late 19th century – Hugo Riemann:</strong> Uses the Tonnetz to describe smooth chord transformations
			in chromatic harmony.
		</li>
		<li>
			<strong>20th century:</strong> Revived by theorists studying Wagner, Liszt, and later film music
			for its ability to explain unexpected chord progressions.
		</li>
		<li>
			<strong>Modern era:</strong> Applied in computational music theory, jazz education, and interactive
			music visualization tools.
		</li>
	</ul>
</div>

<!-- Interactive Tonnetz Component with Controls -->
<TonnetzControls
	bind:controls
	on:regenerate={handleRegenerate}
	on:zoomChange={handleZoomChange}
	on:oscillatorChange={handleOscillatorChange}
/>

<Tonnetz bind:this={tonnetzComponent} {controls} height={600} />

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
</style>
