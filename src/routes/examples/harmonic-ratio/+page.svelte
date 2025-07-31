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
	<p>
		The harmonic series is a fundamental concept in music and physics. When a string vibrates, it
		doesn't just produce one frequency but a whole series of frequencies called harmonics or
		overtones. The first harmonic is the fundamental frequency, and each subsequent harmonic is an
		integer multiple of the fundamental. Click on each string to see it vibrate and hear the
		corresponding tone.
	</p>

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

	<h2>Exploring Individual Harmonics</h2>
	<p>
		Here are some key harmonics, shown alongside the fundamental. Click each to hear how they sound
		and see how their vibrations relate.
	</p>

	<div class="harmonic-block">
		<p>
			<strong>n=2 (Octave – 2:1)</strong><br />
			Exactly double the fundamental frequency. The simplest and purest harmony.
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
			<strong>n=3 (Perfect Fifth – 3:2)</strong><br />
			A rich, stable consonance. Notice how the waves align every third cycle.
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
			<strong>n=4 (Two Octaves – 4:1)</strong><br />
			Another perfectly pure interval — the wave cycles match even more closely.
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
			<strong>n=5 (Major Third – 5:4)</strong><br />
			A sweet, uplifting consonance often found in major chords.
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
		<p>
			<strong>n=7 (~Minor Seventh – 7:4)</strong><br />
			Not part of standard Western tuning, but has a bluesy, earthy quality.
		</p>
		<HarmonicRatio
			series={[harmonic1, harmonic7]}
			on:noteon={handleNoteOn}
			on:noteoff={handleNoteOff}
			on:playallstart={handlePlayAllStart}
			on:playallstop={handlePlayAllStop}
		/>
	</div>

	<h2>Harmonic Relationships</h2>
	<p>We can also compare harmonics with each other to see and hear intervals.</p>

	<div class="harmonic-block">
		<p><strong>n=2 &amp; n=3 (Perfect Fifth – 3:2)</strong></p>
		<HarmonicRatio
			series={[harmonic2, harmonic3]}
			on:noteon={handleNoteOn}
			on:noteoff={handleNoteOff}
			on:playallstart={handlePlayAllStart}
			on:playallstop={handlePlayAllStop}
		/>
	</div>

	<div class="harmonic-block">
		<p><strong>n=3 &amp; n=4 (Perfect Fourth – 4:3)</strong></p>
		<HarmonicRatio
			series={[harmonic3, harmonic4]}
			on:noteon={handleNoteOn}
			on:noteoff={handleNoteOff}
			on:playallstart={handlePlayAllStart}
			on:playallstop={handlePlayAllStop}
		/>
	</div>

	<style>
		.harmonic-block {
			margin: 1.5rem 0;
		}
		.harmonic-block p {
			margin-bottom: 0.5rem;
		}
	</style>
</div>

<style>
	.content {
		max-width: 800px;
		margin: 2rem auto;
		padding: 1rem;
	}
</style>
