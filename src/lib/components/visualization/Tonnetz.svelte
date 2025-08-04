<script lang="ts">
	import { onMount } from 'svelte';
	import * as d3 from 'd3';
	import * as Tone from 'tone';

	// Types
	type Point = {
		x: number;
		y: number;
		note: string;
		frequency: number;
		id: string;
	};

	type Triangle = {
		points: string[];
		type: 'major' | 'minor';
		center: { x: number; y: number };
		notes: string[];
	};

	type HexPosition = { q: number; r: number };

	// Component props
	export let width = 800;
	export let height = 600;
	export let initialOctaves = 2;
	export let initialBaseOctave = 4;
	export let initialGridRadius = 3;
	export let initialZoom = 1.0;
	export let initialOscillatorType: 'sine' | 'square' | 'sawtooth' | 'triangle' = 'sawtooth';
	export let initialStartingNote: string = 'C';
	export let showControls = true;

	// State
	let svgElement: SVGSVGElement;
	let polySynth: Tone.PolySynth;
	let isDragging = false;
	let currentlyPlayingElements = new Set<string>();

	// Configuration
	let numOctaves = initialOctaves;
	let baseOctave = initialBaseOctave;
	let gridRadius = initialGridRadius;
	let zoomScale = initialZoom;
	let oscillatorType: 'sine' | 'square' | 'sawtooth' | 'triangle' = initialOscillatorType;
	let startingNote = initialStartingNote;

	// Constants
	const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
	const HEX_RADIUS = 50;
	const BASE_FREQUENCY = 261.63; // C4 frequency

	// Pure calculation functions
	const generateHexPositions = (radius: number): HexPosition[] => {
		const positions: HexPosition[] = [];
		for (let q = -radius; q <= radius; q++) {
			for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
				positions.push({ q, r });
			}
		}
		return positions;
	};

	const hexToPixel = (pos: HexPosition): { x: number; y: number } => ({
		x: HEX_RADIUS * (Math.sqrt(3) * pos.q + (Math.sqrt(3) / 2) * pos.r),
		y: HEX_RADIUS * ((3 / 2) * pos.r)
	});

	const calculateNote = (pos: HexPosition) => {
		// Get the starting note offset in semitones from C
		const startingNoteIndex = NOTE_NAMES.indexOf(startingNote as (typeof NOTE_NAMES)[number]);
		if (startingNoteIndex === -1) {
			console.warn(`Invalid starting note: ${startingNote}, defaulting to C`);
		}
		const startingOffset = startingNoteIndex !== -1 ? startingNoteIndex : 0;

		const totalSemitones = pos.q * 7 + pos.r * 4;
		const noteIndex = (((totalSemitones + startingOffset) % 12) + 12) % 12;
		const noteName = NOTE_NAMES[noteIndex];
		const octaveOffset = Math.floor((totalSemitones + startingOffset) / 12);
		const clampedOctave = Math.max(
			baseOctave,
			Math.min(baseOctave + numOctaves - 1, baseOctave + octaveOffset)
		);
		const semitonesFromC4 = (clampedOctave - 4) * 12 + noteIndex;
		const frequency = BASE_FREQUENCY * Math.pow(2, semitonesFromC4 / 12);
		return {
			noteName,
			octave: clampedOctave,
			frequency,
			displayName: `${noteName}${clampedOctave}`
		};
	};

	const createPoint = (pos: HexPosition): Point => {
		const pixel = hexToPixel(pos);
		const noteInfo = calculateNote(pos);
		return {
			...pixel,
			note: noteInfo.displayName,
			frequency: noteInfo.frequency,
			id: `${pos.q}_${pos.r}`
		};
	};

	const generateTriangles = (
		positions: HexPosition[],
		pointMap: Map<string, Point>
	): Triangle[] => {
		const triangles: Triangle[] = [];
		const generated = new Set<string>();

		positions.forEach(({ q, r }) => {
			const configs = [
				{ points: [`${q}_${r}`, `${q + 1}_${r}`, `${q + 1}_${r - 1}`], type: 'minor' as const },
				{ points: [`${q}_${r}`, `${q}_${r - 1}`, `${q + 1}_${r - 1}`], type: 'minor' as const },
				{ points: [`${q}_${r}`, `${q - 1}_${r + 1}`, `${q}_${r + 1}`], type: 'major' as const },
				{ points: [`${q}_${r}`, `${q + 1}_${r}`, `${q}_${r + 1}`], type: 'major' as const }
			];

			configs.forEach(({ points, type }) => {
				const key = points.sort().join('-');
				if (!generated.has(key) && points.every((id) => pointMap.has(id))) {
					generated.add(key);
					const triPoints = points.map((id) => pointMap.get(id)!);
					const center = {
						x: triPoints.reduce((sum, p) => sum + p.x, 0) / 3,
						y: triPoints.reduce((sum, p) => sum + p.y, 0) / 3
					};
					triangles.push({ points, type, center, notes: triPoints.map((p) => p.note) });
				}
			});
		});

		return triangles;
	};

	// Audio functions
	const startChord = (frequencies: number[]) => {
		if (!polySynth) return;
		try {
			if (Tone.context.state !== 'running') Tone.start();
			frequencies.forEach((freq) => polySynth.triggerAttack(freq));
		} catch (error) {
			console.error('Error starting chord:', error);
		}
	};

	const stopAllNotes = () => {
		if (!polySynth) return;
		try {
			polySynth.releaseAll();
			currentlyPlayingElements.clear();
		} catch (error) {
			console.error('Error stopping all notes:', error);
		}
	};

	// Event handlers
	const handleElementPlay = (elementId: string, frequencies: number[]) => {
		if (!currentlyPlayingElements.has(elementId)) {
			currentlyPlayingElements.add(elementId);
			startChord(frequencies);
		}
	};

	const handleElementStop = (elementId: string) => {
		currentlyPlayingElements.delete(elementId);
	};

	// Main generation function
	const generateTonnetzData = () => {
		const positions = generateHexPositions(gridRadius);
		const points = positions.map(createPoint);
		const pointMap = new Map(points.map((p) => [p.id, p]));
		const triangles = generateTriangles(positions, pointMap);
		return { points, triangles };
	};

	// Visualization functions
	const createTonnetz = () => {
		const { points, triangles } = generateTonnetzData();
		const svg = d3.select(svgElement).attr('width', width).attr('height', height);

		const g = svg
			.append('g')
			.attr('class', 'main-group')
			.attr('transform', `translate(${width / 2}, ${height / 2})`);

		// Draw triangles
		g.selectAll('.triangle')
			.data(triangles)
			.enter()
			.append('polygon')
			.attr('class', 'triangle')
			.attr('points', (d) =>
				d.points
					.map((id) => points.find((p) => p.id === id))
					.filter(Boolean)
					.map((p) => `${p!.x},${p!.y}`)
					.join(' ')
			)
			.attr('fill', (d) => (d.type === 'major' ? '#4a90e2' : '#e24a4a'))
			.attr('opacity', 0.3)
			.attr('stroke', '#333')
			.attr('cursor', 'pointer')
			.on('mouseover', function (event, d) {
				if (isDragging) {
					const frequencies = d.points
						.map((id) => points.find((p) => p.id === id)?.frequency)
						.filter(Boolean) as number[];
					handleElementPlay(`triangle-${d.points.join('-')}`, frequencies);
				}
				d3.select(this).attr('opacity', 0.6);
			})
			.on('mouseout', function (event, d) {
				if (isDragging) handleElementStop(`triangle-${d.points.join('-')}`);
				d3.select(this).attr('opacity', 0.3);
			})
			.on('mousedown', function (event, d) {
				event.preventDefault();
				stopAllNotes();
				isDragging = true;
				const frequencies = d.points
					.map((id) => points.find((p) => p.id === id)?.frequency)
					.filter(Boolean) as number[];
				handleElementPlay(`triangle-${d.points.join('-')}`, frequencies);
			});

		// Draw notes
		const noteGroups = g
			.selectAll('.note-group')
			.data(points)
			.enter()
			.append('g')
			.attr('class', 'note-group');

		noteGroups
			.append('circle')
			.attr('cx', (d) => d.x)
			.attr('cy', (d) => d.y)
			.attr('r', 18)
			.attr('fill', '#ffffff')
			.attr('stroke', '#333')
			.attr('stroke-width', 2)
			.attr('cursor', 'pointer')
			.on('mouseover', function (event, d) {
				if (isDragging) handleElementPlay(`note-${d.id}`, [d.frequency]);
				d3.select(this)
					.attr('fill', isDragging ? '#28a745' : '#007bff')
					.attr('r', 22);
			})
			.on('mouseout', function (event, d) {
				if (isDragging) handleElementStop(`note-${d.id}`);
				d3.select(this).attr('fill', '#ffffff').attr('r', 18);
			})
			.on('mousedown', function (event, d) {
				event.preventDefault();
				stopAllNotes();
				isDragging = true;
				handleElementPlay(`note-${d.id}`, [d.frequency]);
				d3.select(this).attr('fill', '#28a745');
			});

		noteGroups
			.append('text')
			.attr('x', (d) => d.x)
			.attr('y', (d) => d.y + 5)
			.text((d) => d.note)
			.attr('text-anchor', 'middle')
			.attr('font-size', '12px')
			.attr('font-weight', 'bold')
			.attr('fill', '#333')
			.style('pointer-events', 'none');

		// Add legend
		const legend = svg
			.append('g')
			.attr('class', 'legend')
			.attr('transform', `translate(${width - 150}, 20)`);

		legend
			.append('rect')
			.attr('width', 20)
			.attr('height', 20)
			.attr('fill', '#4a90e2')
			.attr('opacity', 0.6);
		legend.append('text').attr('x', 30).attr('y', 15).attr('font-size', '14px').text('Major');
		legend
			.append('rect')
			.attr('y', 30)
			.attr('width', 20)
			.attr('height', 20)
			.attr('fill', '#e24a4a')
			.attr('opacity', 0.6);
		legend.append('text').attr('x', 30).attr('y', 45).attr('font-size', '14px').text('Minor');
	};

	const regenerateTonnetz = () => {
		stopAllNotes();
		if (svgElement) d3.select(svgElement).selectAll('*').remove();
		createTonnetz();
	};

	const applyZoom = () => {
		if (!svgElement) return;
		const svg = d3.select(svgElement);
		const mainGroup = svg.select('g.main-group');
		if (!mainGroup.empty()) {
			const centerX = width / 2;
			const centerY = height / 2;
			mainGroup.attr(
				'transform',
				`translate(${centerX}, ${centerY}) scale(${zoomScale}) translate(${-centerX}, ${-centerY})`
			);
		}
	};

	const updateOscillatorType = () => {
		if (polySynth) polySynth.set({ oscillator: { type: oscillatorType } });
	};

	onMount(() => {
		polySynth = new Tone.PolySynth(Tone.FMSynth, {
			harmonicity: 3,
			modulationIndex: 10,
			oscillator: { type: oscillatorType },
			envelope: { attack: 0.01, decay: 0.01, sustain: 1, release: 0.5 },
			modulation: { type: 'square' },
			modulationEnvelope: { attack: 0.2, decay: 0.01, sustain: 1, release: 0.5 }
		}).toDestination();

		createTonnetz();

		const handleGlobalMouseUp = () => {
			if (isDragging) {
				isDragging = false;
				stopAllNotes();
			}
		};

		document.addEventListener('mouseup', handleGlobalMouseUp);
		return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
	});
</script>

{#if showControls}
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
			<label for="startingNote">Starting Note:</label>
			<select id="startingNote" bind:value={startingNote} on:change={regenerateTonnetz}>
				<option value="C">C</option>
				<option value="C#">C#</option>
				<option value="D">D</option>
				<option value="D#">D#</option>
				<option value="E">E</option>
				<option value="F">F</option>
				<option value="F#">F#</option>
				<option value="G">G</option>
				<option value="G#">G#</option>
				<option value="A">A</option>
				<option value="A#">A#</option>
				<option value="B">B</option>
			</select>
		</div>
		<div class="control-group">
			<label for="oscillator">Oscillator:</label>
			<select id="oscillator" bind:value={oscillatorType} on:change={updateOscillatorType}>
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
