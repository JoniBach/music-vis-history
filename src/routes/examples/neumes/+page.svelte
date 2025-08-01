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
// Single Stave: Early Cheironomic Neumes (9th Century, St. Gall Style)
	// Chant: "Kyrie eleison" (Kyrie IV), simple melody with punctum and virga
	let singleStave = [
		{
			type: 'any',
			entity: 'mensuralRestLongaPerfecta'
		},
		{
			type: 'chant',
			duration: 'chantPunctum',
			pitch: 'F4',
			lyric: 'Ky-'
		},
		{
			type: 'chant',
			duration: 'chantPunctumVirga',
			pitch: 'G4',
			lyric: 'ri-'
		},
		{
			type: 'chant',
			duration: 'chantPunctum',
			pitch: 'F4',
			lyric: 'e'
		},
		{
			type: 'any',
			entity: 'mensuralRestLongaPerfecta'
		},
		{
			type: 'chant',
			duration: 'chantPunctum',
			pitch: 'G4',
			lyric: 'e-'
		},
		{
			type: 'chant',
			duration: 'chantPunctumVirga',
			pitch: 'A4',
			lyric: 'lei-'
		},
		{
			type: 'chant',
			duration: 'chantPunctum',
			pitch: 'G4',
			lyric: 'son'
		},
		{
			type: 'any',
			entity: 'mensuralRestLongaPerfecta'
		}
	];

	// Dual Stave: Heightened/Diastematic Neumes (10th–11th Century, Beneventan/Guido)
	// Chant: "Veni Creator Spiritus", expressive with quilisma and punctum inclinatum
	let dualStave = [
		{
			type: 'any',
			entity: 'mensuralRestLongaPerfecta'
		},
		{
			type: 'chant',
			duration: 'chantPunctumInclinatum',
			pitch: 'G4',
			lyric: 'Ve-'
		},
		{
			type: 'chant',
			duration: 'chantPunctum',
			pitch: 'A4',
			lyric: 'ni'
		},
		{
			type: 'any',
			entity: 'mensuralRestLongaPerfecta'
		},
		{
			type: 'chant',
			duration: 'chantQuilisma',
			pitch: 'A4',
			lyric: 'Cre-'
		},
		{
			type: 'chant',
			duration: 'chantPunctumInclinatum',
			pitch: 'G4',
			lyric: 'a-'
		},
		{
			type: 'chant',
			duration: 'chantPunctum',
			pitch: 'F4',
			lyric: 'tor'
		},
		{
			type: 'any',
			entity: 'mensuralRestLongaPerfecta'
		}
	];

	// Quad Stave: Square Notation (12th–13th Century, Gregorian Chant)
	// Chant: "Pange lingua", standardized with punctum cavum and strophicus
	let quadStave = [
		{
			type: 'any',
			entity: 'mensuralRestLongaPerfecta'
		},
		{
			type: 'chant',
			duration: 'chantPunctumCavum',
			pitch: 'F4',
			lyric: 'Pan-'
		},
		{
			type: 'chant',
			duration: 'chantPunctumCavum',
			pitch: 'G4',
			lyric: 'ge'
		},
		{
			type: 'any',
			entity: 'mensuralRestLongaPerfecta'
		},
		{
			type: 'chant',
			duration: 'chantStrophicus',
			pitch: 'A4',
			lyric: 'lin-'
		},
		{
			type: 'chant',
			duration: 'chantPunctumCavum',
			pitch: 'G4',
			lyric: 'gua'
		},
		{
			type: 'any',
			entity: 'mensuralRestLongaPerfecta'
		},
		{
			type: 'chant',
			duration: 'chantStrophicusAuctus',
			pitch: 'F4',
			lyric: 'glo-'
		},
		{
			type: 'chant',
			duration: 'chantPunctumCavum',
			pitch: 'G4',
			lyric: 'ri-'
		},
		{
			type: 'chant',
			duration: 'chantPunctumCavum',
			pitch: 'F4',
			lyric: 'o-'
		},
		{
			type: 'any',
			entity: 'mensuralRestLongaPerfecta'
		}
	];

	
	let allNeumes = [
	{
		type: 'chant',
		duration: 'chantPunctum',
		pitch: 'C4',
	},
	{
		type: 'chant',
		duration: 'chantPunctumInclinatum',
		pitch: 'D4',
	},
	{
		type: 'chant',
		duration: 'chantPunctumInclinatumAuctum',
		pitch: 'E4',
	},
	{
		type: 'chant',
		duration: 'chantPunctumInclinatumDeminutum',
		pitch: 'F4',
	},
	{
		type: 'chant',
		duration: 'chantAuctumAsc',
		pitch: 'G4',
	},
	{
		type: 'chant',
		duration: 'chantAuctumDesc',
		pitch: 'A4',
	},
	{
		type: 'chant',
		duration: 'chantPunctumVirga',
		pitch: 'B4',
	},
	{
		type: 'chant',
		duration: 'chantPunctumVirgaReversed',
		pitch: 'A4',
	},
	{
		type: 'chant',
		duration: 'chantPunctumCavum',
		pitch: 'G4',
	},
	{
		type: 'chant',
		duration: 'chantPunctumLinea',
		pitch: 'F4',
	},
	{
		type: 'chant',
		duration: 'chantPunctumLineaCavum',
		pitch: 'E4',
	},
	{
		type: 'chant',
		duration: 'chantQuilisma',
		pitch: 'D4',
	},
	{
		type: 'chant',
		duration: 'chantOriscusAscending',
		pitch: 'C4',
	},
	{
		type: 'chant',
		duration: 'chantOriscusDescending',
		pitch: 'D4',
	},
	{
		type: 'chant',
		duration: 'chantOriscusLiquescens',
		pitch: 'E4',
	},
	{
		type: 'chant',
		duration: 'chantStrophicus',
		pitch: 'F4',
	},
	{
		type: 'chant',
		duration: 'chantStrophicusAuctus',
		pitch: 'G4',
	},
	{
		type: 'chant',
		duration: 'chantPunctumDeminutum',
		pitch: 'A4',
	},
	{
		type: 'any',
		entity: 'mensuralBlackMaxima',
		pitch: 'B4'
	},
	{
		type: 'any',
		entity: 'mensuralBlackLonga',
		pitch: 'A4'
	},
	{
		type: 'any',
		entity: 'mensuralBlackBrevis',
		pitch: 'G4'
	},
	{
		type: 'any',
		entity: 'mensuralBlackSemibrevis',
		pitch: 'F4'
	},
	{
		type: 'any',
		entity: 'mensuralBlackMinima',
		pitch: 'E4'
	},
	{
		type: 'any',
		entity: 'mensuralBlackSemiminima',
		pitch: 'D4'
	},
	{
		type: 'any',
		entity: 'mensuralBlackBrevisVoid',
		pitch: 'C4'
	},
	{
		type: 'any',
		entity: 'mensuralBlackSemibrevisVoid',
		pitch: 'D4'
	},
	{
		type: 'any',
		entity: 'mensuralBlackMinimaVoid',
		pitch: 'E4'
	},
	{
		type: 'any',
		entity: 'mensuralBlackSemibrevisCaudata',
		pitch: 'F4'
	},
	{
		type: 'any',
		entity: 'mensuralBlackDragma',
		pitch: 'G4'
	},
	{
		type: 'any',
		entity: 'mensuralBlackSemibrevisOblique',
		pitch: 'A4'
	},
	{
		type: 'any',
		entity: 'mensuralWhiteMaxima',
		pitch: 'B4'
	},
	{
		type: 'any',
		entity: 'mensuralWhiteLonga',
		pitch: 'A4'
	},
	{
		type: 'any',
		entity: 'mensuralWhiteBrevis',
		pitch: 'G4'
	},
	{
		type: 'any',
		entity: 'mensuralWhiteMinima',
		pitch: 'F4'
	},
	{
		type: 'any',
		entity: 'mensuralWhiteSemiminima',
		pitch: 'E4'
	},
	{
		type: 'any',
		entity: 'mensuralWhiteFusa',
		pitch: 'D4'
	},
	{
		type: 'any',
		entity: 'mensuralWhiteSemibrevis',
		pitch: 'C4'
	}
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

	let searchSuggestions = ['clefs', 'individualNotes', 'rests', 'mensuralWhiteFusa', 'medieval'];
</script>
<div class="content">

<h1>Neumes: The Roots of Musical Notation</h1>

<iframe width="560" height="315" src="https://www.youtube.com/embed/fJtgzYAQOkk?si=T6j8B0Xl0brQPP0P" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
	<h4>Before modern musical notation, there was a simpler system</h4>
	<p>
		Neumes were the earliest known symbols used to represent musical pitch and melody in Western and some Eastern musical traditions. These small, elegant marks guided singers through the contours of sacred chants, serving as a memory aid long before the five-line staff was invented.
	</p>

	<p>
		A neume could be a single dot, a wavy line, or a cluster of marks placed above a text, indicating the rise or fall of a melody. Unlike modern notation, early neumes didn’t specify exact pitches or rhythms—they captured the <strong>shape</strong> of a melody, relying on the singer’s knowledge of the chant.
	</p>
	<h4>Neumes are more than just symbols</h4>
	<p>
		They are the bridge between oral musical traditions and written notation. Emerging from the need to standardize liturgical music, neumes laid the groundwork for the precise systems we use today. Without neumes, the development of Western music notation—and the preservation of countless melodies—might not have been possible.
	</p>
	<h4>Neumes are a universal idea</h4>
	<p>
		Their origins trace back to ancient practices of notating melodic inflection, from Aramaic Christian communities to Byzantine chant. <b>Long before standardized notation</b>, monks and scribes used neumes to preserve the sacred music of their traditions, shaping the course of musical history.
	</p>

	<!-- Brief Historical Timeline -->
	<h4>The history of neumes spans centuries and cultures</h4>

	<ul class="timeline">
		<li>
			<strong>Pre-9th Century – Eastern Roman Empire:</strong> Early neume-like systems, known as ekphonetic notation, emerge in Byzantine regions (Syria, Lebanon) to notate melodic inflections in Christian scriptures, influenced by Greek textual accents.
		</li>
		<li>
			<strong>~800 CE – Metz & Charlemagne’s Reforms:</strong> Neumes appear in Western Europe, likely in Metz, as part of Charlemagne’s efforts to standardize Frankish liturgical music. Simple marks like the <em>acutus</em> (/) and <em>gravis</em> (\) indicate melodic direction.
		</li>
		<li>
			<strong>9th–10th Century – St. Gall & Regional Styles:</strong> Distinct neume systems develop in monasteries like St. Gall (Switzerland) and Benevento (Italy), using symbols like <em>punctum</em> (・) and <em>virga</em> (/) to guide singers.
		</li>
		<li>
			<strong>~1000 CE – Guido d’Arezzo:</strong> Introduces the four-line staff, allowing neumes to represent exact pitches. His innovations, including letter-based clefs (C, F), revolutionize notation and make melodies easier to learn.
		</li>
		<li>
			<strong>12th–13th Century – Rhythmic Advances:</strong> Neumes evolve into square notation for Gregorian chant. Franco of Cologne’s mensural notation adds rhythmic precision, paving the way for modern note values.
		</li>
		<li>
			<strong>19th Century – Solesmes Revival:</strong> Benedictine monks at Solesmes Abbey (Dom Pothier, Dom Mocquereau) standardize square-note neumes, preserving Gregorian chant and publishing editions still used today.
		</li>
	</ul>


	{#if loading}
	<p>Loading SMuFL metadata...</p>
{:else if error}
	<p class="text-red-600">Error: {error}</p>
{:else}
	<!-- <Note {note} {data} /> -->
	<div class="harmonic-block">
		<h4>Kyrie eleison: The Dawn of Neume Notation</h4>
		<p>
			The "Kyrie eleison," a plea for mercy from the Mass Ordinary, is one of the oldest Gregorian chants, dating back to early Christian liturgies. Its simple, flowing melody made it ideal for the earliest neumes in the 9th century, developed in monasteries like St. Gall under Charlemagne’s reforms. These cheironomic neumes, such as the punctum and virga, were mnemonic aids, guiding singers through familiar melodies without a staff, relying on oral tradition for precision.
		</p>
	</div>
	<Notation
		title="Kyrie eleison (Early Cheironomic)"
		subtitle="9th Century St. Gall-style neumes, simple and staffless"
		fontSize={50}
		notes={singleStave}
		{data}
		staff="chantStaff"
		variant="single"
	/>
	
	<div class="harmonic-block">
		<h4>Veni Creator Spiritus: Expressing Melody with Precision</h4>
		<p>
			The hymn "Veni Creator Spiritus," attributed to the 9th century, gained prominence in the 10th–11th centuries for its evocative melody. Heightened neumes, as seen in Beneventan or early Guido d’Arezzo notations, marked a leap forward, using symbols like quilisma and punctum inclinatum to indicate relative pitch more clearly. This allowed scribes to capture the hymn’s soaring lines, paving the way for standardized notation.
		</p>
	</div>
	<Notation
		title="Veni Creator Spiritus (Heightened Neumes)"
		subtitle="10th–11th Century diastematic neumes, Beneventan/Guido style"
		fontSize={50}
		notes={dualStave}
		{data}
		staff="chantStaff"
		variant="dual"
	/>
	
	<div class="harmonic-block">
		<h4>Pange lingua: The Triumph of Square Notation</h4>
		<p>
			Written by Thomas Aquinas in the 13th century, "Pange lingua" is a Eucharistic hymn with a stately, syllabic melody. By this time, square notation on a four-line staff, refined by Guido d’Arezzo’s innovations, had become the standard for Gregorian chant. Symbols like punctum cavum and strophicus provided precise pitch and subtle articulations, ensuring chants could be preserved and performed uniformly across monasteries.
		</p>
	</div>
	<Notation
		title="Pange lingua (Square Notation)"
		subtitle="12th–13th Century standardized square neumes for Gregorian chant"
		fontSize={50}
		notes={quadStave}
		{data}
		staff="chantStaff"
		variant="quad"
	/>
	<div class="harmonic-block">
		<h4>SMuFL is a comprehensive standard for musical notation symbols</h4>
		<p>
			This notation showcases a selection of neume symbols from the medieval and Renaissance plainchant repertoire, demonstrating the rich variety of shapes and articulations used in early music notation.
		</p>
	</div>
	<Notation
		title="A bunch of neums"
		subtitle="Demonstration of SMuFL single-note neume forms"
		fontSize={50}
		notes={allNeumes}
		{data}
		staff="chantStaff"
		variant="quad"
	/>

{/if}
</div>
<Documentation {data} defaultFilter="medieval" {searchSuggestions} />


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
