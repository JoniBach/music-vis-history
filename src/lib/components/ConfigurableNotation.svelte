<script lang="ts">
	import { onMount } from 'svelte';
	import * as d3 from 'd3';

	// Configuration interface
	export interface NotationConfig {
		stave: {
			lines: number; // 2, 4, 5, etc.
			clef?: 'treble' | 'bass' | 'alto' | 'none';
			width?: number;
		};
		note: {
			type: 'punctum' | 'punctum_deminutum' | 'podatus' | 'clivis' | 'crotchet' | 'minim' | 'semibreve' | 'quaver';
			pitch: string; // e.g., 'C4', 'F4', 'G5'
			position?: 'line' | 'space'; // auto-calculated if not provided
		};
		style?: {
			scale?: number;
			color?: string;
			showPitchLabel?: boolean;
		};
	}

	// Component props
	export let config: NotationConfig;
	export let width: number = 400;
	export let height: number = 200;

	// Internal state
	let container: HTMLDivElement;

	// SMuFL Unicode mappings for different note types
	const SMuFL = {
		// Classical notation
		clefs: {
			treble: '\uE050',
			bass: '\uE062',
			alto: '\uE05C'
		},
		classical: {
			semibreve: '\uE0A2', // whole note
			minim: '\uE0A3',     // half note
			crotchet: '\uE0A4',  // quarter note (black notehead)
			quaver: '\uE0A4'     // eighth note (same notehead, different stem/flag)
		},
		// Medieval/Renaissance notation (Gregorian chant, early polyphony)
		medieval: {
			punctum: '\uE0A4',           // basic note (using black notehead for now)
			punctum_deminutum: '\uE0A3', // half-filled note
			podatus: '\uE0D0',           // ascending two-note neume
			clivis: '\uE0D1',            // descending two-note neume
			scandicus: '\uE0D2',         // three ascending notes
			climacus: '\uE0D3'           // three descending notes
		},
		stems: {
			up: '\uE210',
			down: '\uE210'
		},
		flags: {
			eighthUp: '\uE240',
			eighthDown: '\uE241'
		}
	};

	// Pitch to staff position mapping
	const getPitchPosition = (pitch: string, staveLines: number): { line: number; needsLedger: boolean; ledgerType: 'above' | 'below' | null } => {
		// Parse pitch (e.g., 'C4', 'F#5')
		const match = pitch.match(/^([A-G][#b]?)(\d+)$/);
		if (!match) throw new Error(`Invalid pitch format: ${pitch}`);
		
		const [, noteName, octave] = match;
		const octaveNum = parseInt(octave);
		
		// Convert to MIDI note number for easier calculation
		const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
		const baseNote = noteName.replace(/[#b]/, '');
		let noteIndex = noteNames.indexOf(baseNote);
		
		// Adjust for sharps/flats
		if (noteName.includes('#')) noteIndex += 1;
		if (noteName.includes('b')) noteIndex -= 1;
		
		const midiNote = (octaveNum + 1) * 12 + noteIndex;
		
		// Calculate position relative to middle C (C4 = MIDI 60)
		const middleC = 60; // C4
		const semitonesFromMiddleC = midiNote - middleC;
		
		// Convert to staff position (each line/space = 1 semitone in simplified model)
		// For 5-line staff: line 0 = E4, line 1 = G4, line 2 = B4, line 3 = D5, line 4 = F5
		// Middle C (C4) would be below the staff
		
		let staffPosition: number;
		let needsLedger = false;
		let ledgerType: 'above' | 'below' | null = null;
		
		if (staveLines === 5) {
			// Traditional 5-line staff positioning
			// E4 is line 0, G4 is line 1, etc.
			const e4Position = 4; // E4 is 4 semitones above C4
			staffPosition = (semitonesFromMiddleC - e4Position) / 2;
			
			if (staffPosition < 0) {
				needsLedger = true;
				ledgerType = 'below';
			} else if (staffPosition >= staveLines) {
				needsLedger = true;
				ledgerType = 'above';
			}
		} else if (staveLines === 4) {
			// 4-line staff (common in medieval music)
			// F4 is line 0
			const f4Position = 5; // F4 is 5 semitones above C4
			staffPosition = (semitonesFromMiddleC - f4Position) / 2;
			
			if (staffPosition < 0) {
				needsLedger = true;
				ledgerType = 'below';
			} else if (staffPosition >= staveLines) {
				needsLedger = true;
				ledgerType = 'above';
			}
		} else if (staveLines === 2) {
			// 2-line staff (simple medieval notation)
			// G4 is line 0
			const g4Position = 7; // G4 is 7 semitones above C4
			staffPosition = (semitonesFromMiddleC - g4Position) / 2;
			
			if (staffPosition < 0) {
				needsLedger = true;
				ledgerType = 'below';
			} else if (staffPosition >= staveLines) {
				needsLedger = true;
				ledgerType = 'above';
			}
		} else {
			// Default positioning for other stave types
			staffPosition = semitonesFromMiddleC / 2;
		}
		
		return {
			line: Math.round(staffPosition),
			needsLedger,
			ledgerType
		};
	};

	// Get the appropriate glyph for the note type
	const getNoteGlyph = (noteType: string): string => {
		if (noteType in SMuFL.classical) {
			return SMuFL.classical[noteType as keyof typeof SMuFL.classical];
		} else if (noteType in SMuFL.medieval) {
			return SMuFL.medieval[noteType as keyof typeof SMuFL.medieval];
		}
		return SMuFL.classical.crotchet; // fallback
	};

	// Check if note needs stem
	const needsStem = (noteType: string): boolean => {
		return ['crotchet', 'minim', 'quaver'].includes(noteType);
	};

	// Check if note needs flag
	const needsFlag = (noteType: string): boolean => {
		return ['quaver'].includes(noteType);
	};

	// Main rendering function
	const renderNotation = () => {
		if (!container) return;

		// Clear previous content
		d3.select(container).selectAll('*').remove();

		const scale = config.style?.scale || 1;
		const color = config.style?.color || '#333';
		const lineSpacing = 20 * scale;
		const staffTop = 40 * scale;
		const staffWidth = config.stave.width || (width * 0.8);
		const staffLeft = (width - staffWidth) / 2;

		// Create SVG
		const svg = d3.select(container)
			.append('svg')
			.attr('width', width)
			.attr('height', height)
			.style('font-family', 'Bravura, serif');

		const g = svg.append('g');

		// Draw staff lines
		for (let i = 0; i < config.stave.lines; i++) {
			const y = staffTop + i * lineSpacing;
			g.append('line')
				.attr('x1', staffLeft)
				.attr('x2', staffLeft + staffWidth)
				.attr('y1', y)
				.attr('y2', y)
				.attr('stroke', color)
				.attr('stroke-width', 1.5 * scale);
		}

		// Draw clef if specified
		if (config.stave.clef && config.stave.clef !== 'none') {
			const clefGlyph = SMuFL.clefs[config.stave.clef];
			const clefY = staffTop + (config.stave.lines - 1) * lineSpacing / 2;
			
			g.append('text')
				.attr('class', 'smufl-clef')
				.attr('x', staffLeft + 20 * scale)
				.attr('y', clefY + 5 * scale)
				.style('font-size', (60 * scale) + 'px')
				.attr('fill', color)
				.attr('text-anchor', 'middle')
				.text(clefGlyph);
		}

		// Calculate note position
		const position = getPitchPosition(config.note.pitch, config.stave.lines);
		const noteX = staffLeft + staffWidth / 2;
		const noteY = staffTop + (config.stave.lines - 1 - position.line) * lineSpacing;

		// Draw ledger lines if needed
		if (position.needsLedger) {
			const ledgerLength = 30 * scale;
			const ledgerX1 = noteX - ledgerLength / 2;
			const ledgerX2 = noteX + ledgerLength / 2;
			
			if (position.ledgerType === 'below') {
				// Draw ledger lines below staff
				const linesNeeded = Math.ceil(Math.abs(position.line) / 2);
				for (let i = 1; i <= linesNeeded; i++) {
					const ledgerY = staffTop + config.stave.lines * lineSpacing + (i - 1) * lineSpacing;
					g.append('line')
						.attr('x1', ledgerX1)
						.attr('x2', ledgerX2)
						.attr('y1', ledgerY)
						.attr('y2', ledgerY)
						.attr('stroke', color)
						.attr('stroke-width', 1.5 * scale);
				}
			} else if (position.ledgerType === 'above') {
				// Draw ledger lines above staff
				const linesNeeded = Math.ceil((position.line - config.stave.lines + 1) / 2);
				for (let i = 1; i <= linesNeeded; i++) {
					const ledgerY = staffTop - i * lineSpacing;
					g.append('line')
						.attr('x1', ledgerX1)
						.attr('x2', ledgerX2)
						.attr('y1', ledgerY)
						.attr('y2', ledgerY)
						.attr('stroke', color)
						.attr('stroke-width', 1.5 * scale);
				}
			}
		}

		// Draw the note
		const noteGlyph = getNoteGlyph(config.note.type);
		const noteGroup = g.append('g').attr('class', 'note-group');
		
		// Draw notehead
		noteGroup.append('text')
			.attr('class', 'smufl-note')
			.attr('x', noteX)
			.attr('y', noteY + 5 * scale)
			.style('font-size', (40 * scale) + 'px')
			.attr('fill', color)
			.attr('text-anchor', 'middle')
			.text(noteGlyph);

		// Draw stem if needed
		if (needsStem(config.note.type)) {
			const stemDirection = position.line < config.stave.lines / 2 ? 'up' : 'down';
			const stemHeight = 35 * scale;
			const stemX = noteX + (stemDirection === 'up' ? 8 * scale : -8 * scale);
			const stemY1 = noteY;
			const stemY2 = stemDirection === 'up' ? noteY - stemHeight : noteY + stemHeight;
			
			noteGroup.append('line')
				.attr('x1', stemX)
				.attr('x2', stemX)
				.attr('y1', stemY1)
				.attr('y2', stemY2)
				.attr('stroke', color)
				.attr('stroke-width', 2 * scale);

			// Draw flag if needed
			if (needsFlag(config.note.type)) {
				const flagGlyph = stemDirection === 'up' ? SMuFL.flags.eighthUp : SMuFL.flags.eighthDown;
				noteGroup.append('text')
					.attr('class', 'smufl-flag')
					.attr('x', stemX)
					.attr('y', stemY2 + (stemDirection === 'up' ? 5 * scale : -5 * scale))
					.style('font-size', (30 * scale) + 'px')
					.attr('fill', color)
					.attr('text-anchor', 'middle')
					.text(flagGlyph);
			}
		}

		// Draw pitch label if requested
		if (config.style?.showPitchLabel) {
			g.append('text')
				.attr('x', noteX)
				.attr('y', staffTop + config.stave.lines * lineSpacing + 30 * scale)
				.style('font-size', (14 * scale) + 'px')
				.style('font-family', 'system-ui, sans-serif')
				.attr('fill', color)
				.attr('text-anchor', 'middle')
				.text(config.note.pitch);
		}
	};

	// Reactive rendering
	$: if (container && config) {
		renderNotation();
	}

	onMount(() => {
		renderNotation();
	});
</script>

<div bind:this={container} class="notation-container"></div>

<style>
	.notation-container {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	:global(.smufl-clef),
	:global(.smufl-note),
	:global(.smufl-flag) {
		font-family: 'Bravura', serif;
	}
</style>
