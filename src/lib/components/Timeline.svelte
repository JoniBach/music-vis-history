<script lang="ts">
	import * as d3 from 'd3';
	import { goto } from '$app/navigation';
	import inventionsData from '$lib/data/inventions.json';
	import erasData from '$lib/data/eras.json';

	let svgElement: SVGSVGElement | null = null;
	let width = 0;
	let hideEraTooltipTimeout: number;
	let hideInventionTooltipTimeout: number;

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
		artists: {
			name: string;
			origin: string;
			wiki: string;
		}[];
		wiki: string;
	}

	interface FlagDataItem extends Invention {
		pos: number;
	}

	// A helper function to parse the varied date formats in the JSON data
	const parseYear = (date: string): number => {
		const bceMatch = date.match(/(\d+)\s*BCE/);
		if (bceMatch) return -parseInt(bceMatch[1], 10);

		const yearMatch = date.match(/\d+/);
		return yearMatch ? parseInt(yearMatch[0], 10) : 0;
	};

	const currentYear = new Date().getFullYear();
	const eras: Era[] = erasData
		.map((era) => ({
			...era,
			endYear: era.endYear === null ? currentYear : era.endYear
		}))
		.sort((a, b) => a.startYear - b.startYear);

	const data: Invention[] = inventionsData
		.map((d) => {
			const year = parseYear(d.date);
			const era = eras.find((e) => year >= e.startYear && year <= e.endYear)?.era || 'Unknown';
			return {
				...d,
				year,
				era
			};
		})
		.sort((a, b) => a.year - b.year);

	const positionTooltip = (
		event: MouseEvent,
		tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>
	) => {
		const tooltipNode = tooltip.node();
		if (!tooltipNode) return;

		const tooltipWidth = tooltipNode.offsetWidth;
		const windowWidth = window.innerWidth;

		let left = event.pageX - tooltipWidth / 2;

		if (left < 0) {
			left = 0;
		} else if (left + tooltipWidth > windowWidth) {
			left = windowWidth - tooltipWidth;
		}

		tooltip.style('left', `${left}px`).style('top', `${event.pageY + 20}px`);
	};

	const drawAxis = (
		svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
		x: d3.ScaleLinear<number, number>,
		timelineY: number
	) => {
		svg
			.append('g')
			.attr('transform', `translate(0, ${timelineY})`)
			.call(d3.axisBottom(x).tickFormat(d3.format('d')));
	};

	const drawEraBands = (
		svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
		x: d3.ScaleLinear<number, number>,
		timelineY: number
	) => {
		const tooltip = d3.select<HTMLDivElement, unknown>('#era-tooltip');
		svg
			.append('g')
			.selectAll('rect')
			.data(eras)
			.join('rect')
			.attr('x', (d: Era) => x(d.startYear))
			.attr('y', timelineY - 20)
			.attr('width', (d: Era) => x(d.endYear) - x(d.startYear))
			.attr('height', 20)
			.attr('fill', (d: Era, i: number) => (i % 2 === 0 ? 'steelblue' : 'darkorange'))
			.attr('fill-opacity', 0.3)
			.attr('stroke', '#ccc')
			.on('mouseover', function (event: MouseEvent, d: Era) {
				clearTimeout(hideEraTooltipTimeout);
				tooltip.style('opacity', 1).style('pointer-events', 'auto');
				tooltip.html(
					`<strong>${d.era} (${d.startYear} - ${d.endYear})</strong><br/><p>${d.description}</p><br/>` +
						`<strong>Key Artists:</strong><br/>` +
						d.artists
							.map((artist) => `<a href="${artist.wiki}" target="_blank">${artist.name}</a>`)
							.join('<br/>') +
						`<br/><br/><a href="${d.wiki}" target="_blank">Learn more on Wikipedia</a>`
				);
				positionTooltip(event, tooltip);
			})
			.on('mouseleave', function () {
				hideEraTooltipTimeout = setTimeout(() => {
					tooltip.style('opacity', 0).style('pointer-events', 'none');
				}, 200);
			});
	};

	const drawEraLabels = (
		svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
		x: d3.ScaleLinear<number, number>,
		timelineY: number
	) => {
		const tooltip = d3.select<HTMLDivElement, unknown>('#era-tooltip');
		const yEra = (pos: number) => -25 - 15 * pos;
		const eraLabels = svg
			.append('g')
			.selectAll('g')
			.data(eras)
			.join('g')
			.attr('transform', (d: Era) => `translate(${x(d.startYear)}, ${timelineY})`)
			.on('mouseover', function (event: MouseEvent, d: Era) {
				clearTimeout(hideEraTooltipTimeout);
				tooltip.style('opacity', 1).style('pointer-events', 'auto');
				tooltip.html(
					`<strong>${d.era} (${d.startYear} - ${d.endYear})</strong><br/><p>${d.description}</p><br/>` +
						`<strong>Key Artists:</strong><br/>` +
						d.artists
							.map((artist) => `<a href="${artist.wiki}" target="_blank">${artist.name}</a>`)
							.join('<br/>') +
						`<br/><br/><a href="${d.wiki}" target="_blank">Learn more on Wikipedia</a>`
				);
				positionTooltip(event, tooltip);
			})
			.on('mouseleave', function () {
				hideEraTooltipTimeout = setTimeout(() => {
					tooltip.style('opacity', 0).style('pointer-events', 'none');
				}, 200);
			});

		eraLabels
			.append('line')
			.attr('y1', (d, i) => yEra(i))
			.attr('y2', 0)
			.attr('stroke', 'black');

		eraLabels
			.append('text')
			.attr('x', (d: Era) => (x(d.startYear) < width / 2 ? 5 : -5))
			.attr('y', (d, i) => yEra(i))
			.attr('text-anchor', (d: Era) => (x(d.startYear) < width / 2 ? 'start' : 'end'))
			.text((d: Era) => d.era)
			.attr('font-size', '12px')
			.attr('font-weight', 'bold')
			.attr('alignment-baseline', 'middle');
	};

	const drawInventionFlags = (
		svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
		x: d3.ScaleLinear<number, number>,
		timelineY: number
	) => {
		const tooltip = d3.select<HTMLDivElement, unknown>('#timeline-tooltip');
		const flagData: FlagDataItem[] = data.map((d, i) => ({ ...d, pos: i }));

		const flags = svg
			.append('g')
			.selectAll('g')
			.data(flagData)
			.join('g')
			.attr('transform', (d: FlagDataItem) => `translate(${x(d.year)}, ${timelineY})`)
			.style('cursor', 'pointer');

		flags
			.on('mouseover', function (event: MouseEvent, d: FlagDataItem) {
				clearTimeout(hideInventionTooltipTimeout);
				tooltip.style('opacity', 1).style('pointer-events', 'auto');
				d3.select(this as SVGGElement).select('circle');
				tooltip.html(
					`<strong>${d.innovation}</strong><br/><p>${d.description}</p><br/><em>${d.era} (${d.date})</em>`
				);
				positionTooltip(event, tooltip);
			})
			.on('mouseleave', function () {
				hideInventionTooltipTimeout = setTimeout(() => {
					tooltip.style('opacity', 0).style('pointer-events', 'none');
				}, 200);
				d3.select(this as SVGGElement)
					.select('circle')
					.attr('r', 5);
			})
			.on('click', function (event: MouseEvent, d: FlagDataItem) {
				goto(`/examples/${d.id}`);
			});

		const yFlag = (pos: number) => 15 * (pos + 1);

		flags
			.append('line')
			.attr('y1', (d: FlagDataItem) => yFlag(d.pos))
			.attr('y2', 0)
			.attr('stroke', 'black');
		flags.append('circle').attr('r', 5).attr('fill', 'steelblue').style('cursor', 'pointer');

		flags
			.append('text')
			.attr('x', (d: FlagDataItem) => (x(d.year) < width / 2 ? 8 : -8))
			.attr('text-anchor', (d: FlagDataItem) => (x(d.year) < width / 2 ? 'start' : 'end'))
			.attr('y', (d: FlagDataItem) => yFlag(d.pos))
			.attr('alignment-baseline', 'middle')
			.text((d: FlagDataItem) => d.innovation)
			.attr('font-size', '12px');
	};

	$: if (width && svgElement) {
		const height = 400;
		const marginRight = 20;
		const marginLeft = 20;
		const timelineY = height / 2; // 2

		const svg = d3.select(svgElement);
		svg.selectAll('*').remove();
		svg.attr('width', width).attr('height', height).attr('viewBox', [0, 0, width, height]);

		const allYears = [
			...data.map((d) => d.year),
			...eras.map((d) => d.startYear),
			...eras.map((d) => d.endYear)
		].filter((year): year is number => year !== null);
		const x = d3.scaleLinear(d3.extent(allYears) as [number, number], [
			marginLeft,
			width - marginRight
		]);

		drawAxis(svg, x, timelineY);
		drawEraBands(svg, x, timelineY);
		drawEraLabels(svg, x, timelineY);
		drawInventionFlags(svg, x, timelineY);
	}
