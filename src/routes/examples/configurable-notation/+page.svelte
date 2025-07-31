<script lang="ts">
	import ConfigurableNotation, { type NotationConfig } from '$lib/components/ConfigurableNotation.svelte';

	// Example configurations for different historical periods and note types
	const examples: { title: string; description: string; config: NotationConfig }[] = [
		{
			title: "Classical Crotchet on 5-line Staff",
			description: "A quarter note (crotchet) at C4 position on a traditional 5-line staff with treble clef",
			config: {
				stave: {
					lines: 5,
					clef: 'treble',
					width: 300
				},
				note: {
					type: 'crotchet',
					pitch: 'C4'
				},
				style: {
					scale: 1,
					showPitchLabel: true
				}
			}
		},
		{
			title: "Medieval Punctum on 4-line Staff",
			description: "A punctum (basic medieval note) at F4 position on a 4-line staff (common in Gregorian chant)",
			config: {
				stave: {
					lines: 4,
					clef: 'none',
					width: 300
				},
				note: {
					type: 'punctum',
					pitch: 'F4'
				},
				style: {
					scale: 1,
					color: '#8B4513',
					showPitchLabel: true
				}
			}
		},
		{
			title: "Punctum Deminutum on 4-line Staff",
			description: "A punctum deminutum (half-filled medieval note) at G4 position",
			config: {
				stave: {
					lines: 4,
					clef: 'none',
					width: 300
				},
				note: {
					type: 'punctum_deminutum',
					pitch: 'G4'
				},
				style: {
					scale: 1,
					color: '#8B4513',
					showPitchLabel: true
				}
			}
		},
		{
			title: "Podatus on 2-line Staff",
			description: "A podatus (ascending two-note neume) on a simple 2-line staff",
			config: {
				stave: {
					lines: 2,
					clef: 'none',
					width: 250
				},
				note: {
					type: 'podatus',
					pitch: 'G4'
				},
				style: {
					scale: 1.2,
					color: '#654321',
					showPitchLabel: true
				}
			}
		},
		{
			title: "High Note with Ledger Lines",
			description: "A crotchet at F5 position, demonstrating ledger lines above the staff",
			config: {
				stave: {
					lines: 5,
					clef: 'treble',
					width: 300
				},
				note: {
					type: 'crotchet',
					pitch: 'F5'
				},
				style: {
					scale: 1,
					showPitchLabel: true
				}
			}
		},
		{
			title: "Low Note with Ledger Lines",
			description: "A minim at A3 position, demonstrating ledger lines below the staff",
			config: {
				stave: {
					lines: 5,
					clef: 'treble',
					width: 300
				},
				note: {
					type: 'minim',
					pitch: 'A3'
				},
				style: {
					scale: 1,
					showPitchLabel: true
				}
			}
		},
		{
			title: "Quaver with Flag",
			description: "An eighth note (quaver) with stem and flag at E4 position",
			config: {
				stave: {
					lines: 5,
					clef: 'treble',
					width: 300
				},
				note: {
					type: 'quaver',
					pitch: 'E4'
				},
				style: {
					scale: 1,
					showPitchLabel: true
				}
			}
		},
		{
			title: "Bass Clef Example",
			description: "A crotchet at C3 position on a bass clef staff",
			config: {
				stave: {
					lines: 5,
					clef: 'bass',
					width: 300
				},
				note: {
					type: 'crotchet',
					pitch: 'C3'
				},
				style: {
					scale: 1,
					showPitchLabel: true
				}
			}
		}
	];

	// Interactive configuration
	let customConfig: NotationConfig = {
		stave: {
			lines: 5,
			clef: 'treble',
			width: 300
		},
		note: {
			type: 'crotchet',
			pitch: 'C4'
		},
		style: {
			scale: 1,
			showPitchLabel: true
		}
	};

	const noteTypes = [
		'crotchet', 'minim', 'semibreve', 'quaver',
		'punctum', 'punctum_deminutum', 'podatus', 'clivis'
	];

	const clefTypes = ['treble', 'bass', 'alto', 'none'];
	const pitches = ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5'];
</script>

<svelte:head>
	<title>Configurable Music Notation Examples</title>
</svelte:head>

