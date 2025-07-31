<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import { tick } from 'svelte';
	import * as d3 from 'd3';

	// --- Component Props ---
	export let series: {
		id: number;
		label: string;
		color: string;
		harmonic: number;
		volume?: number;
	}[] = [];
	export let showSliders = false;
	// Width and height will be calculated dynamically

	// --- Internal State ---
	let container: HTMLDivElement;
	const margin = { top: 40, right: 40, bottom: 40, left: 40 };
	let activeTimer: d3.Timer | null = null;
	let isPlayingAll = false;
	let playAllButtonDisabled = false;
	let containerWidth = 0;
	let containerHeight = 0;

	// Store volume values for each harmonic (default to 100%)
	let volumeValues: Map<number, number> = new Map();

	// Initialize volumes from series data or default to 100%
	$: {
		series.forEach((item) => {
			if (!volumeValues.has(item.id)) {
				volumeValues.set(item.id, item.volume !== undefined ? item.volume : 100);
			}
		});
	}

	// Calculate height based on number of harmonics
	$: harmonicHeight = showSliders ? 120 : 80; // More height when sliders are shown
	$: calculatedHeight = series.length * harmonicHeight + margin.top + margin.bottom;

	// --- Event Dispatcher for Parent Communication ---
	const dispatch = createEventDispatcher<{
		noteon: { harmonic: number; volume: number };
		noteoff: void;
		playallstart: { harmonics: number[]; volumes: number[] };
		playallstop: void;
		volumechange: { harmonic: number; volume: number };
		slidersvisibility: boolean;
	}>();

	// --- Play All Functionality ---
	// Store all active timers for simultaneous playback
	let playAllTimers: d3.Timer[] = [];

	function startPlayAllHarmonics() {
		if (isPlayingAll) return;

		isPlayingAll = true;
		const width = containerWidth || 800;
		const chartWidth = width - margin.left - margin.right;

		// Stop any currently playing harmonic
		if (activeTimer) {
			activeTimer.stop();
			activeTimer = null;
		}

		// Dispatch a single event with all harmonics to play and their volumes
		const harmonicsToPlay = series.map((item) => item.harmonic);
		// Get the current volume values from the volumeValues map
		const volumesToUse = series.map((item) => volumeValues.get(item.id) || 100);
		// Log volumes for debugging
		console.log('Playing all harmonics with volumes:', volumesToUse);
		dispatch('playallstart', { harmonics: harmonicsToPlay, volumes: volumesToUse });

		// Animate all harmonics simultaneously
		for (const item of series) {
			// Get the group for this harmonic
			const group = d3
				.select(container)
				.select('svg')
				.select('g')
				.selectAll('.harmonic')
				.filter((d: any) => d.id === item.id)
				.node();

			if (group) {
				const topPath = d3.select(group).select<SVGPathElement>('path.wave-top');
				const bottomPath = d3.select(group).select<SVGPathElement>('path.wave-bottom');

				// Animate this harmonic with its volume
				const timer = animateWave(topPath, bottomPath, item.harmonic, chartWidth, item.id);
				playAllTimers.push(timer);
			}
		}
	}

	function stopPlayAllHarmonics() {
		if (!isPlayingAll) return;

		// Stop all animations
		playAllTimers.forEach((timer) => timer.stop());
		playAllTimers = [];

		// Dispatch event to stop all sounds
		dispatch('playallstop');

		// Reset all waves to static
		const width = containerWidth || 800;
		const chartWidth = width - margin.left - margin.right;
		for (const item of series) {
			const group = d3
				.select(container)
				.select('svg')
				.select('g')
				.selectAll('.harmonic')
				.filter((d: any) => d.id === item.id)
				.node();

			if (group) {
				const topPath = d3.select(group).select<SVGPathElement>('path.wave-top');
				const bottomPath = d3.select(group).select<SVGPathElement>('path.wave-bottom');
				// Use volume for static wave
				const volume = volumeValues.get(item.id) || 100;
				const staticData = generateWaveData(item.harmonic, chartWidth, 0, volume);
				updateWavePaths(topPath, bottomPath, staticData);
			}
		}

		isPlayingAll = false;
	}

	// --- Pure Functions for Data Generation ---
	const generateWaveData = (
		harmonic: number,
		w: number,
		t: number,
		volumePercent: number = 100
	): [number, number][] => {
		// Base amplitude is 20, scale by volume percentage
		const baseAmplitude = 20;
		const amplitude = baseAmplitude * (volumePercent / 100);
		const points = 150;

		// For visualization, we want to show the complete wave pattern for each harmonic
		// A higher harmonic should show more complete cycles within the same width
		return d3.range(points).map((i) => {
			const x = (i / (points - 1)) * w;
			// Multiply by harmonic to get the correct frequency relationship
			// This ensures n3 has 3x the cycles of n1, etc.
			const y = amplitude * Math.sin(2 * Math.PI * harmonic * (x / w) + t * harmonic);
			return [x, y];
		});
	};

	const lineGenerator = d3
		.line<[number, number]>()
		.x((d) => d[0])
		.y((d) => d[1]);

	// --- D3 Drawing Functions (Impure, operate on D3 selections) ---
	const updateWavePaths = (
		topPath: d3.Selection<SVGPathElement, unknown, null, undefined>,
		bottomPath: d3.Selection<SVGPathElement, unknown, null, undefined>,
		data: [number, number][]
	) => {
		topPath.attr('d', lineGenerator(data));
		bottomPath.attr('d', lineGenerator(data.map(([x, y]) => [x, -y])));
	};

	const animateWave = (
		topPath: d3.Selection<SVGPathElement, unknown, null, undefined>,
		bottomPath: d3.Selection<SVGPathElement, unknown, null, undefined>,
		harmonic: number,
		w: number,
		id?: number
	): d3.Timer => {
		let t = 0;
		return d3.timer(() => {
			// Get volume for this harmonic if id is provided
			const volume = id !== undefined ? volumeValues.get(id) || 100 : 100;
			const data = generateWaveData(harmonic, w, t, volume);
			updateWavePaths(topPath, bottomPath, data);
			t += 0.1;
		});
	};

	// --- Component Lifecycle Hook ---
	onMount(() => {
		// Get container dimensions
		const resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				containerWidth = entry.contentRect.width;
				redrawChart();
			}
		});

		resizeObserver.observe(container);

		// Initial draw
		redrawChart();

		// Cleanup function
		return () => {
			resizeObserver.disconnect();
			if (activeTimer) activeTimer.stop();
			d3.select(container).select('svg').remove();
		};
	});

	// Function to draw/redraw the chart
	function redrawChart() {
		// Clear previous SVG if it exists
		d3.select(container).select('svg').remove();

		// Use container width and calculated height
		const width = containerWidth || 800; // Fallback if container width is 0
		const height = calculatedHeight;

		const chartWidth = width - margin.left - margin.right;
		const chartHeight = height - margin.top - margin.bottom;

		const svg = d3
			.select(container)
			.append('svg')
			.attr('width', width)
			.attr('height', height)
			.append('g')
			.attr('transform', `translate(${margin.left}, ${margin.top})`);

		const y = d3
			.scalePoint()
			.domain(series.map((d) => d.label))
			.range([0, chartHeight])
			.padding(0.5);

		// --- Event Handler Logic ---
		const handleMouseEvent = (
			eventType: 'mousedown' | 'mouseup' | 'mouseleave',
			d3This: SVGGElement,
			d: (typeof series)[0]
		) => {
			if (activeTimer) {
				activeTimer.stop();
				activeTimer = null;
			}

			const topPath = d3.select(d3This).select<SVGPathElement>('path.wave-top');
			const bottomPath = d3.select(d3This).select<SVGPathElement>('path.wave-bottom');

			if (eventType === 'mousedown') {
				// Get current volume for this harmonic
				const volume = volumeValues.get(d.id) || 100;
				dispatch('noteon', { harmonic: d.harmonic, volume: volume });
				activeTimer = animateWave(topPath, bottomPath, d.harmonic, chartWidth, d.id);
			} else {
				dispatch('noteoff');
				// Use volume for static wave too
				const volume = volumeValues.get(d.id) || 100;
				const staticData = generateWaveData(d.harmonic, chartWidth, 0, volume);
				updateWavePaths(topPath, bottomPath, staticData);
			}
		};

		// Handle volume slider change
		const handleVolumeChange = (id: number, harmonic: number, event: Event) => {
			const target = event.target as HTMLInputElement;
			const newVolume = parseInt(target.value, 10);
			volumeValues.set(id, newVolume);
			volumeValues = new Map(volumeValues); // Force reactivity

			// Update the wave visualization immediately to reflect new volume
			const group = d3
				.select(container)
				.select('svg')
				.select('g')
				.selectAll('.harmonic')
				.filter((d: any) => d.id === id)
				.node();

			if (group) {
				const topPath = d3.select(group).select<SVGPathElement>('path.wave-top');
				const bottomPath = d3.select(group).select<SVGPathElement>('path.wave-bottom');

				// If currently animating, the animation will pick up the new volume
				// Otherwise, update the static wave
				if (!activeTimer) {
					const staticData = generateWaveData(harmonic, chartWidth, 0, newVolume);
					updateWavePaths(topPath, bottomPath, staticData);
				}
			}

			dispatch('volumechange', { harmonic: harmonic, volume: newVolume });
		};

		// --- D3 Data Binding and Element Creation ---
		const harmonicGroups = svg
			.selectAll('.harmonic')
			.data(series)
			.enter()
			.append('g')
			.attr('class', 'harmonic')
			.attr('transform', (d) => `translate(0, ${y(d.label)})`)
			.on('mousedown', function (event, d) {
				handleMouseEvent('mousedown', this, d);
			})
			.on('mouseup', function (event, d) {
				handleMouseEvent('mouseup', this, d);
			})
			.on('mouseleave', function (event, d) {
				handleMouseEvent('mouseleave', this, d);
			});

		harmonicGroups.append('path').attr('class', 'line').attr('d', `M0,0H${chartWidth}`);

		harmonicGroups
			.append('path')
			.attr('class', 'wave wave-top')
			.style('stroke', (d) => d.color);
		harmonicGroups
			.append('path')
			.attr('class', 'wave wave-bottom')
			.style('stroke', (d) => d.color);

		harmonicGroups.each(function (d) {
			const topPath = d3.select(this).select<SVGPathElement>('path.wave-top');
			const bottomPath = d3.select(this).select<SVGPathElement>('path.wave-bottom');
			const staticData = generateWaveData(d.harmonic, chartWidth, 0);
			updateWavePaths(topPath, bottomPath, staticData);
		});

		harmonicGroups
			.append('text')
			.attr('x', -10)
			.attr('dy', '0.35em')
			.attr('text-anchor', 'end')
			.attr('alignment-baseline', 'middle')
			.text((d) => d.label);

		// Add volume sliders if enabled
		if (showSliders) {
			harmonicGroups.each(function (d) {
				const group = d3.select(this);
				const foreignObject = group
					.append('foreignObject')
					.attr('x', 0)
					.attr('y', 20) // Position below the wave
					.attr('width', chartWidth)
					.attr('height', 40);

				const div = foreignObject.append('xhtml:div').attr('class', 'volume-control');

				// Get current volume value
				const currentVolume = volumeValues.get(d.id) || 100;

				// Add label
				div.append('xhtml:label').attr('for', `volume-${d.id}`).text(`Volume: ${currentVolume}%`);

				// Add slider
				const slider = div
					.append('xhtml:input')
					.attr('type', 'range')
					.attr('id', `volume-${d.id}`)
					.attr('min', 1)
					.attr('max', 100)
					.attr('value', currentVolume)
					.attr('class', 'volume-slider');

				// Add event listener
				const sliderNode = slider.node() as HTMLInputElement | null;
				if (sliderNode) {
					sliderNode.addEventListener('input', (event: Event) => {
						handleVolumeChange(d.id, d.harmonic, event);
						// Update label text
						const newVolume = (event.target as HTMLInputElement).value;
						div.select('label').text(`Volume: ${newVolume}%`);
					});
				}
			});
		}
	}
