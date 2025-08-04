<script context="module" lang="ts">
	export interface TonnetzControlsData {
		numOctaves: number;
		baseOctave: number;
		gridRadius: number;
		zoomScale: number;
		startingNote: string;
		oscillatorType: 'sine' | 'square' | 'sawtooth' | 'triangle';
		showChordNames: boolean;
		showRomanNumerals: boolean;
		showRootHighlight: boolean;
		showTriangles: boolean;
		showNoteLabels: boolean;
		showLegend: boolean;
		showOnlyKeyTriangles: boolean;
		showMajorTriangles: boolean;
		showMinorTriangles: boolean;
	}
</script>

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
		chordName: string;
		romanNumeral: string;
		id: string;
	};

	type HexPosition = { q: number; r: number };

	// Component props
	export let width = 800;
	export let height = 600;
	export let controls: TonnetzControlsData;

	// State
	let svgElement: SVGSVGElement;
	let polySynth: Tone.PolySynth;
	let isDragging = false;
	let currentlyPlayingElements = new Set<string>();

	// Reactive statements to update internal state when controls change
	$: numOctaves = controls?.numOctaves ?? 2;
	$: baseOctave = controls?.baseOctave ?? 4;
	$: gridRadius = controls?.gridRadius ?? 3;
	$: zoomScale = controls?.zoomScale ?? 1.0;
	$: startingNote = controls?.startingNote ?? 'C';
	$: oscillatorType = controls?.oscillatorType ?? 'sawtooth';
	$: showChordNames = controls?.showChordNames ?? true;
	$: showRomanNumerals = controls?.showRomanNumerals ?? true;
	$: showRootHighlight = controls?.showRootHighlight ?? true;
	$: showTriangles = controls?.showTriangles ?? true;
	$: showNoteLabels = controls?.showNoteLabels ?? true;
	$: showLegend = controls?.showLegend ?? true;
	$: showOnlyKeyTriangles = controls?.showOnlyKeyTriangles ?? false;
	$: showMajorTriangles = controls?.showMajorTriangles ?? true;
	$: showMinorTriangles = controls?.showMinorTriangles ?? true;

	// Visual configuration
	const VISUAL_CONFIG = {
		noteRadius: 18,
		noteStrokeWidth: 2,
		noteFontSize: '12px',
		chordFontSize: '10px',
		majorTriangleColor: '#4a90e2',
		minorTriangleColor: '#e24a4a',
		triangleOpacity: 0.6,
		noteColor: '#ffffff',
		noteStrokeColor: '#333',
		chordTextColor: '#ffffff',
		startingNoteColor: '#ffeb3b' // Yellow for starting note
	} as const;

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

	// Reusable music theory functions
	const getStartingNoteOffset = (startingNote: string): number => {
		const index = NOTE_NAMES.indexOf(startingNote as (typeof NOTE_NAMES)[number]);
		if (index === -1) {
			console.warn(`Invalid starting note: ${startingNote}, defaulting to C`);
			return 0;
		}
		return index;
	};

	const calculateSemitoneIndex = (totalSemitones: number, startingOffset: number): number => {
		return (((totalSemitones + startingOffset) % 12) + 12) % 12;
	};

	const calculateOctave = (
		totalSemitones: number,
		startingOffset: number,
		baseOctave: number,
		numOctaves: number
	): number => {
		const octaveOffset = Math.floor((totalSemitones + startingOffset) / 12);
		return Math.max(baseOctave, Math.min(baseOctave + numOctaves - 1, baseOctave + octaveOffset));
	};

	const calculateFrequency = (noteIndex: number, octave: number): number => {
		const semitonesFromC4 = (octave - 4) * 12 + noteIndex;
		return BASE_FREQUENCY * Math.pow(2, semitonesFromC4 / 12);
	};

	const calculateNote = (pos: HexPosition) => {
		const startingOffset = getStartingNoteOffset(startingNote);
		const totalSemitones = pos.q * 7 + pos.r * 4;
		const noteIndex = calculateSemitoneIndex(totalSemitones, startingOffset);
		const noteName = NOTE_NAMES[noteIndex];
		const octave = calculateOctave(totalSemitones, startingOffset, baseOctave, numOctaves);
		const frequency = calculateFrequency(noteIndex, octave);

		return {
			noteName,
			octave,
			frequency,
			displayName: `${noteName}${octave}`
		};
	};

	// Chord calculation functions
	const getNoteNameOnly = (fullNote: string): string => {
		return fullNote.replace(/\d+$/, '');
	};

	const noteToSemitone = (noteName: string): number => {
		return NOTE_NAMES.indexOf(noteName as (typeof NOTE_NAMES)[number]);
	};

	const normalizeIntervals = (semitones: number[]): number[] => {
		const sorted = [...semitones].sort((a, b) => a - b);
		return [
			0, // Root
			(sorted[1] - sorted[0] + 12) % 12, // Second interval
			(sorted[2] - sorted[0] + 12) % 12 // Third interval
		];
	};

	const identifyChordQuality = (intervals: number[]): string => {
		if (intervals.includes(4) && intervals.includes(7)) return 'major';
		if (intervals.includes(3) && intervals.includes(7)) return 'minor';
		if (intervals.includes(3) && intervals.includes(6)) return 'diminished';
		if (intervals.includes(4) && intervals.includes(8)) return 'augmented';
		return 'unknown';
	};

	const tryChordInversions = (semitones: number[]): { root: string; quality: string } | null => {
		for (let i = 0; i < semitones.length; i++) {
			const newRoot = semitones[i];
			const newIntervals = semitones.map((s) => (s - newRoot + 12) % 12).sort();
			const quality = identifyChordQuality(newIntervals);

			if (quality !== 'unknown') {
				return { root: NOTE_NAMES[newRoot], quality };
			}
		}
		return null;
	};

	// Roman numeral analysis functions
	const getRomanNumeral = (chordRoot: string, quality: string, keyRoot: string): string => {
		const keyIndex = noteToSemitone(keyRoot);
		const chordIndex = noteToSemitone(chordRoot);
		const degree = (chordIndex - keyIndex + 12) % 12;

		// Map semitone intervals to scale degrees
		const degreeMap: { [key: number]: string } = {
			0: '1', // I/i (tonic)
			2: '2', // II/ii (supertonic)
			4: '3', // III/iii (mediant)
			5: '4', // IV/iv (subdominant)
			7: '5', // V/v (dominant)
			9: '6', // VI/vi (submediant)
			11: '7' // VII/vii (leading tone)
		};

		const romanBase = degreeMap[degree] || '-';

		if (quality === 'major') {
			return romanBase.toUpperCase();
		} else if (quality === 'minor') {
			return romanBase.toLowerCase();
		} else if (quality === 'diminished') {
			return romanBase.toLowerCase() + '°';
		} else if (quality === 'augmented') {
			return romanBase.toUpperCase() + '+';
		}

		return romanBase + '-';
	};

	const calculateChordName = (noteNames: string[]): string => {
		const notes = noteNames.map(getNoteNameOnly);
		const semitones = notes.map(noteToSemitone).filter((s) => s !== -1);

		if (semitones.length !== 3) return '-';

		const sorted = [...semitones].sort((a, b) => a - b);
		const intervals = normalizeIntervals(sorted);
		const rootNote = NOTE_NAMES[sorted[0]];
		const quality = identifyChordQuality(intervals);

		if (quality === 'major') {
			return rootNote; // Uppercase for major (e.g., "C")
		} else if (quality === 'minor') {
			return rootNote.toLowerCase(); // Lowercase for minor (e.g., "c")
		} else if (quality === 'diminished') {
			return rootNote.toLowerCase() + '°'; // Lowercase with diminished symbol
		} else if (quality === 'augmented') {
			return rootNote + '+'; // Uppercase with augmented symbol
		}

		// Try inversions
		const inversion = tryChordInversions(semitones);
		if (inversion) {
			if (inversion.quality === 'major') {
				return inversion.root;
			} else if (inversion.quality === 'minor') {
				return inversion.root.toLowerCase();
			} else if (inversion.quality === 'diminished') {
				return inversion.root.toLowerCase() + '°';
			} else if (inversion.quality === 'augmented') {
				return inversion.root + '+';
			}
		}

		return rootNote + '-';
	};

	const calculateChordWithRomanNumeral = (
		noteNames: string[]
	): { chordName: string; romanNumeral: string } => {
		const notes = noteNames.map(getNoteNameOnly);
		const semitones = notes.map(noteToSemitone).filter((s) => s !== -1);

		if (semitones.length !== 3) return { chordName: '-', romanNumeral: '-' };

		const sorted = [...semitones].sort((a, b) => a - b);
		const intervals = normalizeIntervals(sorted);
		const rootNote = NOTE_NAMES[sorted[0]];
		const quality = identifyChordQuality(intervals);

		let finalRoot = rootNote;
		let finalQuality = quality;

		// Try inversions if initial quality is unknown
		if (quality === 'unknown') {
			const inversion = tryChordInversions(semitones);
			if (inversion) {
				finalRoot = inversion.root;
				finalQuality = inversion.quality;
			}
		}

		// Calculate chord name
		let chordName = '-';
		if (finalQuality === 'major') {
			chordName = finalRoot;
		} else if (finalQuality === 'minor') {
			chordName = finalRoot.toLowerCase();
		} else if (finalQuality === 'diminished') {
			chordName = finalRoot.toLowerCase() + '°';
		} else if (finalQuality === 'augmented') {
			chordName = finalRoot + '+';
		}

		// Calculate Roman numeral
		const romanNumeral = getRomanNumeral(finalRoot, finalQuality, startingNote);

		return { chordName, romanNumeral };
	};

	const createPoint = (pos: HexPosition): Point => {
		const pixel = hexToPixel(pos);
		const noteInfo = calculateNote(pos);
		return {
			...pixel,
			note: noteInfo.displayName,
			frequency: noteInfo.frequency,
			id: `${pos.q}_${pos.r}`
		} as Point;
	};

	// Reusable triangle generation functions
	const getTriangleConfigs = (q: number, r: number) => [
		{ points: [`${q}_${r}`, `${q + 1}_${r}`, `${q + 1}_${r - 1}`], type: 'minor' as const },
		{ points: [`${q}_${r}`, `${q}_${r - 1}`, `${q + 1}_${r - 1}`], type: 'minor' as const },
		{ points: [`${q}_${r}`, `${q - 1}_${r + 1}`, `${q}_${r + 1}`], type: 'major' as const },
		{ points: [`${q}_${r}`, `${q + 1}_${r}`, `${q}_${r + 1}`], type: 'major' as const }
	];

	const calculateTriangleCenter = (points: Point[]): { x: number; y: number } => ({
		x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
		y: points.reduce((sum, p) => sum + p.y, 0) / points.length
	});

	const createTriangle = (
		pointIds: string[],
		type: 'major' | 'minor',
		pointMap: Map<string, Point>
	): Triangle => {
		const points = pointIds.map((id) => pointMap.get(id)!).filter(Boolean);
		const noteNames = points.map((p) => p.note);
		const chordAnalysis = calculateChordWithRomanNumeral(noteNames);
		const center = calculateTriangleCenter(points);

		console.log('Triangle created:', {
			notes: noteNames,
			chordName: chordAnalysis.chordName,
			romanNumeral: chordAnalysis.romanNumeral,
			type
		});

		return {
			points: pointIds,
			type,
			notes: noteNames,
			chordName: chordAnalysis.chordName,
			romanNumeral: chordAnalysis.romanNumeral,
			center,
			id: pointIds.sort().join('-')
		};
	};

	const generateTriangles = (
		positions: HexPosition[],
		pointMap: Map<string, Point>
	): Triangle[] => {
		const triangles: Triangle[] = [];
		const generated = new Set<string>();

		positions.forEach(({ q, r }) => {
			const configs = getTriangleConfigs(q, r);

			configs.forEach(({ points, type }) => {
				const key = points.sort().join('-');
				if (!generated.has(key) && points.every((id) => pointMap.has(id))) {
					generated.add(key);
					triangles.push(createTriangle(points, type, pointMap));
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

	export const stopAllNotes = () => {
		if (!polySynth) return;
		try {
			polySynth.releaseAll();
			currentlyPlayingElements.clear();
		} catch (error) {
			console.error('Error stopping all notes:', error);
		}
	};

	// Event handlers
	export const handleElementPlay = (elementId: string, frequencies: number[]) => {
		// During drag operations, stop all previous notes before playing new ones
		if (isDragging) {
			stopAllNotes();
		}

		if (!currentlyPlayingElements.has(elementId)) {
			currentlyPlayingElements.add(elementId);
			startChord(frequencies);
		}
	};

	export const handleElementStop = (elementId: string) => {
		currentlyPlayingElements.delete(elementId);
		// Only stop all notes if we're not dragging to another element
		if (!isDragging) {
			stopAllNotes();
		}
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

		// Draw triangles if enabled
		if (showTriangles) {
			// Filter triangles based on key membership and chord quality
			let filteredTriangles = triangles;

			// Filter by key membership if enabled
			if (showOnlyKeyTriangles) {
				filteredTriangles = filteredTriangles.filter(
					(t) => t.romanNumeral && t.romanNumeral !== '-' && t.romanNumeral !== '?'
				);
			}

			// Filter by chord quality (major/minor)
			if (!showMajorTriangles || !showMinorTriangles) {
				filteredTriangles = filteredTriangles.filter((t) => {
					if (t.type === 'major' && !showMajorTriangles) return false;
					if (t.type === 'minor' && !showMinorTriangles) return false;
					return true;
				});
			}

			g.selectAll('.triangle')
				.data(filteredTriangles)
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
				.attr('fill', (d) =>
					d.type === 'major' ? VISUAL_CONFIG.majorTriangleColor : VISUAL_CONFIG.minorTriangleColor
				)
				.attr('opacity', VISUAL_CONFIG.triangleOpacity)
				.attr('stroke', '#333')
				.attr('stroke-width', 1)
				.attr('cursor', 'pointer')
				.on('mouseover', function (event, d) {
					if (isDragging) {
						const frequencies = d.notes
							.map((note) => points.find((p) => p.note === note)?.frequency)
							.filter(Boolean) as number[];
						handleElementPlay(`triangle-${d.points.join('-')}`, frequencies);
					}
					d3.select(this).attr('opacity', 0.8);
				})
				.on('mouseout', function (event, d) {
					if (isDragging) handleElementStop(`triangle-${d.points.join('-')}`);
					d3.select(this).attr('opacity', VISUAL_CONFIG.triangleOpacity);
				})
				.on('mousedown', function (event, d) {
					event.preventDefault();
					stopAllNotes();
					isDragging = true;
					const frequencies = d.notes
						.map((note) => points.find((p) => p.note === note)?.frequency)
						.filter(Boolean) as number[];
					handleElementPlay(`triangle-${d.points.join('-')}`, frequencies);
				});
		}

		// Filter triangles for chord/Roman numeral display based on key membership and chord quality
		let displayTriangles = triangles;

		// Filter by key membership if enabled
		if (showOnlyKeyTriangles) {
			displayTriangles = displayTriangles.filter(
				(t) => t.romanNumeral && t.romanNumeral !== '-' && t.romanNumeral !== '?'
			);
		}

		// Filter by chord quality (major/minor)
		if (!showMajorTriangles || !showMinorTriangles) {
			displayTriangles = displayTriangles.filter((t) => {
				if (t.type === 'major' && !showMajorTriangles) return false;
				if (t.type === 'minor' && !showMinorTriangles) return false;
				return true;
			});
		}

		// Draw chord names if enabled
		if (showChordNames) {
			const chordYOffset = showRomanNumerals ? -6 : 0;

			g.selectAll('.chord-label')
				.data(displayTriangles)
				.enter()
				.append('text')
				.attr('class', 'chord-label')
				.attr('x', (d) => d.center.x)
				.attr('y', (d) => d.center.y + chordYOffset)
				.attr('text-anchor', 'middle')
				.attr('dominant-baseline', 'central')
				.attr('font-size', '12px')
				.attr('fill', '#000000')
				.attr('font-weight', 'bold')
				.attr('pointer-events', 'none')
				.style('text-shadow', '2px 2px 4px rgba(255,255,255,0.9)')
				.text((d) => d.chordName || '-');
		}

		// Draw Roman numerals if enabled
		if (showRomanNumerals) {
			const romanYOffset = showChordNames ? 6 : 0;

			g.selectAll('.roman-label')
				.data(displayTriangles)
				.enter()
				.append('text')
				.attr('class', 'roman-label')
				.attr('x', (d) => d.center.x)
				.attr('y', (d) => d.center.y + romanYOffset)
				.attr('text-anchor', 'middle')
				.attr('dominant-baseline', 'central')
				.attr('font-size', '10px')
				.attr('fill', '#666666')
				.attr('font-weight', 'normal')
				.attr('pointer-events', 'none')
				.style('text-shadow', '1px 1px 2px rgba(255,255,255,0.8)')
				.text((d) => d.romanNumeral || '-');
		}

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
			.attr('r', VISUAL_CONFIG.noteRadius)
			.attr('fill', (d) => {
				// Highlight starting note in yellow if enabled
				if (showRootHighlight) {
					const noteNameOnly = d.note.replace(/[0-9]/g, '');
					return noteNameOnly === startingNote
						? VISUAL_CONFIG.startingNoteColor
						: VISUAL_CONFIG.noteColor;
				}
				return VISUAL_CONFIG.noteColor;
			})
			.attr('stroke', VISUAL_CONFIG.noteStrokeColor)
			.attr('stroke-width', VISUAL_CONFIG.noteStrokeWidth)
			.attr('cursor', 'pointer')
			.on('mouseover', function (event, d) {
				if (isDragging) handleElementPlay(`note-${d.id}`, [d.frequency]);
				d3.select(this)
					.attr('fill', isDragging ? '#28a745' : '#007bff')
					.attr('r', 22);
			})
			.on('mouseout', function (event, d) {
				if (isDragging) handleElementStop(`note-${d.id}`);
				// Restore original color based on whether it's the starting note and root highlighting is enabled
				let originalColor: string = VISUAL_CONFIG.noteColor;
				if (showRootHighlight) {
					const noteNameOnly = d.note.replace(/[0-9]/g, '');
					originalColor = noteNameOnly === startingNote
						? VISUAL_CONFIG.startingNoteColor
						: VISUAL_CONFIG.noteColor;
				}
				d3.select(this).attr('fill', originalColor).attr('r', VISUAL_CONFIG.noteRadius);
			})
			.on('mousedown', function (event, d) {
				event.preventDefault();
				stopAllNotes();
				isDragging = true;
				handleElementPlay(`note-${d.id}`, [d.frequency]);
				d3.select(this).attr('fill', '#28a745');
			});

		// Add note labels if enabled
		if (showNoteLabels) {
			noteGroups
				.append('text')
				.attr('x', (d) => d.x)
				.attr('y', (d) => d.y)
				.attr('text-anchor', 'middle')
				.attr('dominant-baseline', 'central')
				.attr('font-size', VISUAL_CONFIG.noteFontSize)
				.attr('font-weight', 'bold')
				.attr('fill', '#333')
				.attr('pointer-events', 'none')
				.text((d) => d.note);
		}

		// Add legend if enabled
		if (showLegend) {
			const legend = svg
				.append('g')
				.attr('class', 'legend')
				.attr('transform', `translate(${width - 150}, 20)`);

			legend
				.append('rect')
				.attr('width', 20)
				.attr('height', 20)
				.attr('fill', VISUAL_CONFIG.majorTriangleColor)
				.attr('opacity', VISUAL_CONFIG.triangleOpacity);
			legend.append('text').attr('x', 30).attr('y', 15).attr('font-size', '14px').text('Major');

			legend
				.append('rect')
				.attr('y', 30)
				.attr('width', 20)
				.attr('height', 20)
				.attr('fill', VISUAL_CONFIG.minorTriangleColor)
				.attr('opacity', VISUAL_CONFIG.triangleOpacity);
			legend.append('text').attr('x', 30).attr('y', 45).attr('font-size', '14px').text('Minor');
		}
	};

	const regenerateTonnetz = () => {
		stopAllNotes();
		if (svgElement) d3.select(svgElement).selectAll('*').remove();
		createTonnetz();
	};

	const createPolySynth = () => {
		if (polySynth) {
			polySynth.dispose();
		}
		polySynth = new Tone.PolySynth(Tone.FMSynth, {
			harmonicity: 3,
			modulationIndex: 10,
			oscillator: { type: oscillatorType },
			envelope: { attack: 0.01, decay: 0.01, sustain: 1, release: 0.5 },
			modulation: { type: 'square' },
			modulationEnvelope: { attack: 0.2, decay: 0.01, sustain: 1, release: 0.5 }
		}).toDestination();
	};

	const createZoom = () => {
		if (!svgElement) return;
		const svg = d3.select(svgElement);
		const zoom = d3.zoom()
			.scaleExtent([0.5, 3])
			.on('zoom', (event) => {
				const { transform } = event;
				const mainGroup = svg.select('.main-group');
				if (!mainGroup.empty()) {
					mainGroup.attr('transform', `translate(${width / 2}, ${height / 2}) ${transform}`);
				}
			});
		svg.call(zoom as any);
	};

	const createVisualization = () => {
		if (!svgElement) return;
		createPolySynth();
		createZoom();
		createTonnetz();
	};

	// Reactive statements to trigger regeneration when controls change
	$: if (svgElement && controls) {
		regenerateTonnetz();
	}

	$: if (svgElement && controls?.zoomScale) {
		applyZoom();
	}

	// Export functions for parent component to call
	export const updateOscillatorType = () => {
		if (polySynth) {
			polySynth.set({ oscillator: { type: oscillatorType } });
		}
	};

	export const regenerate = () => {
		regenerateTonnetz();
	};

	export const applyZoomChange = () => {
		applyZoom();
	};

	const applyZoom = () => {
		if (!svgElement) return;
		const svg = d3.select(svgElement);
		const mainGroup = svg.select('g.main-group');
		if (!mainGroup.empty()) {
			mainGroup.attr('transform', `translate(${width / 2}, ${height / 2}) scale(${zoomScale})`);
		} else {
			// If main group doesn't exist yet, create the visualization first
			createTonnetz();
			const newMainGroup = svg.select('g.main-group');
			if (!newMainGroup.empty()) {
				newMainGroup.attr('transform', `translate(${width / 2}, ${height / 2}) scale(${zoomScale})`);
			}
		}
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



<div class="tonnetz-container">
	<svg bind:this={svgElement}></svg>
</div>

<style>
	.tonnetz-container {
		display: flex;
		justify-content: center;
		align-items: center;
	}
</style>
