<script>
	import { onMount } from 'svelte';
</script>

<svelte:head>
	<title>Examples - The History of Written Music</title>
	<meta
		name="description"
		content="Explore the fascinating evolution of musical notation from ancient symbols to modern staff notation through interactive examples."
	/>
</svelte:head>

<div class="content">
	<header class="hero">
		<h1>The Story of Written Music</h1>
		<p class="subtitle">How humanity learned to capture sound on paper</p>
	</header>

	<section class="introduction">
		<div class="intro-content">
			<p class="lead">
				Imagine trying to teach someone your favorite song without being able to hum it, sing it, or
				play it for them. For thousands of years, this was exactly the challenge musicians faced.
				Music existed only in the moment it was performed, living in memory and passed down through
				generations like stories around a campfire.
			</p>

			<p>
				The invention of musical notation—the ability to write down music—was as revolutionary as
				the invention of writing itself. It transformed music from something fleeting into something
				permanent, from local traditions into global languages, and from simple melodies into
				complex symphonies that could be precisely recreated centuries later.
			</p>
		</div>
	</section>

	<section class="journey">
		<h2>A Journey Through Time</h2>

		<div class="timeline-intro">
			<p>
				This journey spans over 4,000 years, from ancient Mesopotamian clay tablets to today's
				digital music software. Along the way, we'll meet monks who revolutionized how we think
				about pitch, mathematicians who discovered the secrets of harmony, and inventors who created
				the tools that made modern music possible.
			</p>
		</div>

		<div class="era-grid">
			<div class="era-card">
				<div class="era-icon"></div>
				<h3>Ancient Beginnings</h3>
				<p class="era-period">3400 BCE - 500 CE</p>
				<p>
					The first attempts to capture music in symbols. From Sumerian hymns carved in stone to
					Greek mathematical theories about harmony, ancient civilizations laid the groundwork for
					everything that followed.
				</p>
			</div>

			<div class="era-card">
				<div class="era-icon"></div>
				<h3>Medieval Innovation</h3>
				<p class="era-period">500 - 1400 CE</p>
				<p>
					Monks and scholars created the foundation of modern notation. They invented the staff,
					developed ways to show rhythm, and established the system we still use today to represent
					pitch and timing.
				</p>
			</div>

			<div class="era-card">
				<div class="era-icon"></div>
				<h3>Renaissance & Beyond</h3>
				<p class="era-period">1400 - Present</p>
				<p>
					The printing press democratized music, composers pushed notation to its limits, and the
					digital age opened up entirely new possibilities for how we create, share, and experience
					music.
				</p>
			</div>
		</div>
	</section>

	<section class="why-matters">
		<h2>Why This Story Matters</h2>

		<div class="importance-grid">
			<div class="importance-item">
				<h3>Music as Language</h3>
				<p>
					Just like written language allowed ideas to spread across time and space, musical notation
					allowed melodies and harmonies to travel from mind to mind, generation to generation.
				</p>
			</div>

			<div class="importance-item">
				<h3>Cognitive Revolution</h3>
				<p>
					Writing music down changed how people thought about it. It became something you could
					analyze, modify, and perfect—turning music from pure art into a blend of art and science.
				</p>
			</div>

			<div class="importance-item">
				<h3>Cultural Bridge</h3>
				<p>
					Notation systems reflect the values, technologies, and worldviews of their creators. By
					studying them, we gain insight into how different cultures understood time, space, and
					beauty.
				</p>
			</div>

			<div class="importance-item">
				<h3>Future Foundations</h3>
				<p>
					Understanding how notation evolved helps us imagine where it might go next. From AI
					composition to virtual reality performances, the future builds on the past.
				</p>
			</div>
		</div>
	</section>

	<section class="explore-invitation">
		<div class="invitation-content">
			<h2>Ready to Explore?</h2>
			<p>
				The pages that follow will take you on an interactive journey through this remarkable story.
				You'll see how ancient symbols evolved into modern notes, experiment with different notation
				systems, and discover how each innovation solved specific problems that musicians faced.
			</p>

			<p>
				Each example is designed to be hands-on—you can click, listen, and experiment. No musical
				background required, just curiosity about one of humanity's most beautiful and practical
				inventions.
			</p>

			<div class="next-steps">
				<h3>What You'll Discover:</h3>
				<ul>
					<li>How medieval monks solved the problem of teaching melodies across vast distances</li>
					<li>Why the musical staff has exactly five lines (and not four or six)</li>
					<li>How mathematical ratios became the foundation of harmony</li>
					<li>The surprising connections between music notation and computer programming</li>
					<li>How different cultures developed completely different approaches to writing music</li>
				</ul>
			</div>
		</div>
	</section>

</div>


<style>
	.tonnetz-container {
		width: 100%;
		max-width: 1200px;
		min-width: 320px;
		margin: 0 auto;
		padding: 0;
		box-sizing: border-box;
	}

	.tonnetz-container svg {
		width: 100%;
		height: auto;
		display: block;
		border: 1px solid #dee2e6;
		border-radius: 8px;
		background: white;
	}

	.controls {
		margin: 20px 0;
		padding: 15px;
		background: #f8f9fa;
		border-radius: 8px;
		border: 1px solid #dee2e6;
		display: flex;
		gap: 20px;
		flex-wrap: wrap;
		align-items: center;
	}

	.control-group {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.control-group label {
		font-weight: 500;
		min-width: 100px;
	}

	.control-group input[type='range'] {
		width: 100px;
	}

	.control-group span {
		font-weight: bold;
		min-width: 20px;
		text-align: center;
	}

	.content {
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 1rem;
		max-width: 800px;
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