</script>

<div class="harmonic-container">
	<div class="chart" bind:this={container} style="height: {calculatedHeight}px;"></div>
	<div class="button-container">
		<button
			class="play-all-button"
			on:mousedown={startPlayAllHarmonics}
			on:mouseup={stopPlayAllHarmonics}
			on:mouseleave={stopPlayAllHarmonics}
			on:touchstart={startPlayAllHarmonics}
			on:touchend={stopPlayAllHarmonics}
		>
			Hold to Play All
		</button>
		<button
			class="toggle-sliders-button"
			on:click={() => {
				showSliders = !showSliders;
				dispatch('slidersvisibility', showSliders);
			}}
		>
			{showSliders ? 'Hide' : 'Show'} Volume Controls
		</button>
	</div>
</div>

<style>
	.harmonic-container {
		position: relative;
		width: 100%;
	}

	.chart {
		width: 100%;
		cursor: pointer;
	}

	.button-container {
		display: flex;
		gap: 10px;
		margin-top: 10px;
	}

	.play-all-button,
	.toggle-sliders-button {
		padding: 8px 12px;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 14px;
		transition: background-color 0.2s;
	}

	.play-all-button {
		background-color: #4caf50;
		color: white;
	}

	.play-all-button:hover {
		background-color: #45a049;
	}

	.toggle-sliders-button {
		background-color: #2196f3;
		color: white;
	}

	.toggle-sliders-button:hover {
		background-color: #0b7dda;
	}

	:global(.harmonic .line) {
		stroke: #ccc;
		stroke-width: 1;
	}

	:global(.harmonic .wave) {
		stroke-width: 2;
		fill: none;
	}

	:global(.harmonic text) {
		font-family: sans-serif;
		font-size: 14px;
		fill: #666;
	}

	:global(.volume-control) {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 5px 0;
	}

	:global(.volume-slider) {
		flex: 1;
		max-width: 150px;
	}
</style>
