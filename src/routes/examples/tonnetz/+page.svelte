<script lang="ts">
	import { onMount } from 'svelte';
	import * as d3 from 'd3';
	import * as Tone from 'tone';

	let svgElement: SVGSVGElement;
	let containerElement: HTMLDivElement;
	let polySynth: Tone.PolySynth;
	let isPlaying = false;
	let isDragging = false;
	let currentlyPlayingElements = new Set<string>();
	let containerWidth = 800;
	let containerHeight = 600;

	// Configuration
	let numOctaves = 2; // Number of octaves to display
	let baseOctave = 4; // Starting octave (C3, C4, etc.)
	let gridRadius = 3; // Radius of the hexagonal grid
	let zoomScale = 1.0; // Zoom scale factor
	let oscillatorType: 'sine' | 'square' | 'sawtooth' | 'triangle' = 'sawtooth'; // Oscillator waveform type

	// Note names in chromatic order
	const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

	// Generate hexagonal Tonnetz lattice
	function generateHexagonalTonnetz() {
		const points: Array<{ x: number; y: number; note: string; frequency: number; id: string }> = [];
		const triangles: Array<{
			points: string[];
			type: 'major' | 'minor';
			center: { x: number; y: number };
			notes: string[];
		}> = [];

		// Hexagonal grid parameters
		const hexRadius = 50;
		// Since we're centering the content, the grid center is at origin (0, 0)
		const centerX = 0;
		const centerY = 0;

		// Generate hexagonal grid positions programmatically
		const positions: Array<{ q: number; r: number }> = [];

		// Generate all positions within the specified radius
		for (let q = -gridRadius; q <= gridRadius; q++) {
			for (
				let r = Math.max(-gridRadius, -q - gridRadius);
				r <= Math.min(gridRadius, -q + gridRadius);
				r++
			) {
				positions.push({ q, r });
			}
		}

		// Convert hex coordinates to pixel coordinates and assign notes
		// Rotated 90 degrees counter-clockwise: q becomes vertical, r becomes diagonal
		positions.forEach((pos, i) => {
			// Rotate 90 degrees counter-clockwise: swap x/y and negate new x
			const originalX = hexRadius * ((3 / 2) * pos.q);
			const originalY = hexRadius * ((Math.sqrt(3) / 2) * pos.q + Math.sqrt(3) * pos.r);
			
			// Apply 90-degree counter-clockwise rotation: (x,y) -> (-y,x)
			const x = centerX - originalY;
			const y = centerY + originalX;

			// Assign notes using the Tonnetz pattern
			// Horizontal: perfect fifths (C-G-D-A-E-B left to right)
			// Diagonal: major thirds (C to E should be +4 semitones)
			// Need to adjust diagonal direction for correct major third progression
			const totalSemitones = (-pos.r) * 7 + (-pos.q) * 4;
			const noteIndex = ((totalSemitones % 12) + 12) % 12; // Ensure positive
			const noteName = noteNames[noteIndex];

			// Calculate octave based on position and configuration
			// Distribute octaves across the range based on total semitone displacement
			const octaveOffset = Math.floor(totalSemitones / 12);
			const clampedOctave = Math.max(
				baseOctave,
				Math.min(baseOctave + numOctaves - 1, baseOctave + octaveOffset)
			);

			// Calculate frequency using A4 = 440 Hz as reference
			// C4 = 261.63 Hz, so we calculate relative to that
			const baseFrequency = 261.63; // C4 frequency
			const semitonesFromC4 = (clampedOctave - 4) * 12 + noteIndex;
			const frequency = baseFrequency * Math.pow(2, semitonesFromC4 / 12);

			const id = `${pos.q}_${pos.r}`;
			const displayName = `${noteName}${clampedOctave}`;
			points.push({ x, y, note: displayName, frequency, id });
		});

		// Programmatically generate all triangular segments (triads)
		// Create a map for quick point lookup
		const pointMap = new Map<string, (typeof points)[0]>();
		points.forEach((point) => pointMap.set(point.id, point));

		// Generate all possible triangles by checking each point as a potential triangle vertex
		for (const point of points) {
			const [q, r] = point.id.split('_').map(Number);

			// Check for major triad (pointing down): current point, right neighbor, up-right neighbor
			const majorTriad = [
				`${q}_${r}`, // current point
				`${q + 1}_${r}`, // right (perfect fifth)
				`${q}_${r + 1}` // up-right (major third)
			];

			// Check if all three points exist
			const majorPoints = majorTriad.map((id) => pointMap.get(id)).filter(Boolean);
			if (majorPoints.length === 3) {
				const centerX = majorPoints.reduce((sum, p) => sum + p!.x, 0) / 3;
				const centerY = majorPoints.reduce((sum, p) => sum + p!.y, 0) / 3;
				const notes = majorPoints.map((p) => p!.note);

				triangles.push({
					points: majorTriad,
					type: 'major' as const,
					center: { x: centerX, y: centerY },
					notes
				});
			}

			// Check for minor triad (pointing up): current point, up-left neighbor, left neighbor
			const minorTriad = [
				`${q}_${r}`, // current point
				`${q}_${r - 1}`, // up-left (minor third)
				`${q - 1}_${r}` // left (perfect fifth)
			];

			// Check if all three points exist
			const minorPoints = minorTriad.map((id) => pointMap.get(id)).filter(Boolean);
			if (minorPoints.length === 3) {
				const centerX = minorPoints.reduce((sum, p) => sum + p!.x, 0) / 3;
				const centerY = minorPoints.reduce((sum, p) => sum + p!.y, 0) / 3;
				const notes = minorPoints.map((p) => p!.note);

				triangles.push({
					points: minorTriad,
					type: 'minor' as const,
					center: { x: centerX, y: centerY },
					notes
				});
			}
		}

		return { points, triangles };
	}

	// Play a note
	async function playNote(frequency: number) {
		if (!polySynth) return;

		try {
			if (Tone.context.state !== 'running') {
				await Tone.start();
			}

			polySynth.triggerAttackRelease(frequency, '8n');
		} catch (error) {
			console.error('Error playing note:', error);
		}
	}

	// Play multiple notes simultaneously (chord) - start playing
	async function startChord(frequencies: number[]) {
		if (!polySynth) return;

		try {
			if (Tone.context.state !== 'running') {
				await Tone.start();
			}

			polySynth.triggerAttack(frequencies);
		} catch (error) {
			console.error('Error starting chord:', error);
		}
	}

	// Stop playing chord
	function stopChord(frequencies: number[]) {
		if (!polySynth) return;

		try {
			polySynth.triggerRelease(frequencies);
		} catch (error) {
			console.error('Error stopping chord:', error);
		}
	}

	// Helper function to play element on drag enter
	function playElementOnDrag(elementId: string, frequencies: number[]) {
		if (!isDragging || currentlyPlayingElements.has(elementId)) return;

		currentlyPlayingElements.add(elementId);
		startChord(frequencies);
	}

	// Helper function to stop element on drag leave
	function stopElementOnDrag(elementId: string, frequencies: number[]) {
		if (!currentlyPlayingElements.has(elementId)) return;

		currentlyPlayingElements.delete(elementId);
		stopChord(frequencies);
	}

	// Stop all currently playing elements
	function stopAllPlayingElements() {
		if (!polySynth) return;

		try {
			polySynth.releaseAll();
			currentlyPlayingElements.clear();
		} catch (error) {
			console.error('Error stopping all notes:', error);
		}
	}

	// Apply zoom transform to the visualization
	function applyZoom() {
		if (!svgElement) return;

		const svg = d3.select(svgElement);
		const mainGroup = svg.select('g.main-group');

		if (!mainGroup.empty()) {
			// Get SVG dimensions to calculate center point
			const width = 800;
			const height = 600;
			const centerX = width / 2;
			const centerY = height / 2;

			// Apply scale transform with center origin
			mainGroup.attr(
				'transform',
				`translate(${centerX}, ${centerY}) scale(${zoomScale}) translate(${-centerX}, ${-centerY})`
			);
		}
	}

	// Update synthesizer oscillator type
	function updateOscillatorType() {
		if (!polySynth) return;
		
		// Stop any playing notes
		stopAllPlayingElements();
		
		// Update the oscillator type for all voices
		polySynth.set({
			oscillator: {
				type: oscillatorType
			}
		});
	}

	// Regenerate the Tonnetz with new configuration
	function regenerateTonnetz() {
		// Stop any playing notes
		stopAllPlayingElements();

		// Clear the SVG
		if (svgElement) {
			d3.select(svgElement).selectAll('*').remove();
		}

		// Recreate the visualization
		createTonnetz();
	}

	// Update container dimensions
	function updateDimensions() {
		if (containerElement) {
			containerWidth = containerElement.clientWidth;
			containerHeight = Math.max(400, Math.min(containerWidth * 0.75, 800)); // Responsive height with limits
		}
	}

	// Create the hexagonal Tonnetz visualization
	function createTonnetz() {
		updateDimensions();
		const { points, triangles } = generateHexagonalTonnetz();

		const svg = d3.select(svgElement);
		const width = containerWidth;
		const height = containerHeight;

		svg.attr('width', width).attr('height', height);

		// Create main group for zoom transforms
		const mainGroup = svg.append('g').attr('class', 'main-group');

		// Calculate center position for the content
		// The content spans roughly from the center outward based on grid size
		const contentCenterX = width / 2;
		const contentCenterY = height / 2;

		const g = mainGroup
			.append('g')
			.attr('transform', `translate(${contentCenterX}, ${contentCenterY})`);

		// Draw triangular segments (triads) first so they appear behind notes
		const triangleGroups = g
			.selectAll('.triangle-group')
			.data(triangles)
			.enter()
			.append('g')
			.attr('class', 'triangle-group');

		triangleGroups
			.append('polygon')
			.attr('points', (d) => {
				const triadPoints = d.points
					.map((id) => points.find((p) => p.id === id))
					.filter((p): p is NonNullable<typeof p> => p !== undefined);
				return triadPoints.map((p) => `${p.x},${p.y}`).join(' ');
			})
			.attr('fill', (d) => (d.type === 'major' ? '#e8f4fd' : '#fde8e8'))
			.attr('stroke', (d) => (d.type === 'major' ? '#4a90e2' : '#e24a4a'))
			.attr('stroke-width', 2)
			.attr('opacity', 0.3)
			.attr('cursor', 'pointer')
			.style('user-select', 'none')
			.on('mouseover', function (event, d) {
				const element = d3.select(this);
				const elementId = `triangle-${d.points.join('-')}`;

				if (isDragging) {
					// Drag-to-play behavior
					const triadPoints = d.points
						.map((id) => points.find((p) => p.id === id))
						.filter((p): p is NonNullable<typeof p> => p !== undefined);
					const frequencies = triadPoints.map((point) => point.frequency);
					playElementOnDrag(elementId, frequencies);
					element.attr('opacity', 0.8);
				} else {
					// Regular hover behavior
					element.transition().duration(200).attr('opacity', 0.6);
				}
			})
			.on('mouseout', function (event, d) {
				const element = d3.select(this);
				const elementId = `triangle-${d.points.join('-')}`;

				if (isDragging) {
					// Stop playing on drag leave
					const triadPoints = d.points
						.map((id) => points.find((p) => p.id === id))
						.filter((p): p is NonNullable<typeof p> => p !== undefined);
					const frequencies = triadPoints.map((point) => point.frequency);
					stopElementOnDrag(elementId, frequencies);
				}

				element.transition().duration(200).attr('opacity', 0.3);
			})
			.on('mousedown', function (event, d) {
				// Prevent text selection
				event.preventDefault();
				isDragging = true;

				// Start playing the triad
				const triadPoints = d.points
					.map((id) => points.find((p) => p.id === id))
					.filter((p): p is NonNullable<typeof p> => p !== undefined);
				const frequencies = triadPoints.map((point) => point.frequency);
				const elementId = `triangle-${d.points.join('-')}`;

				currentlyPlayingElements.add(elementId);
				startChord(frequencies);

				// Store frequencies for cleanup
				(this as any).__frequencies = frequencies;
				(this as any).__elementId = elementId;

				// Visual feedback - pressed state
				d3.select(this).attr('opacity', 0.8);
			});

		// Add triad labels
		triangleGroups
			.append('text')
			.attr('x', (d) => d.center.x)
			.attr('y', (d) => d.center.y)
			.attr('text-anchor', 'middle')
			.attr('dy', '0.35em')
			.attr('font-family', 'Arial, sans-serif')
			.attr('font-size', '10px')
			.attr('font-weight', 'bold')
			.attr('fill', (d) => (d.type === 'major' ? '#2c5aa0' : '#a02c2c'))
			.attr('pointer-events', 'none')
			.text((d) => d.type.toUpperCase());

		// Draw note circles
		const noteGroups = g
			.selectAll('.note-group')
			.data(points)
			.enter()
			.append('g')
			.attr('class', 'note-group')
			.attr('transform', (d) => `translate(${d.x}, ${d.y})`);

		noteGroups
			.append('circle')
			.attr('r', 18)
			.attr('fill', '#ffffff')
			.attr('stroke', '#333')
			.attr('stroke-width', 2)
			.attr('cursor', 'pointer')
			.style('user-select', 'none')
			.on('mouseover', function (event, d) {
				const element = d3.select(this);
				const elementId = `note-${d.id}`;

				if (isDragging) {
					// Drag-to-play behavior
					playElementOnDrag(elementId, [d.frequency]);
					element.attr('fill', '#28a745').attr('r', 22);
				} else {
					// Regular hover behavior
					element.transition().duration(200).attr('fill', '#007bff').attr('r', 22);
				}
			})
			.on('mouseout', function (event, d) {
				const element = d3.select(this);
				const elementId = `note-${d.id}`;

				if (isDragging) {
					// Stop playing on drag leave
					stopElementOnDrag(elementId, [d.frequency]);
				}

				element.transition().duration(200).attr('fill', '#ffffff').attr('r', 18);
			})
			.on('mousedown', function (event, d) {
				// Prevent text selection
				event.preventDefault();
				isDragging = true;

				// Start playing the note
				const elementId = `note-${d.id}`;
				currentlyPlayingElements.add(elementId);
				startChord([d.frequency]);

				// Store data for cleanup
				(this as any).__frequency = d.frequency;
				(this as any).__elementId = elementId;

				// Visual feedback - pressed state
				d3.select(this).attr('fill', '#28a745');
			});

		// Add note labels
		noteGroups
			.append('text')
			.attr('text-anchor', 'middle')
			.attr('dy', '0.35em')
			.attr('font-family', 'Arial, sans-serif')
			.attr('font-size', '12px')
			.attr('font-weight', 'bold')
			.attr('fill', '#333')
			.attr('pointer-events', 'none')
			.text((d) => d.note);

		// Add legend
		const legend = svg.append('g').attr('transform', `translate(${width - 180}, 20)`);

		legend
			.append('text')
			.attr('x', 0)
			.attr('y', 0)
			.attr('font-family', 'Arial, sans-serif')
			.attr('font-size', '14px')
			.attr('font-weight', 'bold')
			.text('Triads:');

		// Major triad legend
		legend
			.append('polygon')
			.attr('points', '0,20 15,20 7.5,35')
			.attr('fill', '#e8f4fd')
			.attr('stroke', '#4a90e2')
			.attr('stroke-width', 2);

		legend
			.append('text')
			.attr('x', 20)
			.attr('y', 30)
			.attr('font-family', 'Arial, sans-serif')
			.attr('font-size', '12px')
			.text('Major');

		// Minor triad legend
		legend
			.append('polygon')
			.attr('points', '0,50 15,50 7.5,35')
			.attr('fill', '#fde8e8')
			.attr('stroke', '#e24a4a')
			.attr('stroke-width', 2);

		legend
			.append('text')
			.attr('x', 20)
			.attr('y', 45)
			.attr('font-family', 'Arial, sans-serif')
			.attr('font-size', '12px')
			.text('Minor');
	}

	onMount(() => {
		// Initialize Tone.js polyphonic synthesizer with piano-like timbre
		// Using FMSynth for more complex, musical tones
		polySynth = new Tone.PolySynth(Tone.FMSynth, {
			harmonicity: 3,
			modulationIndex: 10,
			detune: 0,
			oscillator: {
				type: oscillatorType
			},
			envelope: {
				attack: 0.1,
				decay: 0.3,
				sustain: 0.3,
				release: 1
			}
		}).toDestination();

		// Set up resize observer for responsive behavior
		const resizeObserver = new ResizeObserver(() => {
			updateDimensions();
			regenerateTonnetz();
		});

		if (containerElement) {
			resizeObserver.observe(containerElement);
		}

		// Create the initial visualization
		createTonnetz();

		// Set up global mouse event handlers for drag functionality
		const handleGlobalMouseUp = () => {
			if (isDragging) {
				isDragging = false;
				stopAllPlayingElements();
			}
		};

		const handleGlobalMouseLeave = () => {
			if (isDragging) {
				isDragging = false;
				stopAllPlayingElements();
			}
		};

		document.addEventListener('mouseup', handleGlobalMouseUp);
		document.addEventListener('mouseleave', handleGlobalMouseLeave);

		// Cleanup on component destroy
		return () => {
			resizeObserver.disconnect();
			document.removeEventListener('mouseup', handleGlobalMouseUp);
			document.removeEventListener('mouseleave', handleGlobalMouseLeave);
		};
	});
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
<iframe width="560" height="315" src="https://www.youtube.com/embed/I5Bj9GyAfRc?si=KE21UpbG8mJFnX3T" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
<h4>A geometric map of musical harmony</h4>
<p>
    The <strong>Tonnetz</strong> (German for <em>tone network</em>) is a two-dimensional grid that shows
    how musical pitches and chords are related by simple, consonant intervals. First sketched by
    mathematician <strong>Leonhard Euler</strong> in the 18th century, it reveals that harmony is not
    random—it can be mapped like a city, with every note and chord having neighbors just a short
    step away.
