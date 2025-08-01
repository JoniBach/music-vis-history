<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as Tone from 'tone';
	import HarmonicRatio from '$lib/components/HarmonicRatio.svelte';

	// --- Series Configuration ---
	const harmonic1 = {
		id: 1,
		label: 'n=1 (Fundamental)',
		color: '#1f77b4',
		harmonic: 1,
		volume: 100
	};
	const harmonic2 = { id: 2, label: 'n=2', color: '#ff7f0e', harmonic: 2, volume: 100 };
	const harmonic3 = { id: 3, label: 'n=3', color: '#2ca02c', harmonic: 3, volume: 100 };
	const harmonic4 = { id: 4, label: 'n=4', color: '#d62728', harmonic: 4, volume: 100 };
	const harmonic5 = { id: 5, label: 'n=5', color: '#9467bd', harmonic: 5, volume: 100 };
	const harmonic6 = { id: 6, label: 'n=6', color: '#8c564b', harmonic: 6, volume: 100 };
	const harmonic7 = { id: 7, label: 'n=7', color: '#e377c2', harmonic: 7, volume: 100 };
	const harmonic8 = { id: 8, label: 'n=8', color: '#7f7f7f', harmonic: 8, volume: 100 };

	const seriesData = [
		harmonic1,
		harmonic2,
		harmonic3,
		harmonic4,
		harmonic5,
		harmonic6,
		harmonic7,
		harmonic8
	];

	const baseFrequency = 110; // A2
	let synth: Tone.Synth | null = null;
	let harmonicSynths: { synth: Tone.Synth; gain: Tone.Gain }[] = [];

	// --- Audio Handlers ---
	const handleNoteOn = (event: CustomEvent<{ harmonic: number; volume: number }>) => {
		if (!synth) return;
		const { harmonic, volume } = event.detail;
		const frequency = baseFrequency * harmonic;

		// Set volume (convert percentage to 0-1 range)
		const normalizedVolume = volume / 100;
		synth.volume.value = Tone.gainToDb(normalizedVolume);

		Tone.start(); // Ensure audio context is running
		synth.triggerAttack(frequency);
	};

	const handleNoteOff = () => {
		if (!synth) return;
		synth.triggerRelease();
	};

	// --- Play All Harmonics Handlers ---
	const handlePlayAllStart = (event: CustomEvent<{ harmonics: number[]; volumes: number[] }>) => {
		if (harmonicSynths.length === 0) return;

		Tone.start(); // Ensure audio context is running

		// Get harmonics and volumes
		const { harmonics, volumes } = event.detail;

		// Play each harmonic with its own synth and volume
		for (let i = 0; i < harmonics.length; i++) {
			if (i < harmonicSynths.length) {
				const frequency = baseFrequency * harmonics[i];
				const volume = volumes[i];

				// Set individual gain for this harmonic (convert percentage to 0-1 range)
				const normalizedVolume = volume / 100;
				harmonicSynths[i].gain.gain.value = normalizedVolume;

				// Play the note
				harmonicSynths[i].synth.triggerAttack(frequency);
			}
		}
	};

	const handlePlayAllStop = () => {
		// Release all notes from all synths
		harmonicSynths.forEach(({ synth }) => {
			synth.triggerRelease();
		});
	};

	// --- Volume Change Handler ---
	const handleVolumeChange = (event: CustomEvent<{ harmonic: number; volume: number }>) => {
		const { harmonic, volume } = event.detail;

		// Find the index of this harmonic in our series data
		const harmonicIndex = seriesData.findIndex((item) => item.harmonic === harmonic);

		if (harmonicIndex >= 0 && harmonicIndex < harmonicSynths.length) {
			// Update the gain node in real-time
			const normalizedVolume = volume / 100;
			harmonicSynths[harmonicIndex].gain.gain.value = normalizedVolume;
		}
	};

	// --- Sliders Visibility Handler ---
	let showSliders = true;
	const handleSlidersVisibility = (event: CustomEvent<boolean>) => {
		showSliders = event.detail;
	};

	// --- Lifecycle ---
	onMount(() => {
		// Create single synth for individual note playback
		synth = new Tone.Synth().toDestination();

		// Create individual synths for each harmonic for better volume control
		harmonicSynths = seriesData.map(() => {
			const gain = new Tone.Gain().toDestination();
			const synth = new Tone.Synth().connect(gain);
			return { synth, gain };
		});
	});

	onDestroy(() => {
		// Clean up all audio resources
		if (synth) {
			synth.dispose();
		}

		// Dispose all harmonic synths and gain nodes
		harmonicSynths.forEach(({ synth, gain }) => {
			synth.dispose();
			gain.dispose();
		});
	});
