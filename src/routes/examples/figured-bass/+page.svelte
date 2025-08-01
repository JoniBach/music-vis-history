<script lang="ts">
	import Documentation from '$lib/components/notation/Documentation.svelte';
	import Notation from '$lib/components/notation/Notation.svelte';
	import { onMount } from 'svelte';

	let classes: any = null;
	let glyphnames: any = null;
	let ranges: any = null;
	let metadata: any = null;

	$: data = {
		classes,
		glyphnames,
		ranges,
		metadata
	};

	let loading = true;
	let error: string | null = null;
	let classicalNotes = [
		//
		{
			// note: 'barlineSingle',
			type: 'barline',
			duration: 'Single'
		},

		{
			// note: 'noteDoubleWhole',
			type: 'note',
			duration: 'DoubleWhole',
			// y: -1,
			pitch: 'D4',
			lyric: 'Notes of different lengths at different pitches'
		},
		{
			// note: 'noteDoubleWholeSquare',
			type: 'note',
			duration: 'DoubleWholeSquare',
			// y: 0,
			pitch: 'E4'
		},
		{
			// note: 'noteDoubleWhole',
			type: 'note',
			duration: 'DoubleWhole',
			// y: 1,
			pitch: 'F4'
		},
		{
			// note: 'noteWhole',
			type: 'note',
			duration: 'Whole',
			// y: 2,
			pitch: 'G4'
		},
		{
			// note: 'noteHalfUp',
			type: 'note',
			duration: 'Half',
			// y: 3,
			pitch: 'A5'
		},
		{
			// note: 'noteHalfDown',
			type: 'note',
			duration: 'Half',
			// y: 4,
			pitch: 'B5'
		},
		{
			// note: 'noteQuarterUp',
			type: 'note',
			duration: 'Quarter',
			// y: 5,
			pitch: 'C5'
		},
		{
			// note: 'note8thUp',
			type: 'note',
			duration: '8th',
			// y: 6,
			pitch: 'D5'
		},
		{
			// note: 'note16thUp',
			type: 'note',
			duration: '16th',
			// y: 7,
			pitch: 'E5'
		},
		{
			// note: 'note32ndUp',
			type: 'note',
			duration: '32nd',
			// y: 8,
			pitch: 'F5'
		},
		{
			// note: 'note64thUp',
			type: 'note',
			duration: '64th',
			// y: 9,
			pitch: 'G5'
		},

		{
			// note: 'barlineSingle',
			type: 'barline',
			duration: 'Single'
		},
		{
			// note: 'noteQuarterUp',
			type: 'note',
			duration: 'Quarter',
			// y: 10,
			pitch: 'A6',
			lyric: 'Extended Ledger Lines'
		},
		{
			// note: 'noteQuarterUp',
			type: 'note',
			duration: 'Quarter',
			// y: 11,
			pitch: 'B6'
		},
		{
			// note: 'noteQuarterUp',
			type: 'note',
			duration: 'Quarter',
			// y: 12,
			pitch: 'C6'
		},

		{
			// note: 'noteQuarterUp',
			type: 'note',
			duration: 'Quarter',
			// y: -4,
			pitch: 'A4'
		},
		{
			// note: 'noteQuarterUp',
			type: 'note',
			duration: 'Quarter',
			// y: -3,
			pitch: 'B4'
		},
		{
			// note: 'noteQuarterUp',
			type: 'note',
			duration: 'Quarter',
			// y: -2,
			pitch: 'C4'
		},
		{
			// note: 'barlineFinal',
			type: 'barline',
			duration: 'Double',
			pitch: ''
		},
		{
			// note: 'restQuarter',
			type: 'rest',
			duration: 'Half',
			y: 4,
			lyric: 'Rests of different lengths'
		},
		{
			// note: 'restQuarter',
			type: 'rest',
			duration: 'Quarter',
			y: 4
		},
		{
			// note: 'rest8th',
			type: 'rest',
			duration: '8th',
			y: 4
		},
		{
			// note: 'rest16th',
			type: 'rest',
			duration: '16th',
			y: 4
		},
		{
			// note: 'rest32nd',
			type: 'rest',
			duration: '32nd',
			y: 4
		},
		{
			// note: 'rest64th',
			type: 'rest',
			duration: '64th',
			y: 4
		},

		{
			// note: 'barlineFinal',
			type: 'barline',
			duration: 'Final',
			pitch: ''
		}

		// {
		// 	// note: 'barlineFinal',
		// 	type: 'any',
		// 	entity: 'mensuralRestMaxima',
		// }
	];

	onMount(async () => {
		try {
			const [classesRes, glyphnamesRes, rangesRes, metadataRes] = await Promise.all([
				fetch('/smufl/metadata/classes.json'),
				fetch('/smufl/metadata/glyphnames.json'),
				fetch('/smufl/metadata/ranges.json'),
				fetch('/smufl/metadata/bravura_metadata.json')
			]);

			if (!classesRes.ok || !glyphnamesRes.ok || !rangesRes.ok || !metadataRes.ok) {
				throw new Error('One or more files failed to load');
			}

			[classes, glyphnames, ranges, metadata] = await Promise.all([
				classesRes.json(),
				glyphnamesRes.json(),
				rangesRes.json(),
				metadataRes.json()
			]);
		} catch (err) {
			error = err.message;
		} finally {
			loading = false;
		}
	});

	let searchSuggestions = [
		'clefs',
		'dynamics',
		'individualNotes',
		'barlines',
		'rests',
		'note16thDown',
		'medieval'
	];
