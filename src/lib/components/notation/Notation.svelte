<script lang="ts">
	import Note from './Note.svelte';

	type NoteType = {
		note: string;
		type: string;
		duration: string;
		y?: number;
		pitch?: string;
	};

	export let notes: NoteType[];
	export let staff: string;
	export let fontSize: number = 70; // Default font size, can be overridden by parent
	export let title: string;
	export let subtitle: string;
	export let variant: string;
	export let data: {
		ranges: Record<
			string,
			{
				glyphs: string[];
				range_start: string;
			}
		>;
		metadata?: {
			glyphAdvanceWidths?: Record<string, number>;
		};
	} | null = null;
</script>

<div class="sheet-music">
	<div class="title">
		<h2>{title}</h2>
		<h3>{subtitle}</h3>
	</div>
	<div class="smuFL score" style="font-size: {fontSize}px;">
		{#each notes as note}
			<Note {note} {data} {staff} {fontSize} {variant} />
		{/each}
	</div>
</div>

<style>
	.sheet-music {
		display: flex;
		flex-direction: column;
		margin: 1rem;
		padding: 1rem;
		border-radius: 5px;
		box-shadow:
			rgba(0, 0, 0, 0.1) 0px 0px 5px 0px,
			rgba(0, 0, 0, 0.1) 0px 0px 1px 0px;
		background-color: #f5f5f5; /* eggshell */
	}

	.score {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
	}

	.title {
		display: flex;
		flex-direction: column;
		align-items: center;
		font-size: 1rem;
		margin-top: 1rem;
	}

	.title h2 {
		font-size: 1.2rem;
		margin: 0;
		margin-bottom: 0.5rem;
		padding: 0;
		font-weight: bold;
	}

	.title h3 {
		font-size: 0.8rem;
		margin: 0;
		padding: 0;
		font-weight: normal;
	}
</style>