</p>

<h4>How it works</h4>
<p>
    The Tonnetz places pitches so that moving in specific directions corresponds to moving by certain
    musical intervals:
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
    two-dimensional lattice emerges. Composers throughout history may not have drawn the Tonnetz, but
    they instinctively navigated its paths, moving between chords in ways that feel “close” to the ear.
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
<p>
    Each is just a short slide along the grid—visual proof of smooth voice-leading.
</p>

<h4>A tool for composers and analysts</h4>
<p>
    Today, the Tonnetz is used to visualize harmonic motion in classical, jazz, film, and even pop
    music. It bridges <b>math</b> and <b>music</b>, showing that harmony is both a physical phenomenon
    and a navigable landscape.
</p>

<!-- Brief Historical Timeline -->
<h4>A brief history of the Tonnetz</h4>
<ul class="timeline">
    <li>
        <strong>1739 – Leonhard Euler:</strong> Publishes his <em>Speculum Musicum</em>, mapping pitches
        into a two-dimensional lattice based on perfect fifths and major thirds.
    </li>
    <li>
        <strong>Late 18th century:</strong> The idea circulates among theorists, though most composers
        use it intuitively rather than diagramming it.
    </li>
    <li>
        <strong>Late 19th century – Hugo Riemann:</strong> Uses the Tonnetz to describe smooth chord
        transformations in chromatic harmony.
    </li>
    <li>
        <strong>20th century:</strong> Revived by theorists studying Wagner, Liszt, and later film music
        for its ability to explain unexpected chord progressions.
    </li>
    <li>
        <strong>Modern era:</strong> Applied in computational music theory, jazz education, and
        interactive music visualization tools.
    </li>