</script>

<div class="chart-container" bind:clientWidth={width}>
	<svg bind:this={svgElement} />
</div>

<div
	id="timeline-tooltip"
	class="tooltip"
	role="tooltip"
	aria-hidden="true"
	on:mouseover={() => clearTimeout(hideInventionTooltipTimeout)}
	on:focus={() => clearTimeout(hideInventionTooltipTimeout)}
	on:mouseleave={() => {
		hideInventionTooltipTimeout = setTimeout(() => {
			d3.select('#timeline-tooltip').style('opacity', 0).style('pointer-events', 'none');
		}, 200);
	}}
	on:blur={() => {
		hideInventionTooltipTimeout = setTimeout(() => {
			d3.select('#timeline-tooltip').style('opacity', 0).style('pointer-events', 'none');
		}, 200);
	}}
></div>

<div
	id="era-tooltip"
	class="tooltip"
	role="tooltip"
	aria-hidden="true"
	on:mouseover={() => clearTimeout(hideEraTooltipTimeout)}
	on:focus={() => clearTimeout(hideEraTooltipTimeout)}
	on:mouseleave={() => {
		hideEraTooltipTimeout = setTimeout(() => {
			d3.select('#era-tooltip').style('opacity', 0).style('pointer-events', 'none');
		}, 200);
	}}
	on:blur={() => {
		hideEraTooltipTimeout = setTimeout(() => {
			d3.select('#era-tooltip').style('opacity', 0).style('pointer-events', 'none');
		}, 200);
	}}
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
		margin: 1rem auto;
		max-width: 100%;
	}
</style>
