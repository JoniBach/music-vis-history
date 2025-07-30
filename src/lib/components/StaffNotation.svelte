<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import * as d3 from 'd3';
	import * as Tone from 'tone';

	// Component props for configuration
	export let notes: Array<{ pitch: string; duration: string }> = [
		{ pitch: 'C4', duration: 'crotchet' },
		{ pitch: 'D4', duration: 'crotchet' },
		{ pitch: 'E4', duration: 'crotchet' },
		{ pitch: 'F4', duration: 'crotchet' },
		{ pitch: 'G4', duration: 'crotchet' },
		{ pitch: 'A4', duration: 'crotchet' },
		{ pitch: 'B4', duration: 'crotchet' },
		{ pitch: 'C5', duration: 'crotchet' }
	];
	export let clef: 'treble' | 'bass' | 'alto' = 'treble';
	export let timeSignature: { numerator: number; denominator: number } = {
		numerator: 4,
		denominator: 4
	};
	export let scale: number = 0.5;
	export let width: number = 800;
	export let height: number = 300;
	export let showLabels: boolean = true;
	export let showPlayButton: boolean = true;
	export let interactive: boolean = true;
	export let title: string = '';
	export let description: string = '';

	// Internal state
	let staffContainer: HTMLDivElement;
	let synth: Tone.Synth;
	let isPlaying = false;

	// Event dispatcher for parent components
	const dispatch = createEventDispatcher<{
		notePlay: { pitch: string; duration: string };
		scalePlay: { notes: typeof processedNotes };
	}>();

	// SMuFL Glyph definitions
	const SMuFL = {
		clefs: {
			treble: '\uE050',
			bass: '\uE062',
			alto: '\uE05C'
		},
		noteheads: {
			whole: '\uE0A2',
			half: '\uE0A3',
			black: '\uE0A4',
			void: '\uE0A3'
		},
		stems: {
			up: '\uE210',
			down: '\uE210',
			upShort: '\uE212',
			downShort: '\uE213'
		},
		flags: {
			eighthUp: '\uE240',
			eighthDown: '\uE241',
			sixteenthUp: '\uE242',
			sixteenthDown: '\uE243',
			thirtySecondUp: '\uE244',
			thirtySecondDown: '\uE245'
		},
		barlines: {
			single: '\uE030',
			double: '\uE031',
			final: '\uE032'
		},
		rests: {
			whole: '\uE4E1',
			half: '\uE4E2',
			quarter: '\uE4E5',
			eighth: '\uE4E6'
		},
		accidentals: {
			sharp: '\uE262',
			flat: '\uE260',
			natural: '\uE261',
			doubleSharp: '\uE263',
			doubleFlat: '\uE264'
		},
		timeSignatures: {
			0: '\uE080',
			1: '\uE081',
			2: '\uE082',
			3: '\uE083',
			4: '\uE084',
			5: '\uE085',
			6: '\uE086',
			7: '\uE087',
			8: '\uE088',
			9: '\uE089',
			commonTime: '\uE08A',
			cutTime: '\uE08B'
		}
	};

	// Note duration configurations
	type NoteDuration = {
		name: string;
		notehead: string;
		needsStem: boolean;
		needsFlag: boolean;
		flagType?: string;
		duration: string;
		displayName: string;
	};

	const noteDurations: NoteDuration[] = [
		{
			name: 'semibreve',
			notehead: SMuFL.noteheads.whole,
			needsStem: false,
			needsFlag: false,
			duration: '1n',
			displayName: 'Whole Note'
		},
		{
			name: 'minim',
			notehead: SMuFL.noteheads.half,
			needsStem: true,
			needsFlag: false,
			duration: '2n',
			displayName: 'Half Note'
		},
		{
			name: 'crotchet',
			notehead: SMuFL.noteheads.black,
			needsStem: true,
			needsFlag: false,
			duration: '4n',
			displayName: 'Quarter Note'
		},
		{
			name: 'quaver',
			notehead: SMuFL.noteheads.black,
			needsStem: true,
			needsFlag: true,
			flagType: 'eighth',
			duration: '8n',
			displayName: 'Eighth Note'
		},
		{
			name: 'semi quaver',
			notehead: SMuFL.noteheads.black,
			needsStem: true,
			needsFlag: true,
			flagType: 'sixteenth',
			duration: '16n',
			displayName: 'Sixteenth Note'
		}
	];

	// Reactive computations
	$: STAFF_CONFIG = {
		width: width * scale,
		height: height * scale,
		staffLineSpacing: 20 * scale,
		staffTop: 60 * scale,
		startPadding: 20 * scale,
		endPadding: 20 * scale
	};

	$: DURATION_CONFIG = {
		widths: {
			'1n': 120 * scale,
			'2n': 80 * scale,
			'4n': 60 * scale,
			'8n': 40 * scale,
			'16n': 30 * scale
		},
		// Duration values in quarter note beats for bar line calculation
		beats: {
			'1n': 4, // whole note = 4 beats
			'2n': 2, // half note = 2 beats
			'4n': 1, // quarter note = 1 beat
			'8n': 0.5, // eighth note = 0.5 beats
			'16n': 0.25 // sixteenth note = 0.25 beats
		}
	};

	// Process notes with duration and position information
	$: processedNotes = notes.map((note) => {
		const durationInfo = getDurationInfo(note.duration, noteDurations);
		const position = getStaffPosition(note.pitch);
		return {
			name: note.pitch,
			line: position.line,
			ledger: position.ledger,
			durationInfo
		};
	});

	// Group notes into bars and calculate bar line positions
	$: barCalculationResult = (() => {
		const beatsPerBar = timeSignature.numerator * (4 / timeSignature.denominator);
		const bars: Array<{ notes: typeof processedNotes; width: number; beats: number }> = [];
		const positions: number[] = [];
		const offsets = createOffsetConfig(scale);
		const startX = offsets.spacing.firstBarlineX + offsets.spacing.noteStartOffset;

		let currentBar: typeof processedNotes = [];
		let currentBarBeats = 0;
		let currentBarWidth = 0;

		// Group notes into bars based on time signature
		processedNotes.forEach((note, index) => {
			const noteBeats =
				DURATION_CONFIG.beats[note.durationInfo.duration as keyof typeof DURATION_CONFIG.beats] ||
				1;
			const noteWidth =
				DURATION_CONFIG.widths[note.durationInfo.duration as keyof typeof DURATION_CONFIG.widths] ||
				offsets.spacing.defaultNoteWidth;

			// Check if adding this note would exceed the bar
			if (currentBarBeats + noteBeats > beatsPerBar && currentBar.length > 0) {
				// Complete the current bar
				bars.push({
					notes: [...currentBar],
					width: currentBarWidth,
					beats: currentBarBeats
				});

				// Start a new bar
				currentBar = [note];
				currentBarBeats = noteBeats;
				currentBarWidth = noteWidth;
			} else {
				// Add note to current bar
				currentBar.push(note);
				currentBarBeats += noteBeats;
				currentBarWidth += noteWidth;
			}

			// If this is the last note, complete the bar
			if (index === processedNotes.length - 1 && currentBar.length > 0) {
				bars.push({
					notes: [...currentBar],
					width: currentBarWidth,
					beats: currentBarBeats
				});
			}
		});

		// Calculate bar line positions (before each bar except the first)
		let cumulativeX = startX;
		bars.forEach((bar, index) => {
			if (index > 0) {
				// Place bar line before this bar, with some spacing before the first note
				positions.push(cumulativeX - offsets.spacing.noteStartOffset / 1.5);
			}
			cumulativeX += bar.width;
		});

		return { barsData: bars, barLinePositions: positions };
	})();

	// Extract the calculated values
	$: barsData = barCalculationResult.barsData;
	$: barLinePositions = barCalculationResult.barLinePositions;

	// Pure functions for staff positioning and note processing
	const getStaffPosition = (noteName: string) => {
		const staffPositions: Record<string, { line: number; ledger: boolean }> = {
			// Treble clef positions (can be extended for other clefs)
			C4: { line: 5.5, ledger: true },
			D4: { line: 5, ledger: false },
			E4: { line: 4.5, ledger: false },
			F4: { line: 4, ledger: false },
			G4: { line: 3.5, ledger: false },
			A4: { line: 3, ledger: false },
			B4: { line: 2.5, ledger: false },
			C5: { line: 2, ledger: false },
			D5: { line: 1.5, ledger: false },
			E5: { line: 1, ledger: false },
			F5: { line: 0.5, ledger: false },
			G5: { line: 0, ledger: false },
			A5: { line: -0.5, ledger: true }
		};
		return staffPositions[noteName] || { line: 0, ledger: false };
	};

	const getDurationInfo = (durationName: string, durations: NoteDuration[]): NoteDuration =>
		durations.find((d) => d.name === durationName) || durations[2];

	const getStemDirection = (line: number): 'up' | 'down' => (line <= 2 ? 'up' : 'down');

	// Create offset configuration based on scale - SINGLE SOURCE OF TRUTH for all scaling
	const createOffsetConfig = (scale: number) => {
		// scaling function shorthanded to s for regular use (for now)
		const s = (value: number) => value * scale;
		return {
			staffLines: { x: s(0), y: s(0) },
			clef: { x: s(0), y: s(5), fontSize: s(80) },
			timeSignature: {
				x: s(0),
				y: s(0),
				fontSize: s(80),
				numeratorOffset: s(-20),
				denominatorOffset: s(20)
			},
			barlines: { x: s(20), y: s(40), fontSize: s(80) },
			notes: {
				x: s(0),
				y: s(-3),
				fontSize: s(90),
				yOffset: s(5)
			},
			stems: {
				x: s(14),
				y: s(-4),
				fontSize: s(80),
				upOffset: s(-25),
				downOffset: s(0),
				upYOffset: s(70),
				downYOffset: s(5)
			},
			flags: {
				x: s(0),
				y: s(-3),
				fontSize: s(80),
				upYOffset: s(70),
				downYOffset: s(-70),
				yAdjust: s(5)
			},
			ledger: {
				length: s(25)
			},
			labels: {
				x: s(0),
				y: s(0),
				fontSize: s(12),
				durationFontSize: s(10),
				yPosition: s(200),
				durationYPosition: s(215)
			},
			noteAssemblies: { x: s(0), y: s(0) },
			// Additional scaling values used throughout rendering
			spacing: {
				clefX: s(30),
				timeSignatureX: s(120),
				firstBarlineX: s(160),
				noteStartOffset: s(40),
				defaultNoteWidth: s(60),
				finalBarlineOffset: s(40),
				clefYOffset: s(10)
			}
		};
	};

	// SVG creation and staff rendering functions
	const createSVGContainer = (container: HTMLDivElement, config: typeof STAFF_CONFIG) => {
		d3.select(container).selectAll('*').remove();
		const svg = d3
			.select(container)
			.append('svg')
			.attr('width', config.width)
			.attr('height', config.height);
		return svg.append('g');
	};

	const drawStaffLines = (g: any, config: typeof STAFF_CONFIG, offsets: any) => {
		for (let i = 0; i < 5; i++) {
			g.append('line')
				.attr('x1', 0 + offsets.staffLines.x)
				.attr('y1', config.staffTop + i * config.staffLineSpacing + offsets.staffLines.y)
				.attr('x2', config.width + offsets.staffLines.x)
				.attr('y2', config.staffTop + i * config.staffLineSpacing + offsets.staffLines.y)
				.attr('stroke', '#333')
				.attr('stroke-width', 1);
		}
	};

	const drawClef = (g: any, config: typeof STAFF_CONFIG, offsets: any, clefY: number) => {
		g.append('text')
			.attr('class', 'smuFL clef')
			.attr('x', offsets.spacing.clefX + offsets.clef.x)
			.attr('y', clefY + offsets.clef.y)
			.style('font-size', offsets.clef.fontSize + 'px')
			.attr('fill', '#333')
			.attr('text-anchor', 'middle')
			.text(SMuFL.clefs.treble);
	};

	const drawTimeSignature = (g: any, config: typeof STAFF_CONFIG, offsets: any) => {
		const timeSignatureX = offsets.spacing.timeSignatureX;
		const timeSignatureY = config.staffTop + 2 * config.staffLineSpacing;

		// Draw numerator
		g.append('text')
			.attr('class', 'smuFL time-signature')
			.attr('x', timeSignatureX + offsets.timeSignature.x)
			.attr('y', timeSignatureY + offsets.timeSignature.numeratorOffset + offsets.timeSignature.y)
			.style('font-size', offsets.timeSignature.fontSize + 'px')
			.attr('fill', '#333')
			.attr('text-anchor', 'middle')
			.text(SMuFL.timeSignatures[timeSignature.numerator as keyof typeof SMuFL.timeSignatures]);

		// Draw denominator
		g.append('text')
			.attr('class', 'smuFL time-signature')
			.attr('x', timeSignatureX + offsets.timeSignature.x)
			.attr('y', timeSignatureY + offsets.timeSignature.denominatorOffset + offsets.timeSignature.y)
			.style('font-size', offsets.timeSignature.fontSize + 'px')
			.attr('fill', '#333')
			.attr('text-anchor', 'middle')
			.text(SMuFL.timeSignatures[timeSignature.denominator as keyof typeof SMuFL.timeSignatures]);
	};

	const drawBarlines = (g: any, config: typeof STAFF_CONFIG, offsets: any) => {
		const firstBarlineX = offsets.spacing.firstBarlineX;
		const barlineTop = config.staffTop;
		const barlineBottom = config.staffTop + 4 * config.staffLineSpacing;

		// Draw initial barline
		g.append('text')
			.attr('class', 'smuFL barline')
			.attr('x', firstBarlineX)
			.attr('y', config.staffTop + 2 * config.staffLineSpacing + offsets.barlines.y)
			.style('font-size', offsets.barlines.fontSize + 'px')
			.attr('fill', '#333')
			.text(SMuFL.barlines.single);

		// Draw automatic bar lines based on time signature
		barLinePositions.forEach((x) => {
			g.append('text')
				.attr('class', 'smuFL barline auto')
				.attr('x', x)
				.attr('y', config.staffTop + 2 * config.staffLineSpacing + offsets.barlines.y)
				.style('font-size', offsets.barlines.fontSize + 'px')
				.attr('fill', '#333')
				.text(SMuFL.barlines.single);
		});

		return firstBarlineX;
	};

	const renderNotes = (
		g: any,
		notes: typeof processedNotes,
		startX: number,
		config: typeof STAFF_CONFIG,
		offsets: any
	) => {
		let currentX = startX + offsets.spacing.noteStartOffset;

		notes.forEach((note, index) => {
			const y = note.line * config.staffLineSpacing + config.staffTop;
			const noteGroup = g.append('g').attr('class', 'note-group').datum(note);

			// Draw ledger line if needed
			if (note.ledger) {
				const ledgerY = y;
				const ledgerLength = offsets.ledger.length;
				noteGroup
					.append('line')
					.attr('x1', currentX - ledgerLength / 2)
					.attr('y1', ledgerY)
					.attr('x2', currentX + ledgerLength / 2)
					.attr('y2', ledgerY)
					.attr('stroke', '#333')
					.attr('stroke-width', 1);
			}

			// Draw notehead
			noteGroup
				.append('text')
				.attr('class', 'smuFL notehead')
				.attr('x', currentX + offsets.notes.x)
				.attr('y', y + offsets.notes.yOffset + offsets.notes.y)
				.style('font-size', offsets.notes.fontSize + 'px')
				.attr('fill', '#333')
				.attr('text-anchor', 'middle')
				.text(note.durationInfo.notehead);

			// Draw stem if needed
			if (note.durationInfo.needsStem) {
				const stemDirection = getStemDirection(note.line);
				// Stems go on right side for up, left side for down
				const stemX =
					currentX +
					(stemDirection === 'up' ? offsets.stems.upOffset : offsets.stems.downOffset) +
					offsets.stems.x;
				const stemY =
					y +
					(stemDirection === 'up' ? offsets.stems.upYOffset : offsets.stems.downYOffset) +
					offsets.stems.y;
				const stemSymbol = stemDirection === 'up' ? SMuFL.stems.up : SMuFL.stems.down;

				noteGroup
					.append('text')
					.attr('class', 'smuFL stem')
					.attr('x', stemX)
					.attr('y', stemY)
					.style('font-size', offsets.stems.fontSize + 'px')
					.attr('fill', '#333')
					.attr('text-anchor', 'middle')
					.text(stemSymbol);

				// Draw flag if needed
				if (note.durationInfo.needsFlag && note.durationInfo.flagType) {
					// Flags attach to the end of stems
					let flagX: number;
					let flagY: number;
					let flagSymbol: string;

					if (stemDirection === 'down') {
						flagX = stemX + offsets.flags.x;
						flagY = y + offsets.flags.downYOffset + offsets.flags.y;
						flagSymbol =
							SMuFL.flags[(note.durationInfo.flagType + 'Up') as keyof typeof SMuFL.flags];
					} else {
						flagX = stemX + offsets.flags.x;
						flagY = y + offsets.flags.upYOffset + offsets.flags.y;
						flagSymbol =
							SMuFL.flags[(note.durationInfo.flagType + 'Down') as keyof typeof SMuFL.flags];
					}

					noteGroup
						.append('text')
						.attr('class', 'smuFL flag')
						.attr('x', flagX)
						.attr('y', flagY + offsets.flags.yAdjust)
						.style('font-size', offsets.flags.fontSize + 'px')
						.attr('fill', '#333')
						.text(flagSymbol);
				}
			}

			// Add labels if enabled
			if (showLabels) {
				noteGroup
					.append('text')
					.attr('x', currentX)
					.attr('y', offsets.labels.yPosition)
					.attr('text-anchor', 'middle')
					.attr('font-family', 'Arial, sans-serif')
					.style('font-size', offsets.labels.fontSize + 'px')
					.attr('fill', '#666')
					.text(note.name);

				noteGroup
					.append('text')
					.attr('x', currentX)
					.attr('y', offsets.labels.durationYPosition)
					.attr('text-anchor', 'middle')
					.attr('font-family', 'Arial, sans-serif')
					.style('font-size', offsets.labels.durationFontSize + 'px')
					.attr('fill', '#999')
					.text(note.durationInfo.displayName);
			}

			// Add interactions if enabled
			if (interactive) {
				noteGroup
					.style('cursor', 'pointer')
					.on('click', function (event, d) {
						handlePlayNote(d.name, d.durationInfo.duration);
						d3.select(this)
							.selectAll('text')
							.transition()
							.duration(100)
							.attr('fill', '#e74c3c')
							.transition()
							.duration(200)
							.attr('fill', '#333');
					})
					.on('mouseover', function () {
						d3.select(this).selectAll('text').attr('fill', '#3498db');
					})
					.on('mouseout', function () {
						d3.select(this).selectAll('text').attr('fill', '#333');
					});
			}

			currentX +=
				DURATION_CONFIG.widths[note.durationInfo.duration as keyof typeof DURATION_CONFIG.widths] ||
				offsets.spacing.defaultNoteWidth;
		});

		return currentX;
	};

	// Audio functions
	const playNote = async (noteName: string, duration: string = '4n') => {
		if (isPlaying) return;
		isPlaying = true;

		try {
			if (Tone.context.state !== 'running') await Tone.start();
			synth.triggerAttackRelease(noteName, duration);
			dispatch('notePlay', { pitch: noteName, duration });

			setTimeout(
				() => {
					isPlaying = false;
				},
				Tone.Time(duration).toMilliseconds() + 100
			);
		} catch (error) {
			console.error('Error playing note:', error);
			isPlaying = false;
		}
	};

	const playScale = () => {
		if (isPlaying) return;
		isPlaying = true;
		dispatch('scalePlay', { notes: processedNotes });

		let cumulativeDelay = 0;
		processedNotes.forEach((note, index) => {
			setTimeout(async () => {
				try {
					if (Tone.context.state !== 'running') await Tone.start();
					synth.triggerAttackRelease(note.name, note.durationInfo.duration);

					// Visual feedback
					d3.selectAll('.note-group')
						.filter((d: any) => d.name === note.name)
						.selectAll('text')
						.transition()
						.duration(50)
						.attr('fill', '#e74c3c')
						.transition()
						.duration(250)
						.attr('fill', '#333');

					if (index === processedNotes.length - 1) {
						setTimeout(
							() => {
								isPlaying = false;
							},
							Tone.Time(note.durationInfo.duration).toMilliseconds() + 100
						);
					}
				} catch (error) {
					console.error('Error playing scale note:', error);
					isPlaying = false;
				}
			}, cumulativeDelay);
			cumulativeDelay += Tone.Time(note.durationInfo.duration).toMilliseconds() + 100;
		});
	};

	const handlePlayNote = async (noteName: string, duration: string = '4n') => {
		await playNote(noteName, duration);
	};

	// Main rendering function
	const createStaff = () => {
		const g = createSVGContainer(staffContainer, STAFF_CONFIG);
		const offsets = createOffsetConfig(scale);
		const clefY =
			STAFF_CONFIG.staffTop + 2 * STAFF_CONFIG.staffLineSpacing + offsets.spacing.clefYOffset;

		// Draw staff components
		drawStaffLines(g, STAFF_CONFIG, offsets);
		drawClef(g, STAFF_CONFIG, offsets, clefY);
		drawTimeSignature(g, STAFF_CONFIG, offsets);
		const firstBarlineX = drawBarlines(g, STAFF_CONFIG, offsets);

		// Render notes
		const finalX = renderNotes(g, processedNotes, firstBarlineX, STAFF_CONFIG, offsets);

		// Draw final barline
		g.append('text')
			.attr('class', 'smuFL barline final')
			.attr('x', finalX + offsets.spacing.finalBarlineOffset)
			.attr('y', STAFF_CONFIG.staffTop + 2 * STAFF_CONFIG.staffLineSpacing + offsets.barlines.y)
			.style('font-size', offsets.barlines.fontSize + 'px')
			.attr('fill', '#333')
			.text(SMuFL.barlines.final);
	};

	// Initialize component
	onMount(async () => {
		synth = new Tone.Synth().toDestination();
		createStaff();
	});

	// Re-render when props change
	$: if (staffContainer && synth) {
		createStaff();
	}
</script>

{#if title}
	<h2>{title}</h2>
{/if}

{#if description}
	<p>{description}</p>
{/if}

{#if showPlayButton}
	<div class="controls">
		<button on:click={playScale} disabled={isPlaying}>
			{isPlaying ? 'Playing...' : 'Play Scale'}
		</button>
	</div>
{/if}

<div bind:this={staffContainer} class="staff-container"></div>