</ul>
</div>

<!-- Configuration Controls -->
<div class="controls">
	<div class="control-group">
		<label for="octaves">Number of Octaves:</label>
		<input
			id="octaves"
			type="range"
			min="1"
			max="4"
			bind:value={numOctaves}
			on:input={regenerateTonnetz}
		/>
		<span>{numOctaves}</span>
	</div>

	<div class="control-group">
		<label for="baseOctave">Base Octave:</label>
		<input
			id="baseOctave"
			type="range"
			min="2"
			max="6"
			bind:value={baseOctave}
			on:input={regenerateTonnetz}
		/>
		<span>{baseOctave}</span>
	</div>

	<div class="control-group">
		<label for="gridRadius">Grid Size:</label>
		<input
			id="gridRadius"
			type="range"
			min="2"
			max="5"
			bind:value={gridRadius}
			on:input={regenerateTonnetz}
		/>
		<span>{gridRadius}</span>
	</div>

	<div class="control-group">
		<label for="zoom">Zoom:</label>
		<input
			id="zoom"
			type="range"
			min="0.5"
			max="3.0"
			step="0.1"
			bind:value={zoomScale}
			on:input={applyZoom}
		/>
		<span>{zoomScale.toFixed(1)}x</span>
	</div>

	<div class="control-group">
		<label for="oscillator">Oscillator:</label>
		<select
			id="oscillator"
			bind:value={oscillatorType}
			on:change={updateOscillatorType}
		>
			<option value="sine">Sine</option>
			<option value="square">Square</option>
			<option value="sawtooth">Sawtooth</option>
			<option value="triangle">Triangle</option>
		</select>
	</div>
</div>

<div class="tonnetz-container" bind:this={containerElement}>
	<svg bind:this={svgElement}></svg>
</div>

<style>
	.tonnetz-container {
		width: 100%;
		max-width: 1200px;
		min-width: 320px;
		margin: 0 auto;
		padding: 0;
		box-sizing: border-box;
	}

	.tonnetz-container svg {
		width: 100%;
		height: auto;
		display: block;
		border: 1px solid #dee2e6;
		border-radius: 8px;
		background: white;
	}

	.controls {
		margin: 20px 0;
		padding: 15px;
		background: #f8f9fa;
		border-radius: 8px;
		border: 1px solid #dee2e6;
		display: flex;
		gap: 20px;
		flex-wrap: wrap;
		align-items: center;
	}

	.control-group {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.control-group label {
		font-weight: 500;
		min-width: 100px;
	}

	.control-group input[type='range'] {
		width: 100px;
	}

	.control-group span {
		font-weight: bold;
		min-width: 20px;
		text-align: center;
	}

	.content {
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 1rem;
		max-width: 800px;
		margin: 2rem auto;
		padding: 1rem;
	}
	.harmonic-block {
		margin: 1.5rem 0;
	}
	.harmonic-block p {
		margin-bottom: 0.5rem;
	}
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


