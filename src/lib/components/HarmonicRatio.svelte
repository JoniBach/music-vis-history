<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import * as d3 from 'd3';

	// --- Component Props ---
	export let series: { id: number; label: string; color: string; harmonic: number }[] = [];
	export let width = 800;
	export let height = 500;

	// --- Internal State ---
	let container: HTMLDivElement;
	const margin = { top: 40, right: 40, bottom: 40, left: 40 };
	let activeTimer: d3.Timer | null = null;

	// --- Event Dispatcher for Parent Communication ---
	const dispatch = createEventDispatcher<{ noteon: number; noteoff: void }>();

	// --- Pure Functions for Data Generation ---
	const generateWaveData = (harmonic: number, w: number, t: number): [number, number][] => {
		const amplitude = 20;
		const points = 150;
		return d3.range(points).map((i) => {
			const x = (i / (points - 1)) * w;
			const y = amplitude * Math.sin((x / w) * Math.PI * harmonic + t);
			return [x, y];
		});
	};

	const lineGenerator = d3.line<[number, number]>().x((d) => d[0]).y((d) => d[1]);

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
		w: number
	): d3.Timer => {
		let t = 0;
		return d3.timer(() => {
			const data = generateWaveData(harmonic, w, t);
			updateWavePaths(topPath, bottomPath, data);
			t += 0.1;
		});
	};

	// --- Component Lifecycle Hook ---
	onMount(() => {
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
				dispatch('noteon', d.harmonic);
				activeTimer = animateWave(topPath, bottomPath, d.harmonic, chartWidth);
			} else {
				dispatch('noteoff');
				const staticData = generateWaveData(d.harmonic, chartWidth, 0);
				updateWavePaths(topPath, bottomPath, staticData);
			}
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

		harmonicGroups.append('path').attr('class', 'wave wave-top').style('stroke', (d) => d.color);
		harmonicGroups.append('path').attr('class', 'wave wave-bottom').style('stroke', (d) => d.color);

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

		// --- Cleanup ---
		return () => {
			if (activeTimer) activeTimer.stop();
			d3.select(container).select('svg').remove();
		};
	});
</script>

<div class="chart" bind:this={container}></div>

<style>
	.chart {
		width: 100%;
		cursor: pointer;
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
</style>