</script>

<svelte:head>
	<title>Harmonic Series</title>
	<meta name="description" content="An interactive visualization of the harmonic series." />
</svelte:head>

<div class="content">
	<h1>The Harmonic Series</h1>
	<h4>In music, every note we hear is not a single, pure tone</h4>
	<p>
		It’s a blend of many tones stacked together in a precise mathematical pattern. This natural
		pattern is called the
		<strong>harmonic series</strong>, and it appears anywhere something vibrates: a plucked guitar
		string, a struck piano string, a singer’s vocal cords, even a column of air in a flute.
	</p>

	<p>
		When a string (or air column) vibrates, the <em>whole</em> length produces the
		<strong>fundamental frequency</strong>, but at the same time it can also vibrate in halves,
		thirds, quarters, and so on. These faster vibrations create higher-pitched tones called
		<strong>harmonics</strong> or <strong>overtones</strong>. Each harmonic’s frequency is a whole
		number multiple of the fundamental: 2×, 3×, 4×, etc.
	</p>
	<h4>It's not just a quirk of physics</h4>
	<p>
		It’s the very foundation of harmony, tuning, and the character of musical sound. Musical
		intervals like the octave, fifth, and major third all appear naturally in the first few
		harmonics. Without the harmonic series, our sense of consonance and dissonance—and our modern
		scale systems—would not exist.
	</p>
	<h4>The harmonic series is naturally occuring</h4>
	<p>
		If forms a blueprint for musical harmony. <b>Long before written notation</b>, humans were
		singing and building instruments that unconsciously followed its ratios. Over centuries,
		musicians formalized these sounds into scales, chords, and tuning systems—the DNA of music as we
		know it today.
	</p>

	<!-- Brief Historical Timeline -->
	<h4>The history of the harmonic series predates written music</h4>

	<ul class="timeline">
		<li>
			<strong>~2000 BCE – Ancient Mesopotamia & China:</strong> Early lyres, flutes, and zithers already
			produce notes aligned with harmonic ratios, though the physics is not yet understood.
		</li>
		<li>
			<strong>6th century BCE – Pythagoras (Greece):</strong> Discovers that musical intervals can be
			expressed as simple ratios of whole numbers (2:1, 3:2, 4:3) by experimenting with vibrating strings.
		</li>
		<li>
			<strong>4th century BCE – Aristotle & Aristoxenus:</strong> Debate the balance between mathematics
			and perception in music theory.
		</li>
		<li>
			<strong>Medieval Europe:</strong> Monks and scholars develop early tuning systems based on Pythagorean
			ratios to create consonant harmony in chant and early polyphony.
		</li>
		<li>
			<strong>17th–18th centuries:</strong> Advancements in acoustics (Mersenne, Sauveur) explain the
			harmonic series scientifically; influences modern tuning systems.
		</li>
		<li>
			<strong>Modern Era:</strong> Harmonic analysis underpins everything from orchestration to synthesizer
			design, film scoring, and digital audio synthesis.
		</li>
	</ul>

	<HarmonicRatio
		series={seriesData}
		{showSliders}
		on:noteon={handleNoteOn}
		on:noteoff={handleNoteOff}
		on:playallstart={handlePlayAllStart}
		on:playallstop={handlePlayAllStop}
		on:volumechange={handleVolumeChange}
		on:slidersvisibility={handleSlidersVisibility}
	/>

	<h2>Listening to the Harmonics</h2>
	<p>
		Click the examples below to hear individual harmonics and see how their vibrations align with
		the fundamental. You’ll notice how some blend easily (consonance) and others sound more complex
		or tense (dissonance).
	</p>

	<div class="harmonic-block">
		<p>
			<strong>n=2 – Octave (2:1)</strong>
		</p>
		<p>
			Frequencies match every other wave cycle.
		</p>
		<HarmonicRatio
			series={[harmonic1, harmonic2]}
			on:noteon={handleNoteOn}
			on:noteoff={handleNoteOff}
			on:playallstart={handlePlayAllStart}
			on:playallstop={handlePlayAllStop}
		/>
	</div>

	<div class="harmonic-block">
		<p>
		<strong>n=3 – Perfect Fifth (3:2)</strong> - Rich and resonant.
		</p>
		<p>
			The cycles of the fifth align <b>every third beat</b> of the fundamental, creating a
			balanced, stable harmony. This interval is so foundational that it’s been used in tuning systems
			since ancient Greece and China.
		</p>
		<p>
			The perfect fifth is the backbone of the <em>circle of fifths</em>,
			chord progressions, and string tuning (like the violin family). Its clarity and strength make it
			a cornerstone of both melody and harmony.
		</p>
		<HarmonicRatio
			series={[harmonic1, harmonic3]}
			on:noteon={handleNoteOn}
			on:noteoff={handleNoteOff}
			on:playallstart={handlePlayAllStart}
			on:playallstop={handlePlayAllStop}
		/>
	</div>
	
	<div class="harmonic-block">
		<p>
			<strong>n=4 – Double Octave (4:1)</strong><br />
			Even more tightly aligned than the octave—pure repetition at double speed. This is essentially
			the same note as the fundamental, only higher in pitch. It’s used universally across cultures
			to give melodies lift, power, and clarity. Choirs often sing in octaves, and instrumentalists
			exploit them for emphasis and brightness. The double octave reinforces the fundamental so
			strongly that it becomes nearly indistinguishable in harmonic identity—pure sonic reinforcement.
		</p>
		<HarmonicRatio
			series={[harmonic1, harmonic4]}
			on:noteon={handleNoteOn}
			on:noteoff={handleNoteOff}
			on:playallstart={handlePlayAllStart}
			on:playallstop={handlePlayAllStop}
		/>
	</div>
	
	<div class="harmonic-block">
		<p>
			<strong>n=5 – Major Third (5:4)</strong> - Bright and uplifting<br />

		</p>
		<p>
			The major third defines the difference between a major and minor chord.
			Without it, harmony feels ambiguous; with it, music gains a clear emotional direction. The major
			third emerges naturally in the harmonic series but is slightly different from the one in modern
			equal temperament tuning.
		</p>
		<p>
			Barbershop singers and early organ builders exploited its pure ratio to
			create shimmering, beatless consonance that modern instruments only approximate.
		</p>
		<HarmonicRatio
			series={[harmonic1, harmonic5]}
			on:noteon={handleNoteOn}
			on:noteoff={handleNoteOff}
			on:playallstart={handlePlayAllStart}
			on:playallstop={handlePlayAllStop}
		/>
	</div>
	
	<div class="harmonic-block">
		<p><strong>n=7 – Natural Minor Seventh (7:4)</strong> - Warm and expressive, with a slightly “bluesy” flavor.</p>
		<p>
			
			 This seventh doesn’t appear in our modern
			equal-tempered scale, but singers and traditional musicians around the world—from African
			folk music to Appalachian ballads—use it naturally. In the harmonic series, it’s slightly lower
			than the tempered minor seventh, giving it a distinctive, soulful pull toward resolution.
			
		</p>
		<p>
			Composers and improvisers use it to evoke rawness and authenticity.
		</p>
		<HarmonicRatio
			series={[harmonic1, harmonic7]}
			on:noteon={handleNoteOn}
			on:noteoff={handleNoteOff}
			on:playallstart={handlePlayAllStart}
			on:playallstop={handlePlayAllStop}
		/>
	</div>
	
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