</script>

<div class="content">
	<h1>History of Figured Bass</h1>
	<h4>Origins, Purpose, and Development</h4>
	<p>
		Figured bass, also known as basso continuo or thoroughbass, is a musical notation system that emerged during the Baroque era (c. 1600–1750) to provide a harmonic framework for improvised accompaniment. Below is a concise history of its origins, purpose, and development.
	</p>
	<ol class="timeline">
		<li>
			<h5>Late 16th Century: Early Basso Continuo</h5>
			<p>
				The roots of figured bass trace to late 16th-century Italy, where composers began notating bass lines for accompaniment instruments like the organ or harpsichord. The earliest known basso seguente (a precursor) appeared in Placido Falconio’s 1575 book of Introits and Alleluias, providing a bass line to support polyphonic vocal music.
			</p>
		</li>
		<li>
			<h5>Early 17th Century: Emergence of Figured Bass</h5>
			<p>
				By the early 1600s, composers like Lodovico Viadana (1602 motets) and Giovanni Croce (1594 motet) began adding figures—numerals and accidentals—above or below bass notes to indicate chords and intervals. This allowed keyboardists and lutenists to improvise harmonies, reducing the need for fully notated scores and enabling flexible performances.
			</p>
		</li>
		<li>
			<h5>Purpose: Harmonic Support and Improvisation</h5>
			<p>
				Figured bass was developed to guide accompanists in creating harmonic support for melodies, especially in sacred and secular music. It served as a shorthand, saving printing costs and allowing performers to adapt chords to the ensemble’s needs, enhancing expressiveness through improvisation. It was integral to Baroque music’s shift from polyphony to melody-driven harmony.
			</p>
		</li>
		<li>
			<h5>Baroque Era (1600–1750): Standardization and Widespread Use</h5>
			<p>
				During the Baroque period, figured bass became a cornerstone of music, used in works by composers like J.S. Bach and Handel. It standardized chord notation (e.g., “6” for first inversion, “6/4” for second inversion) and was essential in genres like opera, sonatas, and sacred music, played by harpsichords, organs, or lutes.
			</p>
		</li>
		<li>
			<h5>18th Century: Pedagogical and Creative Role</h5>
			<p>
				Figured bass was not only for professionals; amateurs learned it through handbooks by composers like Handel and C.P.E. Bach. It remained a teaching tool for harmony, as seen in Mozart’s lessons to Thomas Attwood. Its use extended into the early Classical period, though it declined with the rise of fully notated scores.
			</p>
		</li>
		<li>
			<h5>Late 18th Century: Decline and Legacy</h5>
			<p>
				By the late 1700s, as symphonic music and precise notation grew, figured bass waned, replaced by fully written-out parts. Its legacy persists in music theory education, where it’s used to analyze chord inversions, and in historically informed performances, reviving Baroque improvisation practices.
			</p>
		</li>
	</ol>


{#if loading}
	<p>Loading SMuFL metadata...</p>
{:else if error}
	<p class="text-red-600">Error: {error}</p>
{:else}
	<!-- <Note {note} {data} /> -->
	<Notation
		title="Basic Classical Music Notation"
		subtitle="Some examples of different notes, rests, and other musical elements"
		fontSize={50}
		notes={classicalNotes}
		{data}
		staff="staff5Lines"
		thoroughbass
	/>

	<Documentation {data} {searchSuggestions} />
{/if}

</div>


<style>
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
