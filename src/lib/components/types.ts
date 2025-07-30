// Types for the StaffNotation component

export interface NoteData {
	pitch: string;
	duration: string;
}

export interface TimeSignature {
	numerator: number;
	denominator: number;
}

export type ClefType = 'treble' | 'bass' | 'alto';

export interface StaffNotationConfig {
	notes?: NoteData[];
	clef?: ClefType;
	timeSignature?: TimeSignature;
	scale?: number;
	width?: number;
	height?: number;
	showLabels?: boolean;
	showPlayButton?: boolean;
	interactive?: boolean;
	title?: string;
	description?: string;
}

export interface StaffNotationEvents {
	notePlay: { pitch: string; duration: string };
	scalePlay: { notes: Array<{ name: string; durationInfo: any }> };
}
