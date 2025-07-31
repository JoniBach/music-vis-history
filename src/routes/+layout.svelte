<script>
</script>

<slot />

<style>
	@font-face {
		font-family: 'Bravura';
		src: url('/fonts/Bravura.otf') format('opentype');
	}
	@font-face {
		font-family: 'BravuraText';
		src: url('/fonts/BravuraText.otf') format('opentype');
	}

	:global(.smuFL) {
		font-family: 'Bravura';
	}

	:global(body) {
		font-family: 'Roboto', sans-serif;
		box-sizing: border-box;
		margin: 0;
		padding: 0;
	}

	:global(*) {
		box-sizing: border-box;
	}
</style>
