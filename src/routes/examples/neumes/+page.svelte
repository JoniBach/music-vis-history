<script lang="ts">
	import * as d3 from 'd3';
	import * as Tone from 'tone';
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	// --- TYPE DEFINITIONS ---
	type NeumeData = {
		syllable: string;
		pitchContour: number[]; // Array of values from 0 (high) to 1 (low)
		basePitch?: number; // Optional base height for the entire neume (0-1)
	};

	type DrawNeumeFn = (svg: d3.Selection<SVGSVGElement, NeumeData, any, any>, d: NeumeData) => void;

	type ChantStage = {
		id: string;
		title: string;
		description: string;
		data: NeumeData[];
		drawNeume: DrawNeumeFn;
		spans?: d3.Selection<HTMLButtonElement, NeumeData, HTMLDivElement, unknown>; // To be populated in onMount
	};

	// --- PURE SVG DRAWING FUNCTIONS ---

	/** Draws a neume based on a numeric contour. */
	const drawNeumeContour: DrawNeumeFn = (svg, d) => {
		const width = 40;
		const height = 30;
		const baseHeight = (d.basePitch ?? 0.5) * height;

		// Scales
		const xScale = d3.scaleLinear([0, d.pitchContour.length - 1], [10, width - 10]);
		const yScale = d3.scaleLinear([0, 1], [0, height * 0.6]); // Use 60% of height for contour

		// Line generator
		const line = d3
			.line<number>()
			.x((_, i) => xScale(i))
			.y((p) => baseHeight + yScale(p) - height * 0.3); // Center the contour vertically

		// For heighted neumes, draw a stable reference line in the middle.
		if (d.basePitch !== undefined) {
			svg
				.append('line')
				.attr('x1', 0)
				.attr('y1', height / 2) // Constant middle position
				.attr('x2', width)
				.attr('y2', height / 2) // Constant middle position
				.attr('stroke', 'red')
				.attr('stroke-width', 1);
		}

		// Draw the neume path
		svg
			.append('path')
			.datum(d.pitchContour)
			.attr('d', line)
			.attr('fill', 'none')
			.attr('stroke', 'black')
			.attr('stroke-width', 2);
	};

	/** Draws a neume on a two-line staff (F and C). */
	const drawNeumeTwoLines: DrawNeumeFn = (svg, d) => {
		const width = 40;
		const height = 30;

		// Define the Y positions for the staff lines.
		const cLineY = height * 0.25; // Gold C-line at the top.
		const fLineY = height * 0.75; // Red F-line at the bottom.

		// The vertical space available for the neume is between the two lines.
		const drawingHeight = fLineY - cLineY;
		const baseHeight = cLineY + (d.basePitch ?? 0.5) * drawingHeight;

		// Scales
		const xScale = d3.scaleLinear([0, d.pitchContour.length - 1], [10, width - 10]);
		// The y-scale for the contour is now relative to the drawingHeight between the lines.
		const yScale = d3.scaleLinear([0, 1], [0, drawingHeight * 0.5]);

		// Line generator, centered within the available space.
		const line = d3
			.line<number>()
			.x((_, i) => xScale(i))
			.y((p) => baseHeight + yScale(p) - drawingHeight * 0.25);

		// Draw the C (gold) and F (red) lines.
		svg
			.append('line')
			.attr('x1', 0)
			.attr('y1', cLineY)
			.attr('x2', width)
			.attr('y2', cLineY)
			.attr('stroke', 'gold')
			.attr('stroke-width', 1);
		svg
			.append('line')
			.attr('x1', 0)
			.attr('y1', fLineY)
			.attr('x2', width)
			.attr('y2', fLineY)
			.attr('stroke', 'red')
			.attr('stroke-width', 1);

		// Draw the neume path.
		svg
			.append('path')
			.datum(d.pitchContour)
			.attr('d', line)
			.attr('fill', 'none')
			.attr('stroke', 'black')
			.attr('stroke-width', 2);
	};

	/** Draws a neume on a four-line Guidonian staff. */
	const drawNeumeFourLines: DrawNeumeFn = (svg, d) => {
		const width = 40;
		const height = 30;

		// Define the Y positions for the four staff lines.
		const linePositions = [height * 0.2, height * 0.4, height * 0.6, height * 0.8];

		// The vertical space for the neume is the full height of the staff.
		const drawingHeight = linePositions[3] - linePositions[0];
		const baseHeight = linePositions[0] + (d.basePitch ?? 0.5) * drawingHeight;

		// Scales
		const xScale = d3.scaleLinear([0, d.pitchContour.length - 1], [15, width - 5]); // Make space for clef
		const yScale = d3.scaleLinear([0, 1], [0, drawingHeight * 0.4]);

		// Line generator
		const line = d3
			.line<number>()
			.x((_, i) => xScale(i))
			.y((p) => baseHeight + yScale(p) - drawingHeight * 0.2);

		// Draw the four staff lines.
		linePositions.forEach((y) => {
			svg
				.append('line')
				.attr('x1', 0)
				.attr('y1', y)
				.attr('x2', width)
				.attr('y2', y)
				.attr('stroke', 'black')
				.attr('stroke-width', 0.5);
		});

		// Draw a C-clef on the second line from the top.
		const clefY = linePositions[1];
		svg
			.append('path')
			.attr('d', `M8,${clefY - 4} C4,${clefY - 2} 4,${clefY + 2} 8,${clefY + 4}`)
			.attr('fill', 'none')
			.attr('stroke', 'black')
			.attr('stroke-width', 1.5);

		// Draw the neume path.
		svg
			.append('path')
			.datum(d.pitchContour)
			.attr('d', line)
			.attr('fill', 'none')
			.attr('stroke', 'black')
			.attr('stroke-width', 2);
	};

	/** Draws a neume using square notation representing rhythmic modes. */
	const drawNeumeRhythmic: DrawNeumeFn = (svg, d) => {
		const width = 40;
		const height = 30;
		const noteSize = 4;

		// Four-line staff setup
		const linePositions = [height * 0.2, height * 0.4, height * 0.6, height * 0.8];
		linePositions.forEach((y) => {
			svg
				.append('line')
				.attr('x1', 0)
				.attr('y1', y)
				.attr('x2', width)
				.attr('y2', y)
				.attr('stroke', 'black')
				.attr('stroke-width', 0.5);
		});

		// C-clef
		const clefY = linePositions[1];
		svg
			.append('path')
			.attr('d', `M8,${clefY - 4} C4,${clefY - 2} 4,${clefY + 2} 8,${clefY + 4}`)
			.attr('fill', 'none')
			.attr('stroke', 'black')
			.attr('stroke-width', 1.5);

		// The vertical space for the neume is the full height of the staff.
		const drawingHeight = linePositions[3] - linePositions[0];
		const basePitchY = linePositions[0] + (d.basePitch ?? 0.5) * drawingHeight;

		// Scales
		const xScale = d3.scaleLinear([0, d.pitchContour.length - 1], [15, width - 5]);
		const yScale = d3.scaleLinear([0, 1], [0, drawingHeight * 0.6]);

		// Draw the square noteheads (representing ligatures for Mode 1)
		d.pitchContour.forEach((p, i) => {
			const x = xScale(i);
			const y = basePitchY + yScale(p) - drawingHeight * 0.3;
			svg
				.append('rect')
				.attr('x', x - noteSize / 2)
				.attr('y', y - noteSize / 2)
				.attr('width', noteSize)
				.attr('height', noteSize)
				.attr('fill', 'black');
		});
	};

	// --- UNIFIED DATA STRUCTURE ---
	const chantStages: ChantStage[] = [
		{
			id: 'cheironomic',
			title: 'Stage 1: Cheironomic Neumes (9th Century)',
			description: 'These early neumes showed melodic contour but not exact pitch.',
			data: [
				{ syllable: 'Pu', pitchContour: [0.2, 0.8, 0.2] },
				{ syllable: 'er', pitchContour: [0.5, 0, 0.5] },
				{ syllable: 'na', pitchContour: [1, 0.5, 1] },
				{ syllable: 'tus', pitchContour: [0.3, 0.7] },
				{ syllable: 'est', pitchContour: [1, 0.2, 0.8, 0.8] },
				{ syllable: 'no', pitchContour: [0.2, 0.8, 0.2] },
				{ syllable: 'bis', pitchContour: [1, 0.5, 1] }
			],
			drawNeume: drawNeumeContour
		},
		{
			id: 'heighted',
			title: 'Stage 2: Heighted Neumes (10th-11th Century)',
			description: 'Neumes were placed at varying heights around a line to indicate pitch.',
			data: [
				// Same contours as above, but now with a basePitch to indicate height
				{ syllable: 'Pu', pitchContour: [1, 0.5, 1], basePitch: 0.5 },
				{ syllable: 'er', pitchContour: [0.5, 0.5], basePitch: 0.6 },
				{ syllable: 'na', pitchContour: [1, 0.5, 1], basePitch: 0.5 },
				{ syllable: 'tus', pitchContour: [0.5, 0.5], basePitch: 0.4 },
				{ syllable: 'est', pitchContour: [0.5, 0.5], basePitch: 0.2 },
				{ syllable: 'no', pitchContour: [0.2, 0.8], basePitch: 0.4 },
				{ syllable: 'bis', pitchContour: [1, 0.5, 1], basePitch: 0.5 }
			],
			drawNeume: drawNeumeContour
		},
		{
			id: 'two-line-staff',
			title: 'Stage 3: Two-Line Staff (c. 11th Century)',
			description:
				'Innovations, famously associated with Guido of Arezzo, led to a two-line staff. A red line indicated F, and a yellow or gold line indicated C, making pitch relationships unambiguous.',
			data: [
				{ syllable: 'Pu', pitchContour: [0.2, 0.8, 0.2], basePitch: 0.7 },
				{ syllable: 'er', pitchContour: [0.5, 0, 0.5], basePitch: 0.3 },
				{ syllable: 'na', pitchContour: [1, 0.5, 1], basePitch: 0.8 },
				{ syllable: 'tus', pitchContour: [0.3, 0.7], basePitch: 0.4 },
				{ syllable: 'est', pitchContour: [1, 0.2, 0.8, 0.8], basePitch: 0.9 },
				{ syllable: 'no', pitchContour: [0.2, 0.8, 0.2], basePitch: 0.2 },
				{ syllable: 'bis', pitchContour: [1, 0.5, 1], basePitch: 0.6 }
			],
			drawNeume: drawNeumeTwoLines
		},
		{
			id: 'four-line-staff',
			title: 'Stage 4: The Guidonian Staff (c. 11th Century)',
			description:
				"Guido of Arezzo's key innovation was the four-line staff, which became the standard for plainchant. By placing a clef (e.g., a C-clef) on one of the lines, the pitch of every note became absolute, allowing for sight-reading.",
			data: [
				{ syllable: 'Pu', pitchContour: [0.2, 0.8, 0.2], basePitch: 0.7 },
				{ syllable: 'er', pitchContour: [0.5, 0, 0.5], basePitch: 0.3 },
				{ syllable: 'na', pitchContour: [1, 0.5, 1], basePitch: 0.8 },
				{ syllable: 'tus', pitchContour: [0.3, 0.7], basePitch: 0.4 },
				{ syllable: 'est', pitchContour: [1, 0.2, 0.8, 0.8], basePitch: 0.9 },
				{ syllable: 'no', pitchContour: [0.2, 0.8, 0.2], basePitch: 0.2 },
				{ syllable: 'bis', pitchContour: [1, 0.5, 1], basePitch: 0.6 }
			],
			drawNeume: drawNeumeFourLines
		},
		{
			id: 'rhythmic-modes',
			title: 'Stage 5: Rhythmic Modes (12th-13th Century)',
			description:
				'The Notre Dame school developed rhythmic modes, using ligatures (note groupings) and square noteheads to notate rhythm for the first time. This allowed for complex polyphony.',
			data: [
				{ syllable: 'Pu', pitchContour: [0.2, 0.8, 0.2], basePitch: 0.7 },
				{ syllable: 'er', pitchContour: [0.5, 0, 0.5], basePitch: 0.3 },
				{ syllable: 'na', pitchContour: [1, 0.5, 1], basePitch: 0.8 },
				{ syllable: 'tus', pitchContour: [0.3, 0.7], basePitch: 0.4 },
				{ syllable: 'est', pitchContour: [1, 0.2, 0.8, 0.8], basePitch: 0.9 },
				{ syllable: 'no', pitchContour: [0.2, 0.8, 0.2], basePitch: 0.2 },
				{ syllable: 'bis', pitchContour: [1, 0.5, 1], basePitch: 0.6 }
			],
			drawNeume: drawNeumeRhythmic
		}
	];

	let synth: Tone.Synth;
	let isAudioReady = false;
	let isPlaying = false;

	// --- AUDIO STATE MANAGEMENT ---

	// --- PURE HELPER FUNCTIONS for PLAYBACK ---

	/** Converts a pitch contour into an array of notes. 0=F, 1=C */
	const contourToNotes = (d: NeumeData): string[] => {
		const base = d.basePitch ?? 0.5; // Default base pitch if not provided
		// Map basePitch (0-1, high to low) to a MIDI note range. Let's say C5 (72) to C4 (60).
		const baseMidi = 72 - base * 12;

		// The contour values (0-1, high to low) modify the base pitch.
		// Let's define the range of modification, e.g., +/- 5 semitones (a tritone, F to C is 5 semitones)
		const contourRange = 5; // F to C

		return d.pitchContour.map((p) => {
			// Map contour value p (0-1) to a semitone offset.
			// 0 -> F (high) -> +0 semitones from base
			// 1 -> C (low) -> -5 semitones from base
			const midiOffset = (1 - p) * contourRange;
			const finalMidi = baseMidi + midiOffset - contourRange; // Center the range
			return Tone.Frequency(Math.round(finalMidi), 'midi').toNote();
		});
	};

	/** Schedules the audio for a single neume and returns its duration. */
	const scheduleNeumeNotes = (player: Tone.Synth, notes: string[], startTime: number): number => {
		if (notes.length === 1) {
			const duration = Tone.Time('8n').toSeconds();
			player.triggerAttackRelease(notes[0], '8n', startTime);
			return duration;
		} else {
			const slideDuration = 0.3;
			let innerTime = 0;
			player.triggerAttack(notes[0], startTime);
			for (let n = 1; n < notes.length; n++) {
				innerTime += slideDuration;
				player.setNote(notes[n], startTime + innerTime);
			}
			player.triggerRelease(startTime + innerTime + slideDuration);
			return innerTime + slideDuration;
		}
	};

	/** Schedules the visual highlight for a syllable. */
	const scheduleHighlight = (element: HTMLSpanElement, startTime: number, duration: number) => {
		Tone.Draw.schedule(() => d3.select(element).classed('playing', true), startTime);
		Tone.Draw.schedule(() => d3.select(element).classed('playing', false), startTime + duration);
	};

	/** Main playback scheduler: orchestrates note and highlight scheduling. */
	const schedulePlayback = (stage: ChantStage, startIndex = 0, playAll = false) => {
		// Prevent scheduling new playback while audio is already running or not ready.
		if (!isAudioReady || isPlaying || !stage.spans) return;

		// Set playback flag
		isPlaying = true;
		d3.selectAll('.playing').classed('playing', false);

		const sequence = playAll ? stage.data : [stage.data[startIndex]];
		const allSpans = stage.spans.nodes();
		let cumulativeTime = 0;
		const playbackStartTime = Tone.now() + 0.1; // Start with a small buffer

		sequence.forEach((d, i) => {
			const spanIndex = playAll ? i : startIndex;
			const spanElement = allSpans[spanIndex];
			const noteStartTime = playbackStartTime + cumulativeTime;

			const notes = contourToNotes(d);
			const noteDuration = scheduleNeumeNotes(synth, notes, noteStartTime);
			scheduleHighlight(spanElement, noteStartTime, noteDuration);

			cumulativeTime += noteDuration + 0.1; // Add a small gap between syllables
		});

		// Reset the isPlaying flag after the entire sequence has finished.
		setTimeout(
			() => {
				isPlaying = false;
			},
			(cumulativeTime + 0.2) * 1000
		);
	};

	// --- D3 SETUP (REUSABLE) ---

	/** A generic function to set up a D3-based chant visualization. */
	const setupChant = (
		stage: ChantStage
	): d3.Selection<HTMLButtonElement, NeumeData, HTMLDivElement, unknown> => {
		return d3
			.select<HTMLDivElement, unknown>(`.${stage.id}-chant`)
			.selectAll<HTMLButtonElement, NeumeData>('button')
			.data(stage.data)
			.each(function (d) {
				// By explicitly typing the container, TS can correctly infer the type of the appended SVG
				const container = d3.select<HTMLButtonElement, NeumeData>(this);
				const svg = container
					.append('svg')
					.attr('width', 40)
					.attr('height', 30)
					.attr('viewBox', '0 0 40 30');
				stage.drawNeume(svg, d);
			});
	};

	// --- SVELTE LIFECYCLE HOOKS ---

	/** Ensures the audio context is started, only runs once. */
	const initAudio = async () => {
		if (isAudioReady) return;
		await Tone.start();
		isAudioReady = true;
		console.log('Audio context started');
	};

	onMount(() => {
		// Create the synth instance once when the component mounts.
		synth = new Tone.Synth({
			oscillator: { type: 'sine' },
			envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 },
			portamento: 0.05
		}).toDestination();

		// Initialize all chant stages
		chantStages.forEach((stage) => {
			stage.spans = setupChant(stage);
		});
	});

	onDestroy(() => {
		if (browser) {
			if (synth) synth.dispose();
		}
	});
