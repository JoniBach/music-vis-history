<!-- | Medieval           | ~1000–1200 CE    | Staff Notation                | Place notes on lines to fix pitch          | Guido of Arezzo           | Italy               | [Musical notation](https://en.wikipedia.org/wiki/Musical_notation) | -->

<script lang="ts">
	import { onMount } from 'svelte';
	import * as d3 from 'd3';
	import * as Tone from 'tone';

	let staffContainer: HTMLDivElement;
	let synth: Tone.Synth;
	let isPlaying = false;

	// SMuFL Glyph definitions based on official tables
	const SMuFL = {
		// 4.5. Clefs
		clefs: {
			treble: '\uE050', // trebleClef
			bass: '\uE062', // bassClef
			alto: '\uE05C' // cClef
		},

		// 4.7. Noteheads
		noteheads: {
			whole: '\uE0A2', // noteheadWhole
			half: '\uE0A3', // noteheadHalf
			black: '\uE0A4', // noteheadBlack
			void: '\uE0A3' // noteheadHalf (for half notes)
		},

		// 4.15. Stems
		stems: {
			up: '\uE210', // stemUp
			down: '\uE211' // stemDown
		},

		// 4.17. Flags
		flags: {
			eighthUp: '\uE240', // flag8thUp
			eighthDown: '\uE241', // flag8thDown
			sixteenthUp: '\uE242', // flag16thUp
			sixteenthDown: '\uE243' // flag16thDown
		},

		// 4.3. Barlines
		barlines: {
			single: '\uE030', // barlineSingle
			double: '\uE031', // barlineDouble
			final: '\uE032' // barlineFinal
		},

		// 4.41. Rests
		rests: {
			whole: '\uE4E1', // restWhole
			half: '\uE4E2', // restHalf
			quarter: '\uE4E5', // restQuarter
			eighth: '\uE4E6' // rest8th
		},

		// 4.18. Standard accidentals
		accidentals: {
			sharp: '\uE262', // accidentalSharp
			flat: '\uE260', // accidentalFlat
			natural: '\uE261', // accidentalNatural
			doubleSharp: '\uE263', // accidentalDoubleSharp
			doubleFlat: '\uE264' // accidentalDoubleFlat
		},

		// 4.19. Time signatures
		timeSignatures: {
			// Numbers 0-9 for time signatures
			0: '\uE080', // timeSig0
			1: '\uE081', // timeSig1
			2: '\uE082', // timeSig2
			3: '\uE083', // timeSig3
			4: '\uE084', // timeSig4
			5: '\uE085', // timeSig5
			6: '\uE086', // timeSig6
			7: '\uE087', // timeSig7
			8: '\uE088', // timeSig8
			9: '\uE089', // timeSig9
			// Common time signatures
			commonTime: '\uE08A', // timeSigCommon (C)
			cutTime: '\uE08B' // timeSigCutCommon (cut C)
		}
	};

	// Note duration types with proper SMuFL components
	type NoteDuration = {
		name: string;
		notehead: string;
		needsStem: boolean;
		needsFlag: boolean;
		flagType?: string;
		duration: string; // Tone.js duration format
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

	// Musical notes to display on the staff with varying durations
	const noteData = [
		{ pitch: 'C4', duration: 'minim' },
		{ pitch: 'D4', duration: 'crotchet' },
		{ pitch: 'E4', duration: 'crotchet' },
		{ pitch: 'F4', duration: 'crotchet' },
		{ pitch: 'G4', duration: 'crotchet' },
		{ pitch: 'A4', duration: 'crotchet' },
		{ pitch: 'B4', duration: 'crotchet' },
		{ pitch: 'C5', duration: 'minim' },

		// reverse
		{ pitch: 'B4', duration: 'semi quaver' },
		{ pitch: 'A4', duration: 'semi quaver' },
		{ pitch: 'G4', duration: 'semi quaver' },
		{ pitch: 'F4', duration: 'semi quaver' },
		{ pitch: 'E4', duration: 'semi quaver' },
		{ pitch: 'D4', duration: 'semi quaver' },
		{ pitch: 'C4', duration: 'semibreve' }
	];

	// Pure function to calculate staff position for a note in treble clef
	const getStaffPosition = (noteName: string): { line: number; ledger: boolean } => {
		const staffPositions: Record<string, { line: number; ledger: boolean }> = {
			C4: { line: 5, ledger: true },
			D4: { line: 4.5, ledger: false },
			E4: { line: 4, ledger: false },
			F4: { line: 3.5, ledger: false },
			G4: { line: 3, ledger: false },
			A4: { line: 2.5, ledger: false },
			B4: { line: 2, ledger: false },
			C5: { line: 1.5, ledger: false },
			D5: { line: 1, ledger: false },
			E5: { line: 0.5, ledger: false },
			F5: { line: 0, ledger: false },
			G5: { line: -0.5, ledger: false },
			A5: { line: -1, ledger: true }
		};
		return staffPositions[noteName] || { line: 0, ledger: false };
	};

	// Pure function to get duration info by name
	const getDurationInfo = (durationName: string, durations: NoteDuration[]): NoteDuration =>
		durations.find((d) => d.name === durationName) || durations[2];

	// Pure function to determine stem direction
	const getStemDirection = (line: number): 'up' | 'down' => (line <= 2 ? 'down' : 'up');

	// Pure function to generate notes with positions and durations
	const generateNotes = (
		noteData: Array<{ pitch: string; duration: string }>,
		durations: NoteDuration[]
	) =>
		noteData.map((note) => {
			const position = getStaffPosition(note.pitch);
			const durationInfo = getDurationInfo(note.duration, durations);
			return { name: note.pitch, line: position.line, ledger: position.ledger, durationInfo };
		});

	// Pure function to group notes into measures
	const groupNotesIntoMeasures = (
		notes: ReturnType<typeof generateNotes>,
		staffConfig: typeof STAFF_CONFIG,
		durationConfig: typeof DURATION_CONFIG
	) => {
		const measures: Array<{ notes: typeof notes; totalBeats: number; width: number }> = [];
		let currentMeasure: typeof notes = [];
		let currentBeats = 0;

		notes.forEach((note) => {
			const noteBeats =
				durationConfig.beats[note.durationInfo.duration as keyof typeof durationConfig.beats] ||
				1.0;

			if (currentBeats + noteBeats > staffConfig.beatsPerMeasure && currentMeasure.length > 0) {
				const measureContentWidth = currentMeasure.reduce(
					(width, measureNote) =>
						width +
						(durationConfig.widths[
							measureNote.durationInfo.duration as keyof typeof durationConfig.widths
						] || 60),
					0
				);
				const measureWidth =
					measureContentWidth + staffConfig.startPadding + staffConfig.endPadding;

				measures.push({
					notes: [...currentMeasure],
					totalBeats: currentBeats,
					width: measureWidth
				});
				currentMeasure = [note];
				currentBeats = noteBeats;
			} else {
				currentMeasure.push(note);
				currentBeats += noteBeats;
			}
		});

		if (currentMeasure.length > 0) {
			const measureContentWidth = currentMeasure.reduce(
				(width, measureNote) =>
					width +
					(durationConfig.widths[
						measureNote.durationInfo.duration as keyof typeof durationConfig.widths
					] || 60),
				0
			);
			const measureWidth = measureContentWidth + staffConfig.startPadding + staffConfig.endPadding;
			measures.push({ notes: [...currentMeasure], totalBeats: currentBeats, width: measureWidth });
		}
		return measures;
	};

	// Pure function to draw staff lines
	const drawStaffLines = (g: any, config: typeof STAFF_CONFIG, offsets: any) => {
		for (let i = 0; i < 5; i++) {
			g.append('line')
				.attr('x1', 0 + offsets.staffLines.x)
				.attr('x2', config.width + offsets.staffLines.x)
				.attr('y1', i * config.staffLineSpacing + config.staffTop + offsets.staffLines.y)
				.attr('y2', i * config.staffLineSpacing + config.staffTop + offsets.staffLines.y)
				.attr('stroke', '#333')
				.attr('stroke-width', offsets.staffLines.strokeWidth);
		}
	};

	// Pure function to draw clef
	const drawClef = (g: any, config: typeof STAFF_CONFIG, offsets: any, clefY: number) => {
		g.append('text')
			.attr('class', 'smuFL clef')
			.attr('x', 30 + offsets.clef.x)
			.attr('y', clefY + offsets.clef.y)
			.attr('font-size', offsets.clef.fontSize + 'px')
			.attr('fill', '#333')
			.text(SMuFL.clefs.treble);
	};

	// Pure function to draw time signature
	const drawTimeSignature = (g: any, config: typeof STAFF_CONFIG, offsets: any) => {
		const timeSignatureX = 120;
		const timeSignatureY = config.staffTop + 2 * config.staffLineSpacing;

		g.append('text')
			.attr('class', 'smuFL time-signature numerator')
			.attr('x', timeSignatureX + offsets.timeSignature.x)
			.attr('y', timeSignatureY + offsets.timeSignature.y + offsets.timeSignature.numeratorY)
			.attr('font-size', offsets.timeSignature.fontSize + 'px')
			.attr('fill', '#333')
			.attr('text-anchor', 'middle')
			.text(SMuFL.timeSignatures[4]);

		g.append('text')
			.attr('class', 'smuFL time-signature denominator')
			.attr('x', timeSignatureX + offsets.timeSignature.x)
			.attr('y', timeSignatureY + offsets.timeSignature.y + offsets.timeSignature.denominatorY)
			.attr('font-size', offsets.timeSignature.fontSize + 'px')
			.attr('fill', '#333')
			.attr('text-anchor', 'middle')
			.text(SMuFL.timeSignatures[4]);
	};

	// Pure function to draw barlines
	const drawBarlines = (g: any, config: typeof STAFF_CONFIG, offsets: any) => {
		const firstBarlineX = 160;
		const barlineTop = config.staffTop;
		const barlineBottom = config.staffTop + 4 * config.staffLineSpacing;

		g.append('text')
			.attr('class', 'smuFL barline first')
			.attr('x', firstBarlineX + offsets.barlines.x)
			.attr('y', config.staffTop + 2 * config.staffLineSpacing + offsets.barlines.y)
			.attr('font-size', offsets.barlines.fontSize + 'px')
			.attr('fill', '#333')
			.attr('text-anchor', 'middle')
			.text(SMuFL.barlines.single);

		return firstBarlineX;
	};

	// Pure function to draw titles
	const drawTitles = (g: any, config: typeof STAFF_CONFIG) => {
		g.append('text')
			.attr('x', config.width / 2)
			.attr('y', -20)
			.attr('text-anchor', 'middle')
			.attr('font-family', 'Arial, sans-serif')
			.attr('font-size', '16px')
			.attr('font-weight', 'bold')
			.attr('fill', '#333')
			.text('Interactive Musical Staff - Click notes to play');

		g.append('text')
			.attr('x', config.width / 2)
			.attr('y', -40)
			.attr('text-anchor', 'middle')
			.attr('font-family', 'Arial, sans-serif')
			.attr('font-size', '14px')
			.attr('fill', '#666')
			.text(
				'Staff notation, developed by Guido of Arezzo around 1000-1200 CE, revolutionized music by placing notes on lines to fix pitch.'
			);
	};

	// Pure function to draw ledger line for a note
	const drawLedgerLine = (g: any, x: number, y: number, offsets: any) => {
		g.append('line')
			.attr('x1', x - 15 + offsets.ledgerLines.x)
			.attr('x2', x + 15 + offsets.ledgerLines.x)
			.attr('y1', y + offsets.ledgerLines.y)
			.attr('y2', y + offsets.ledgerLines.y)
			.attr('stroke', '#333')
			.attr('stroke-width', offsets.ledgerLines.strokeWidth);
	};

	// Pure function to draw note stem
	const drawNoteStem = (
		noteGroup: any,
		x: number,
		y: number,
		stemDirection: 'up' | 'down',
		offsets: any,
		noteXOffset: number,
		noteYOffset: number
	) => {
		const stemX =
			stemDirection === 'up'
				? x + noteXOffset + offsets.stems.x + offsets.noteAssemblies.x
				: x - noteXOffset + offsets.stems.x + offsets.noteAssemblies.x;
		const stemY = y + noteYOffset + offsets.stems.y + offsets.noteAssemblies.y;
		const stemLength = offsets.stems.length;
		const stemStartY = stemDirection === 'up' ? stemY : stemY;
		const stemEndY = stemDirection === 'up' ? stemY - stemLength : stemY + stemLength;

		noteGroup
			.append('line')
			.attr('class', 'stem')
			.attr('x1', stemX)
			.attr('y1', stemStartY)
			.attr('x2', stemX)
			.attr('y2', stemEndY)
			.attr('stroke', '#333')
			.attr('stroke-width', offsets.stems.strokeWidth);

		return { stemX, stemY, stemLength };
	};

	// Pure function to draw note flag
	const drawNoteFlag = (
		noteGroup: any,
		x: number,
		y: number,
		stemDirection: 'up' | 'down',
		flagType: string,
		stemLength: number,
		offsets: any,
		noteXOffset: number,
		noteYOffset: number
	) => {
		const flagX =
			stemDirection === 'up'
				? x + noteXOffset + offsets.flags.x + offsets.noteAssemblies.x
				: x - noteXOffset + offsets.flags.x + offsets.noteAssemblies.x;
		const flagY =
			stemDirection === 'up'
				? y - stemLength + noteYOffset + offsets.flags.y + offsets.noteAssemblies.y
				: y + stemLength + noteYOffset + offsets.flags.y + offsets.noteAssemblies.y;
		const flagSymbol =
			stemDirection === 'up'
				? SMuFL.flags[(flagType + 'Up') as keyof typeof SMuFL.flags]
				: SMuFL.flags[(flagType + 'Down') as keyof typeof SMuFL.flags];

		noteGroup
			.append('text')
			.attr('class', 'smuFL flag')
			.attr('x', flagX)
			.attr('y', flagY)
			.attr('font-size', offsets.flags.fontSize + 'px')
			.attr('fill', '#333')
			.text(flagSymbol);
	};

	// Pure function to draw note labels
	const drawNoteLabels = (
		g: any,
		x: number,
		noteName: string,
		durationDisplayName: string,
		offsets: any
	) => {
		g.append('text')
			.attr('x', x + offsets.labels.x + offsets.noteAssemblies.x)
			.attr('y', 200 + offsets.labels.y + offsets.noteAssemblies.y)
			.attr('text-anchor', 'middle')
			.attr('font-family', 'Arial, sans-serif')
			.attr('font-size', offsets.labels.fontSize + 'px')
			.attr('fill', '#666')
			.text(noteName);

		g.append('text')
			.attr('x', x + offsets.labels.x + offsets.noteAssemblies.x)
			.attr('y', 215 + offsets.labels.y + offsets.noteAssemblies.y)
			.attr('text-anchor', 'middle')
			.attr('font-family', 'Arial, sans-serif')
			.attr('font-size', offsets.labels.durationFontSize + 'px')
			.attr('fill', '#999')
			.text(durationDisplayName);
	};

	// Pure function to add note interactions
	const addNoteInteractions = (noteGroup: any, handlePlayNote: Function) => {
		noteGroup.on('click', function (this: any, event: any, d: any) {
			handlePlayNote(d.name, d.durationInfo.duration);
			d3.select(this)
				.selectAll('text')
				.transition()
				.duration(100)
				.attr('fill', '#e74c3c')
				.transition()
				.duration(200)
				.attr('fill', '#333');
		});

		noteGroup
			.on('mouseover', function (this: any) {
				d3.select(this).selectAll('text').attr('fill', '#3498db');
				d3.select(this).select('.notehead').attr('font-size', '32px');
			})
			.on('mouseout', function (this: any) {
				d3.select(this).selectAll('text').attr('fill', '#333');
				d3.select(this).select('.notehead').attr('font-size', '30px');
			});
	};

	// Pure function to render a single note
	const renderNote = (
		g: any,
		note: any,
		x: number,
		config: typeof STAFF_CONFIG,
		offsets: any,
		noteXOffset: number,
		noteYOffset: number,
		handlePlayNote: Function
	) => {
		const y = note.line * config.staffLineSpacing + config.staffTop;

		// Draw ledger line if needed
		if (note.ledger) {
			drawLedgerLine(g, x, y, offsets);
		}

		// Create note group
		const noteGroup = g
			.append('g')
			.attr('class', 'note-group')
			.attr('cursor', 'pointer')
			.datum(note);

		// Add notehead
		noteGroup
			.append('text')
			.attr('class', 'smuFL notehead')
			.attr('x', x - noteXOffset + offsets.notes.x + offsets.noteAssemblies.x)
			.attr('y', y + noteYOffset + offsets.notes.y + offsets.noteAssemblies.y)
			.attr('font-size', offsets.notes.fontSize + 'px')
			.attr('fill', '#333')
			.text(note.durationInfo.notehead);

		// Add stem if needed
		if (note.durationInfo.needsStem) {
			const stemDirection = getStemDirection(note.line);
			const { stemLength } = drawNoteStem(
				noteGroup,
				x,
				y,
				stemDirection,
				offsets,
				noteXOffset,
				noteYOffset
			);

			// Add flag if needed
			if (note.durationInfo.needsFlag && note.durationInfo.flagType) {
				drawNoteFlag(
					noteGroup,
					x,
					y,
					stemDirection,
					note.durationInfo.flagType,
					stemLength,
					offsets,
					noteXOffset,
					noteYOffset
				);
			}
		}

		// Add labels
		drawNoteLabels(g, x, note.name, note.durationInfo.displayName, offsets);

		// Add interactions
		addNoteInteractions(noteGroup, handlePlayNote);
	};

	// Pure function to draw measure barline
	const drawMeasureBarline = (g: any, x: number, config: typeof STAFF_CONFIG, offsets: any) => {
		g.append('text')
			.attr('class', 'smuFL barline')
			.attr('x', x + offsets.barlines.x)
			.attr('y', config.staffTop + 2 * config.staffLineSpacing + offsets.barlines.y)
			.attr('font-size', offsets.barlines.fontSize + 'px')
			.attr('fill', '#333')
			.attr('text-anchor', 'middle')
			.text(SMuFL.barlines.single);
	};

	// Pure function to render measures
	const renderMeasures = (
		g: any,
		measures: any[],
		firstBarlineX: number,
		config: typeof STAFF_CONFIG,
		durationConfig: typeof DURATION_CONFIG,
		offsets: any,
		noteXOffset: number,
		noteYOffset: number,
		handlePlayNote: Function
	) => {
		let cumulativeX = firstBarlineX;

		measures.forEach(
			(
				measure: { notes: typeof notes; totalBeats: number; width: number },
				measureIndex: number
			) => {
				const measureStartX = cumulativeX;

				// Draw barline at start of measure (except first)
				if (measureIndex > 0) {
					drawMeasureBarline(g, measureStartX, config, offsets);
				}

				// Position notes within this measure
				let noteX = measureStartX + config.startPadding;

				measure.notes.forEach((note: (typeof notes)[0]) => {
					const noteReservedWidth =
						durationConfig.widths[
							note.durationInfo.duration as keyof typeof durationConfig.widths
						] || 60;
					renderNote(g, note, noteX, config, offsets, noteXOffset, noteYOffset, handlePlayNote);
					noteX += noteReservedWidth;
				});

				cumulativeX = measureStartX + measure.width;
			}
		);

		return cumulativeX;
	};

	const notes = generateNotes(noteData, noteDurations);

	onMount(async () => {
		// Initialize Tone.js synthesizer
		synth = new Tone.Synth().toDestination();

		// Create the musical staff
		createStaff();
	});

	// Configuration constants
	const STAFF_CONFIG = {
		margin: { top: 50, right: 50, bottom: 50, left: 100 },
		width: 1300,
		height: 200,
		staffLineSpacing: 18,
		staffTop: 50,
		beatsPerMeasure: 4,
		barPadding: 30,
		startPadding: 30,
		endPadding: 7.5
	} as const;

	const DURATION_CONFIG = {
		beats: { '1n': 4.0, '2n': 2.0, '4n': 1.0, '8n': 0.5, '16n': 0.25 },
		widths: { '1n': 120, '2n': 80, '4n': 60, '8n': 50, '16n': 40 }
	} as const;

	// Pure function to create SVG container
	const createSVGContainer = (container: HTMLElement, config: typeof STAFF_CONFIG) => {
		d3.select(container).selectAll('*').remove();
		const svg = d3
			.select(container)
			.append('svg')
			.attr('width', config.width + config.margin.left + config.margin.right)
			.attr('height', config.height + config.margin.top + config.margin.bottom);
		return svg
			.append('g')
			.attr('transform', `translate(${config.margin.left},${config.margin.top})`);
	};

	// Pure function to create offset configuration
	const createOffsetConfig = () => ({
		staffLines: { x: 0, y: 0, strokeWidth: 1.5 },
		ledgerLines: { x: 0, y: 0, strokeWidth: 1.5 },
		clef: { x: -10, y: 10, fontSize: 60 },
		timeSignature: { x: 0, y: 0, fontSize: 32, numeratorY: -18, denominatorY: 18 },
		barlines: { x: 0, y: 35, fontSize: 60 },
		notes: { x: 0, y: 0, fontSize: 30 },
		stems: { x: 0, y: 0, length: 60, strokeWidth: 2.5 },
		flags: { x: 0, y: 0, fontSize: 24 },
		labels: { x: 0, y: 0, fontSize: 12, durationFontSize: 10 },
		noteAssemblies: { x: 0, y: 0 }
	});

	function createStaff() {
		const g = createSVGContainer(staffContainer, STAFF_CONFIG);
		const { width, staffLineSpacing, staffTop } = STAFF_CONFIG;
		const noteYOffset = 0;
		const noteXOffset = 10;
		const clefY = staffTop + 2 * staffLineSpacing + 10;
		const offsets = createOffsetConfig();

		// Draw all staff components using pure functions
		drawStaffLines(g, STAFF_CONFIG, offsets);
		drawClef(g, STAFF_CONFIG, offsets, clefY);
		drawTimeSignature(g, STAFF_CONFIG, offsets);
		const firstBarlineX = drawBarlines(g, STAFF_CONFIG, offsets);

		// Group notes into measures and render them
		const measures = groupNotesIntoMeasures(notes, STAFF_CONFIG, DURATION_CONFIG);
		const finalBarlineX = renderMeasures(
			g,
			measures,
			firstBarlineX,
			STAFF_CONFIG,
			DURATION_CONFIG,
			offsets,
			noteXOffset,
			noteYOffset,
			handlePlayNote
		);

		// Update final barline position and draw titles
		g.selectAll('.barline.final').attr('x', finalBarlineX + 15 + offsets.barlines.x);
		drawTitles(g, STAFF_CONFIG);
	}

	// Pure function to calculate note duration in milliseconds
	const getNoteDurationMs = (duration: string): number => Tone.Time(duration).toMilliseconds();

	// Pure function to create visual feedback for note playing
	const createNoteVisualFeedback = (noteName: string) => {
		d3.selectAll('.note-group')
			.filter((d: any) => d.name === noteName)
			.selectAll('text')
			.transition()
			.duration(50)
			.attr('fill', '#e74c3c')
			.transition()
			.duration(250)
			.attr('fill', '#333');
	};

	// Audio playback functions with reduced external dependencies
	const playNote = async (
		noteName: string,
		duration: string = '4n',
		synthesizer: Tone.Synth,
		playingState: { isPlaying: boolean }
	) => {
		if (playingState.isPlaying) return;
		playingState.isPlaying = true;

		try {
			if (Tone.context.state !== 'running') await Tone.start();
			synthesizer.triggerAttackRelease(noteName, duration);
			setTimeout(
				() => {
					playingState.isPlaying = false;
				},
				getNoteDurationMs(duration) + 100
			);
		} catch (error) {
			console.error('Error playing note:', error);
			playingState.isPlaying = false;
		}
	};

	const playScale = (
		noteList: typeof notes,
		synthesizer: Tone.Synth,
		playingState: { isPlaying: boolean }
	) => {
		if (playingState.isPlaying) return;
		playingState.isPlaying = true;

		let cumulativeDelay = 0;
		noteList.forEach((note, index) => {
			setTimeout(async () => {
				try {
					if (Tone.context.state !== 'running') await Tone.start();
					synthesizer.triggerAttackRelease(note.name, note.durationInfo.duration);
					createNoteVisualFeedback(note.name);

					if (index === noteList.length - 1) {
						setTimeout(
							() => {
								playingState.isPlaying = false;
							},
							getNoteDurationMs(note.durationInfo.duration) + 100
						);
					}
				} catch (error) {
					console.error('Error playing scale note:', error);
					playingState.isPlaying = false;
				}
			}, cumulativeDelay);
			cumulativeDelay += getNoteDurationMs(note.durationInfo.duration) + 100;
		});
	};

	// Wrapper functions that use component state
	const handlePlayNote = async (noteName: string, duration: string = '4n') => {
		if (isPlaying) return;
		isPlaying = true;
		await playNote(noteName, duration, synth, { isPlaying: false });
		isPlaying = false;
	};

	const handlePlayScale = () => {
		if (isPlaying) return;
		playScale(notes, synth, { isPlaying });
	};
</script>

<h1>Staff Notation</h1>

<p>
	Staff notation, developed by Guido of Arezzo around 1000-1200 CE, revolutionized music by placing
	notes on lines to fix pitch. This system allowed for precise notation of melody and became the
	foundation of Western musical notation.
</p>

<button on:click={handlePlayScale} disabled={isPlaying}>
	{isPlaying ? 'Playing...' : 'Play Scale'}
</button>

<div bind:this={staffContainer}></div>
