/**
 * npm run add-paper -- <arXiv link or id> [file-name]
 * Fetches title, authors and date from arXiv and creates human/library/<file-name>.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fetchArxiv, formatAuthors } from '../content/arxiv.ts';
import { paperIdFrom, paperTemplate } from '../content/edit.ts';
import { loadContent } from '../content/load.ts';

const [input, wanted] = process.argv.slice(2);
if (!input) {
  console.error('Usage: npm run add-paper -- <arXiv link or id> [file-name]');
  process.exit(1);
}
const root = process.cwd();
const libDir = path.join(root, 'human', 'library');
const meta = await fetchArxiv(input).catch((e: Error) => {
  console.error(e.message);
  process.exit(1);
});
const existing = loadContent(root).papers.find((p) => p.arxiv.replace(/v\d+$/, '') === meta.id);
if (existing) {
  console.log(`Already in the library: human/library/${existing.id}.md`);
  process.exit(0);
}
const taken = new Set(fs.readdirSync(libDir).map((f) => f.replace(/\.md$/, '')));
const id = wanted && /^[a-z0-9][a-z0-9-]*$/.test(wanted) && !taken.has(wanted) ? wanted : paperIdFrom(meta.title, taken, meta.authors[0], meta.published.slice(-4));
fs.writeFileSync(
  path.join(libDir, `${id}.md`),
  paperTemplate({ title: meta.title, authors: formatAuthors(meta.authors), published: meta.published, type: 'paper', arxiv: meta.id, status: 'to read', added: new Date().toISOString().slice(0, 10) }),
);
console.log(`Added human/library/${id}.md — ${meta.title} (${meta.published}). Cite it as [@${id}].`);