<div class="container">
	<h1>Configurable Music Notation Component</h1>
	<p class="intro">
		This component demonstrates flexible music notation rendering using the Bravura font, 
		supporting different historical periods from medieval to classical notation styles.
	</p>

	<section class="examples">
		<h2>Examples</h2>
		<div class="examples-grid">
			{#each examples as example}
				<div class="example-card">
					<h3>{example.title}</h3>
					<p class="description">{example.description}</p>
					<div class="notation-display">
						<ConfigurableNotation config={example.config} width={350} height={150} />
					</div>
					<details class="config-details">
						<summary>View Configuration</summary>
						<pre class="config-code">{JSON.stringify(example.config, null, 2)}</pre>
					</details>
				</div>
			{/each}
		</div>
	</section>

	<section class="interactive">
		<h2>Interactive Configuration</h2>
		<p>Customize the notation below by adjusting the configuration options:</p>
		
		<div class="controls-and-display">
			<div class="controls">
				<div class="control-group">
					<h4>Staff Configuration</h4>
					<label>
						Lines:
						<select bind:value={customConfig.stave.lines}>
							<option value={2}>2 lines</option>
							<option value={4}>4 lines</option>
							<option value={5}>5 lines</option>
						</select>
					</label>
					<label>
						Clef:
						<select bind:value={customConfig.stave.clef}>
							{#each clefTypes as clef}
								<option value={clef}>{clef}</option>
							{/each}
						</select>
					</label>
				</div>

				<div class="control-group">
					<h4>Note Configuration</h4>
					<label>
						Note Type:
						<select bind:value={customConfig.note.type}>
							{#each noteTypes as noteType}
								<option value={noteType}>{noteType}</option>
							{/each}
						</select>
					</label>
					<label>
						Pitch:
						<select bind:value={customConfig.note.pitch}>
							{#each pitches as pitch}
								<option value={pitch}>{pitch}</option>
							{/each}
						</select>
					</label>
				</div>

				<div class="control-group">
					<h4>Style Options</h4>
					<label>
						Scale:
						<input type="range" min="0.5" max="2" step="0.1" bind:value={customConfig.style.scale} />
						<span>{customConfig.style.scale}</span>
					</label>
					<label>
						<input type="checkbox" bind:checked={customConfig.style.showPitchLabel} />
						Show Pitch Label
					</label>
				</div>
			</div>

			<div class="display">
				<ConfigurableNotation config={customConfig} width={400} height={200} />
			</div>
		</div>

		<div class="current-config">
			<h4>Current Configuration:</h4>
			<pre class="config-code">{JSON.stringify(customConfig, null, 2)}</pre>
		</div>
	</section>

	<section class="usage">
		<h2>Usage</h2>
		<p>To use this component in your Svelte application:</p>
		<pre class="usage-code"><code>{`<script>
  import ConfigurableNotation from '$lib/components/ConfigurableNotation.svelte';
  
  const config = {
    stave: {
      lines: 5,
      clef: 'treble',
      width: 300
    },
    note: {
      type: 'crotchet',
      pitch: 'C4'
    },
    style: {
      scale: 1,
      showPitchLabel: true
    }
  };
</script>

<ConfigurableNotation {config} width={400} height={200} />`}</code></pre>
	</section>
</div>

<style>
	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
		font-family: system-ui, sans-serif;
	}

	.intro {
		font-size: 1.1rem;
		color: #666;
		margin-bottom: 2rem;
	}

	.examples-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
		gap: 2rem;
		margin-bottom: 3rem;
	}

	.example-card {
		border: 1px solid #ddd;
		border-radius: 8px;
		padding: 1.5rem;
		background: #fafafa;
	}

	.example-card h3 {
		margin-top: 0;
		color: #333;
	}

	.description {
		color: #666;
		font-size: 0.9rem;
		margin-bottom: 1rem;
	}

	.notation-display {
		background: white;
		border: 1px solid #eee;
		border-radius: 4px;
		margin-bottom: 1rem;
	}

	.config-details {
		margin-top: 1rem;
	}

	.config-details summary {
		cursor: pointer;
		color: #0066cc;
		font-size: 0.9rem;
	}

	.config-code {
		background: #f5f5f5;
		border: 1px solid #ddd;
		border-radius: 4px;
		padding: 1rem;
		font-size: 0.8rem;
		overflow-x: auto;
		margin-top: 0.5rem;
	}

	.interactive {
		border-top: 2px solid #eee;
		padding-top: 2rem;
		margin-top: 3rem;
	}

	.controls-and-display {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
		margin-bottom: 2rem;
	}

	.controls {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.control-group {
		background: #f9f9f9;
		padding: 1rem;
		border-radius: 6px;
		border: 1px solid #eee;
	}

	.control-group h4 {
		margin-top: 0;
		margin-bottom: 1rem;
		color: #333;
	}

	.control-group label {
		display: block;
		margin-bottom: 0.5rem;
		font-size: 0.9rem;
	}

	.control-group select,
	.control-group input[type="range"] {
		width: 100%;
		padding: 0.3rem;
		margin-top: 0.2rem;
	}

	.control-group input[type="checkbox"] {
		width: auto;
		margin-right: 0.5rem;
	}

	.display {
		background: white;
		border: 1px solid #ddd;
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.current-config {
		background: #f5f5f5;
		border: 1px solid #ddd;
		border-radius: 6px;
		padding: 1rem;
	}

	.current-config h4 {
		margin-top: 0;
	}

	.usage {
		border-top: 2px solid #eee;
		padding-top: 2rem;
		margin-top: 3rem;
	}

	.usage-code {
		background: #f8f8f8;
		border: 1px solid #ddd;
		border-radius: 6px;
		padding: 1.5rem;
		overflow-x: auto;
		font-size: 0.9rem;
	}

	@media (max-width: 768px) {
		.examples-grid {
			grid-template-columns: 1fr;
		}
		
		.controls-and-display {
			grid-template-columns: 1fr;
		}
	}
</style>
