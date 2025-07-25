<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as Tone from 'tone';
	import HarmonicRatio from '$lib/components/HarmonicRatio.svelte';

	// --- Series Configuration ---
	const seriesData = [
		{ id: 1, label: 'n=1 (Fundamental)', color: '#1f77b4', harmonic: 1 },
		{ id: 2, label: 'n=2', color: '#ff7f0e', harmonic: 2 },
		{ id: 3, label: 'n=3', color: '#2ca02c', harmonic: 3 },
		{ id: 4, label: 'n=4', color: '#d62728', harmonic: 4 },
		{ id: 5, label: 'n=5', color: '#9467bd', harmonic: 5 },
		{ id: 6, label: 'n=6', color: '#8c564b', harmonic: 6 },
		{ id: 7, label: 'n=7', color: '#e377c2', harmonic: 7 },
		{ id: 8, label: 'n=8', color: '#7f7f7f', harmonic: 8 }
	];

	const baseFrequency = 110; // A2
	let synth: Tone.Synth | null = null;

	// --- Audio Handlers ---
	const handleNoteOn = (event: CustomEvent<number>) => {
		if (!synth) return;
		const harmonic = event.detail;
		const frequency = baseFrequency * harmonic;
		Tone.start(); // Ensure audio context is running
		synth.triggerAttack(frequency);
	};

	const handleNoteOff = () => {
		if (!synth) return;
		synth.triggerRelease();
	};

	// --- Lifecycle ---
	onMount(() => {
		synth = new Tone.Synth().toDestination();
	});

	onDestroy(() => {
		if (synth) {
			synth.dispose();
		}
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

	<HarmonicRatio series={seriesData} on:noteon={handleNoteOn} on:noteoff={handleNoteOff} />
</div>

<style>
	.content {
		max-width: 800px;
		margin: 2rem auto;
		padding: 1rem;
	}
</style>
