<script lang="ts">
	import { onMount } from 'svelte';
	import * as d3 from 'd3';
	import * as Tone from 'tone';

	// Component props with defaults
	export let width = 800;
	export let height = 600;
	export let initialOctaves = 2;
	export let initialBaseOctave = 4;
	export let initialGridRadius = 3;
	export let initialZoom = 1.0;
	export let initialOscillatorType: 'sine' | 'square' | 'sawtooth' | 'triangle' = 'sawtooth';
	export let showControls = true;

	let svgElement: SVGSVGElement;
	let polySynth: Tone.PolySynth;
	let isPlaying = false;
	let isDragging = false;
	let currentlyPlayingElements = new Set<string>();

	// Configuration
	let numOctaves = initialOctaves;
	let baseOctave = initialBaseOctave;
	let gridRadius = initialGridRadius;
	let zoomScale = initialZoom;
	let oscillatorType: 'sine' | 'square' | 'sawtooth' | 'triangle' = initialOscillatorType;

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
		// Using flat-top hexagon orientation so perfect fifths run horizontally
		positions.forEach((pos, i) => {
			const x = centerX + hexRadius * (Math.sqrt(3) * pos.q + (Math.sqrt(3) / 2) * pos.r);
			const y = centerY + hexRadius * ((3 / 2) * pos.r);

			// Assign notes using the Tonnetz pattern
			// Each step right = +7 semitones (perfect fifth)
			// Each step up-right = +4 semitones (major third)
			const totalSemitones = pos.q * 7 + pos.r * 4;
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
		const pointMap = new Map<string, { x: number; y: number; note: string; frequency: number; id: string }>();
		points.forEach((point) => {
			pointMap.set(point.id, point);
		});

		// Generate triangles with proper tessellation pattern
		const generatedTriangles = new Set<string>();

		// Generate all triangles by checking each possible triangle configuration
		positions.forEach((pos) => {
			const { q, r } = pos;

			// Upward-pointing triangles (minor triads)
			// Triangle with current point as bottom-left vertex
			const upTriangle1 = [
				`${q}_${r}`,
				`${q + 1}_${r}`,
				`${q + 1}_${r - 1}`
			];

			const upKey1 = upTriangle1.sort().join('-');
			if (!generatedTriangles.has(upKey1) && upTriangle1.every(id => pointMap.has(id))) {
				generatedTriangles.add(upKey1);
				const triPoints = upTriangle1.map(id => pointMap.get(id)!);
				const centerX = triPoints.reduce((sum, p) => sum + p.x, 0) / 3;
				const centerY = triPoints.reduce((sum, p) => sum + p.y, 0) / 3;
				const notes = triPoints.map(p => p.note);

				triangles.push({
					points: upTriangle1,
					type: 'minor',
					center: { x: centerX, y: centerY },
					notes
				});
			}

			// Downward-pointing triangles (major triads)
			// Triangle with current point as top vertex
			const downTriangle1 = [
				`${q}_${r}`,
				`${q - 1}_${r + 1}`,
				`${q}_${r + 1}`
			];

			const downKey1 = downTriangle1.sort().join('-');
			if (!generatedTriangles.has(downKey1) && downTriangle1.every(id => pointMap.has(id))) {
				generatedTriangles.add(downKey1);
				const triPoints = downTriangle1.map(id => pointMap.get(id)!);
				const centerX = triPoints.reduce((sum, p) => sum + p.x, 0) / 3;
				const centerY = triPoints.reduce((sum, p) => sum + p.y, 0) / 3;
				const notes = triPoints.map(p => p.note);

				triangles.push({
					points: downTriangle1,
					type: 'major',
					center: { x: centerX, y: centerY },
					notes
				});
			}

			// Additional downward triangle with current point as bottom-right vertex
			const downTriangle2 = [
				`${q}_${r}`,
				`${q - 1}_${r}`,
				`${q - 1}_${r + 1}`
			];

			const downKey2 = downTriangle2.sort().join('-');
			if (!generatedTriangles.has(downKey2) && downTriangle2.every(id => pointMap.has(id))) {
				generatedTriangles.add(downKey2);
				const triPoints = downTriangle2.map(id => pointMap.get(id)!);
				const centerX = triPoints.reduce((sum, p) => sum + p.x, 0) / 3;
				const centerY = triPoints.reduce((sum, p) => sum + p.y, 0) / 3;
				const notes = triPoints.map(p => p.note);

				triangles.push({
					points: downTriangle2,
					type: 'major',
					center: { x: centerX, y: centerY },
					notes
				});
			}
		});

		return { points, triangles };
	}

	// Audio functions
	function startChord(frequencies: number[]) {
		if (!polySynth) return;

		try {
			if (Tone.context.state !== 'running') {
				Tone.start();
			}
			frequencies.forEach(freq => {
				polySynth.triggerAttack(freq);
			});
		} catch (error) {
			console.error('Error starting chord:', error);
		}
	}

	function stopChord(frequencies: number[]) {
		if (!polySynth) return;

		try {
			frequencies.forEach(freq => {
				polySynth.triggerRelease(freq);
			});
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

	// Create the hexagonal Tonnetz visualization
	function createTonnetz() {
		const { points, triangles } = generateHexagonalTonnetz();

		const svg = d3.select(svgElement);
		
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
				return d.points
					.map((id) => points.find((p) => p.id === id))
					.filter((p) => p !== undefined)
					.map((p) => `${p!.x},${p!.y}`)
					.join(' ');
			})
			.attr('fill', (d) => (d.type === 'major' ? '#4a90e2' : '#e24a4a'))
			.attr('opacity', 0.3)
			.attr('stroke', '#333')
			.attr('stroke-width', 1)
			.attr('cursor', 'pointer')
			.style('user-select', 'none')
			.on('mouseover', function (event, d) {
				const element = d3.select(this);
				const elementId = `triangle-${d.points.join('-')}`;

				if (isDragging) {
					// Drag-to-play behavior
					const triadPoints = d.points
						.map((id) => points.find((p) => p.id === id))
						.filter((p) => p !== undefined);
					const frequencies = triadPoints.map((point) => point!.frequency);
					playElementOnDrag(elementId, frequencies);
					element.attr('opacity', 0.7);
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
						.filter((p) => p !== undefined);
					const frequencies = triadPoints.map((point) => point!.frequency);
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
					.filter((p) => p !== undefined);
				const frequencies = triadPoints.map((point) => point!.frequency);
				const elementId = `triangle-${d.points.join('-')}`;

				currentlyPlayingElements.add(elementId);
				startChord(frequencies);

				// Visual feedback
				d3.select(this).attr('opacity', 0.7);
			});

		// Create note groups
		const noteGroups = g.selectAll('.note-group').data(points).enter().append('g').attr('class', 'note-group');

		// Add circles for notes
		noteGroups
			.append('circle')
			.attr('cx', (d) => d.x)
			.attr('cy', (d) => d.y)
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
			.attr('x', (d) => d.x)
			.attr('y', (d) => d.y + 5)
			.text((d) => d.note)
			.attr('text-anchor', 'middle')
			.attr('font-size', '12px')
			.attr('font-weight', 'bold')
			.attr('fill', '#333')
			.style('pointer-events', 'none')
			.style('user-select', 'none');

		// Add legend
		const legend = svg
			.append('g')
			.attr('class', 'legend')
			.attr('transform', `translate(${width - 150}, 20)`);

		legend
			.append('rect')
			.attr('x', 0)
			.attr('y', 0)
			.attr('width', 20)
			.attr('height', 20)
			.attr('fill', '#4a90e2')
			.attr('opacity', 0.6);

		legend
			.append('text')
			.attr('x', 30)
			.attr('y', 15)
			.attr('font-size', '14px')
			.text('Major');

		legend
			.append('rect')
			.attr('x', 0)
			.attr('y', 30)
			.attr('width', 20)
			.attr('height', 20)
			.attr('fill', '#e24a4a')
			.attr('opacity', 0.6);

		legend
			.append('text')
			.attr('x', 30)
			.attr('y', 45)
			.attr('font-size', '14px')
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
				attack: 0.01,
				decay: 0.01,
				sustain: 1,
				release: 0.5
			},
			modulation: {
				type: 'square'
			},
			modulationEnvelope: {
				attack: 0.2,
				decay: 0.01,
				sustain: 1,
				release: 0.5
			}
		}).toDestination();

		// Create the visualization
		createTonnetz();

		// Global event handlers for drag functionality
		const handleGlobalMouseUp = () => {
			if (isDragging) {
				isDragging = false;
				stopAllPlayingElements();
			}
		};

		const handleGlobalMouseMove = (event: MouseEvent) => {
			if (isDragging) {
				// Prevent text selection during drag
				event.preventDefault();
			}
		};

		document.addEventListener('mouseup', handleGlobalMouseUp);
		document.addEventListener('mousemove', handleGlobalMouseMove);

		// Cleanup on component destroy
		return () => {
			document.removeEventListener('mouseup', handleGlobalMouseUp);
			document.removeEventListener('mousemove', handleGlobalMouseMove);
		};
	});
</script>

{#if showControls}
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
{/if}

<div class="tonnetz-container">
	<svg bind:this={svgElement}></svg>
</div>

<style>
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

	.tonnetz-container {
		display: flex;
		justify-content: center;
		align-items: center;
	}
</style>
