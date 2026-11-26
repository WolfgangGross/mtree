/**
 * npm run new-atlas -- <folder-name> "Title of the atlas"
 * Creates human/atlases/<folder-name>/ with the five files of an atlas, ready to fill in.
 */
import fs from 'node:fs';
import path from 'node:path';

const [slug, ...titleWords] = process.argv.slice(2);
const title = titleWords.join(' ').trim();
if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug) || !title) {
  console.error('Usage: npm run new-atlas -- <folder-name> "Title of the atlas"\n  folder-name: lowercase words joined by dashes, e.g. llm-agents');
  process.exit(1);
}
const dir = path.join(process.cwd(), 'human', 'atlases', slug);
if (fs.existsSync(dir)) {
  console.error(`human/atlases/${slug} already exists.`);
  process.exit(1);
}
fs.mkdirSync(dir, { recursive: true });
const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

const files: Record<string, string> = {
  'atlas.md': `# ${title}

kicker:         Field guide / ${title}
updated:        ${today}
accent:         teal
hero:           noise-field
hero caption:   Field
hero stages:    Noise, Structure

One or two sentences: what question does this atlas answer?

[Explore the tech tree](#tree)

## The technology tree
id:      tree
kicker:  Explore the research
nav:     Tech tree
intro:   Select a milestone to inspect its mechanism, connections and primary sources.

::tree

## Source index
id:      sources
kicker:  References
nav:     Sources
intro:   The papers, posts and reports behind the tree.

::sources
`,
  'kinds.md': `# Kinds

<!-- Shapes: diamond, square, dot, triangle, ring, bar. Colours: violet, slate, green, amber, rose, teal, ink, or #hex. -->

## Kinds of milestone

- **Method** \`method\` — diamond, violet
- **System** \`system\` — dot, teal

## Kinds of connection

- **builds on** — solid line, "Documented use": a method, dataset or model is explicitly reused.
- **relates to** — dashed line, "Related idea": a parallel or a precedent.
`,
  'milestones.md': `# Milestones

<!--
One "## Title" per milestone:

## Attention
id:       attention
date:     Sep 2014
kind:     method
sources:  bahdanau-2014

What did it unlock? One sentence.

### Mechanism
How it works, in a few sentences.

### Why it matters
What it made possible next.
-->
`,
  'branches.md': `# Branches

<!--
One "## Branch" per tab. The indented block places milestone ids on a grid, "·" is an empty cell.

## Foundations
short:      Foundations
icon:       layers
summary:    Where it starts
starts at:  attention

    attention   ·
    ·           transformer
-->
`,
  'connections.md': `# Connections

<!--
One line per connection, later idea first:
- Transformer builds on Attention: the whole architecture is attention.
-->
`,
};

for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), text);
console.log(`Created human/atlases/${slug}/ (${Object.keys(files).join(', ')}).\nOpen http://localhost:5199/atlas/${slug} with "npm run dev" and start writing milestones.`);