</script>

<div class="container p-8">
	<h1 class="text-4xl font-bold mb-4">The Evolution of Neumes</h1>

	{#each chantStages as stage (stage.id)}
		<div class="stage mb-12">
			<h2 class="text-2xl font-semibold mb-2">{stage.title}</h2>
			<p class="mb-4">{stage.description}</p>
			<button
				on:click={async () => {
					await initAudio();
					schedulePlayback(stage, 0, true);
				}}
				class="btn btn-primary mb-4">Play Chant</button
			>
			<div class={`chant-text ${stage.id}-chant text-2xl`}>
				{#each stage.data as { syllable, basePitch }, i}
					<button
						type="button"
						class="syllable"
						data-index={i}
						data-pitch={basePitch}
						on:click={async () => {
							await initAudio();
							schedulePlayback(stage, i, false);
						}}>{syllable}</button
					>
				{/each}
			</div>
		</div>
	{/each}
</div>

<style>
	.chant-text {
		margin-top: 2rem; /* Create space for neumes above */
	}
	.syllable {
		/* Reset button styles to look like a span */
		background: none;
		border: none;
		font: inherit;
		color: inherit;

		display: inline-block;
		position: relative;
		padding: 20px 10px 5px 10px; /* Top padding for SVG, bottom for spacing */
		margin: 0 5px;
		cursor: pointer;
		transition: background-color 0.2s;
		text-align: center;
	}

	:global(.syllable svg) {
		position: absolute;
		top: 0;
		left: 50%;
		transform: translateX(-50%);
		overflow: visible;
	}

	:global(.syllable.playing) {
		background-color: yellow;
	}
</style>
