<script lang="ts">
	import * as d3 from 'd3';
	import { goto } from '$app/navigation';
	import inventionsData from '$lib/data/inventions.json';
	import erasData from '$lib/data/eras.json';

	let svgElement = $state<SVGSVGElement | null>(null);
	let width = $state(0);

	// --- Data Interfaces ---
	interface Invention {
		date: string;
		innovation: string;
		description: string;
		innovator: string;
		location: string;
		link: string;
		year: number;
		era: string;
		id: string;
	}

	interface Era {
		era: string;
		startYear: number;
		endYear: number;
		description: string;
		artists: { name: string; origin: string; wiki: string }[];
		wiki: string;
	}

	interface FlagDataItem extends Invention {
		pos: number;
	}

	// --- Pure Functions for Data Processing ---
	const parseYear = (date: string): number => {
		const bceMatch = date.match(/(\d+)\s*BCE/);
		if (bceMatch) return -parseInt(bceMatch[1], 10);
		const yearMatch = date.match(/\d+/);
		return yearMatch ? parseInt(yearMatch[0], 10) : 0;
	};

	const processEras = (rawEras: any[]): Era[] => {
		const currentYear = new Date().getFullYear();
		return rawEras
			.map((era) => ({ ...era, endYear: era.endYear === null ? currentYear : era.endYear }))
			.sort((a, b) => a.startYear - b.startYear);
	};

	const processInventions = (rawInventions: any[], eras: Era[]): Invention[] => {
		return rawInventions
			.map((d) => {
				const year = parseYear(d.date);
				const era = eras.find((e) => year >= e.startYear && year <= e.endYear)?.era || 'Unknown';
				return { ...d, year, era };
			})
			.sort((a, b) => a.year - b.year);
	};

	// --- Tooltip Management Factory ---
	const createTooltipManager = (tooltipId: string) => {
		let hideTimeout: number | undefined;
		const tooltipElement = d3.select<HTMLDivElement, unknown>(`#${tooltipId}`);

		const positionTooltip = (event: MouseEvent) => {
			const [x, y] = d3.pointer(event, document.body);
			tooltipElement.style('left', `${x + 15}px`).style('top', `${y + 20}px`);
		};

		const scheduleHide = () => {
			hideTimeout = window.setTimeout(() => {
				tooltipElement.style('opacity', 0).style('pointer-events', 'none');
			}, 200);
		};

		const cancelHide = () => {
			clearTimeout(hideTimeout);
		};

		const setupTooltipEvents = <T,>(
			selection: d3.Selection<any, T, any, any>,
			getTooltipContent: (d: T) => string,
			onMouseover?: (element: Element, d: T) => void,
			onMouseleave?: (element: Element, d: T) => void
		) => {
			selection
				.on('mouseover', (event: MouseEvent, d: T) => {
					cancelHide();
					tooltipElement.style('opacity', 1).style('pointer-events', 'auto');
					tooltipElement.html(getTooltipContent(d));
					positionTooltip(event);
					if (onMouseover) onMouseover(event.currentTarget as Element, d);
				})
				.on('mouseleave', (event: MouseEvent, d: T) => {
					scheduleHide();
					if (onMouseleave) onMouseleave(event.currentTarget as Element, d);
				});
		};

		return {
			setupTooltipEvents,
			scheduleHide,
			cancelHide
		};
	};

	// --- D3 Drawing Functions ---
	const getEraTooltipContent = (d: Era): string => {
		return (
			`<strong>${d.era} (${d.startYear} - ${d.endYear})</strong><br/><p>${d.description}</p><br/>` +
			`<strong>Key Artists:</strong><br/>` +
			d.artists
				.map((artist) => `<a href="${artist.wiki}" target="_blank">${artist.name}</a>`)
				.join('<br/>') +
			`<br/><br/><a href="${d.wiki}" target="_blank">Learn more on Wikipedia</a>`
		);
	};

	const drawTitle = (svg: d3.Selection<any, any, any, any>, x: number, y: number) => {
		svg
			.append('text')
			.attr('x', x)
			.attr('y', y)
			.attr('text-anchor', 'start')
			.style('font-size', '2em')
			.style('font-weight', 'bold')
			.text('Western Music Notation');
		svg
			.append('text')
			.attr('x', x)
			.attr('y', y + 30)
			.attr('text-anchor', 'start')
			.style('font-size', '1.3em')
			.text('An interactive history of communicating music');
	};

	const drawAxis = (
		svg: d3.Selection<any, any, any, any>,
		xScale: d3.ScaleLinear<number, number>,
		timelineY: number
	) => {
		svg
			.append('g')
			.attr('transform', `translate(0, ${timelineY})`)
			.call(d3.axisBottom(xScale).tickFormat(d3.format('d')));
	};

	const drawEraBands = (
		svg: d3.Selection<any, any, any, any>,
		xScale: d3.ScaleLinear<number, number>,
		eras: Era[],
		timelineY: number,
		tooltipManager: any
	) => {
		const eraRects = svg
			.append('g')
			.selectAll('rect')
			.data(eras)
			.join('rect')
			.attr('x', (d) => xScale(d.startYear))
			.attr('y', timelineY - 20)
			.attr('width', (d) => xScale(d.endYear) - xScale(d.startYear))
			.attr('height', 20)
			.attr('fill', (d, i) => (i % 2 === 0 ? 'steelblue' : 'darkorange'))
			.attr('fill-opacity', 0.3)
			.attr('stroke', '#ccc');
		tooltipManager.setupTooltipEvents(eraRects, getEraTooltipContent);
	};

	const drawEraLabels = (
		svg: d3.Selection<any, any, any, any>,
		xScale: d3.ScaleLinear<number, number>,
		eras: Era[],
		timelineY: number,
		width: number,
		tooltipManager: any
	) => {
		const yEra = (pos: number) => -25 - 15 * pos;
		const eraLabels = svg
			.append('g')
			.selectAll('g')
			.data(eras)
			.join('g')
			.attr('transform', (d) => `translate(${xScale(d.startYear)}, ${timelineY})`);

		eraLabels
			.append('line')
			.attr('y1', (d, i) => yEra(i))
			.attr('y2', 0)
			.attr('stroke', 'black');
		eraLabels
			.append('text')
			.attr('x', (d) => (xScale(d.startYear) < width / 2 ? 5 : -5))
			.attr('y', (d, i) => yEra(i))
			.attr('text-anchor', (d) => (xScale(d.startYear) < width / 2 ? 'start' : 'end'))
			.text((d) => d.era)
			.attr('font-size', '12px')
			.attr('font-weight', 'bold')
			.attr('alignment-baseline', 'middle');

		tooltipManager.setupTooltipEvents(eraLabels, getEraTooltipContent);
	};

	const drawInventionFlags = (
		svg: d3.Selection<any, any, any, any>,
		xScale: d3.ScaleLinear<number, number>,
		inventions: Invention[],
		timelineY: number,
		width: number,
		tooltipManager: any
	) => {
		const flagData: FlagDataItem[] = inventions.map((d, i) => ({ ...d, pos: i }));
		const yFlag = (pos: number) => 45 + 15 * (pos + 1);

		const flags = svg
			.append('g')
			.selectAll('g')
			.data(flagData)
			.join('g')
			.attr('transform', (d) => `translate(${xScale(d.year)}, ${timelineY})`)
			.on('click', (e, d) => goto(`/examples/${d.id}`));

		flags
			.append('line')
			.attr('y1', (d) => yFlag(d.pos))
			.attr('y2', 0)
			.attr('stroke', 'black');
		flags.append('circle').attr('r', 5).attr('fill', 'steelblue').style('cursor', 'pointer');
		flags
			.append('text')
			.attr('x', (d) => (xScale(d.year) < width / 2 ? 8 : -8))
			.attr('text-anchor', (d) => (xScale(d.year) < width / 2 ? 'start' : 'end'))
			.attr('y', (d) => yFlag(d.pos))
			.attr('alignment-baseline', 'middle')
			.text((d) => d.innovation)
			.attr('font-size', '12px');

		tooltipManager.setupTooltipEvents(
			flags,
			(d: FlagDataItem) =>
				`<strong>${d.innovation}</strong><br/><p>${d.description}</p><br/><em>${d.era} (${d.date})</em>`,
			(element: Element) =>
				d3.select(element).select('circle').transition().duration(150).attr('r', 8),
			(element: Element) =>
				d3.select(element).select('circle').transition().duration(150).attr('r', 5)
		);
	};

	// --- Component State & Svelte 5 Runes ---
	const eras = processEras(erasData);
	const inventions = processInventions(inventionsData, eras);
	let inventionTooltip: any;
	let eraTooltip: any;

	$effect(() => {
		if (width > 0 && svgElement) {
			const height = 400,
				marginLeft = 20,
				marginRight = 20;
			const timelineY = height / 2;

			const svg = d3.select(svgElement);
			svg.selectAll('*').remove();
			svg.attr('width', width).attr('height', height).attr('viewBox', [0, 0, width, height]);

			const allYears = [
				...inventions.map((d) => d.year),
				...eras.map((d) => d.startYear),
				...eras.map((d) => d.endYear)
			].filter((year): year is number => year !== null);
			const xScale = d3.scaleLinear(d3.extent(allYears) as [number, number], [
				marginLeft,
				width - marginRight
			]);

			inventionTooltip = createTooltipManager('timeline-tooltip');
			eraTooltip = createTooltipManager('era-tooltip');

			drawTitle(svg, marginLeft, 40);
			drawAxis(svg, xScale, timelineY);
			drawEraBands(svg, xScale, eras, timelineY, eraTooltip);
			drawEraLabels(svg, xScale, eras, timelineY, width, eraTooltip);
			drawInventionFlags(svg, xScale, inventions, timelineY, width, inventionTooltip);
		}
	});
</script>

<div class="chart-container" bind:clientWidth={width}>
	<svg bind:this={svgElement} />
</div>

<div
	id="timeline-tooltip"
	class="tooltip"
	role="tooltip"
	aria-hidden="true"
	onmouseover={() => inventionTooltip?.cancelHide()}
	onfocus={() => inventionTooltip?.cancelHide()}
	onmouseleave={() => inventionTooltip?.scheduleHide()}
	onblur={() => inventionTooltip?.scheduleHide()}
></div>

<div
	id="era-tooltip"
	class="tooltip"
	role="tooltip"
	aria-hidden="true"
	onmouseover={() => eraTooltip?.cancelHide()}
	onfocus={() => eraTooltip?.cancelHide()}
	onmouseleave={() => eraTooltip?.scheduleHide()}
	onblur={() => eraTooltip?.scheduleHide()}
></div>

<style>
	.chart-container {
		width: 100%;
	}

	.tooltip {
		position: absolute;
		opacity: 0;
		background-color: white;
		border: solid 1px black;
		border-radius: 5px;
		padding: 10px;
		pointer-events: none;
		font-size: 12px;
		max-width: 200px;
	}

	svg {
		display: block;
		max-width: 100%;
	}
</style>
