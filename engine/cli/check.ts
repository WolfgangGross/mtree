/**
 * npm run check — read everything in human/ and report problems with file:line.
 * Exits 1 when there are errors, so agents and CI can rely on it.
 */
import { loadContent } from '../content/load.ts';

const root = process.cwd();
const started = performance.now();
const content = loadContent(root);
const errors = content.diagnostics.filter((d) => d.level === 'error');
const warnings = content.diagnostics.filter((d) => d.level === 'warning');

const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;

for (const d of content.diagnostics) {
  const tag = d.level === 'error' ? red('error  ') : yellow('warning');
  console.log(`${tag} ${d.file}:${d.line}  ${d.message}`);
}

const milestones = content.atlases.reduce((n, a) => n + a.milestones.length, 0);
const connections = content.atlases.reduce((n, a) => n + a.connections.length, 0);
const notes = content.papers.filter((p) => p.notes.trim() || p.highlights.length).length;
console.log(
  dim(
    `\n${content.atlases.length} atlas${content.atlases.length === 1 ? '' : 'es'} · ${milestones} milestones · ${connections} connections · ` +
      `${content.papers.length} papers (${notes} with notes) · ${Math.round(performance.now() - started)} ms`,
  ),
);
if (errors.length) {
  console.log(red(`✗ ${errors.length} error${errors.length === 1 ? '' : 's'}`) + (warnings.length ? yellow(`, ${warnings.length} warning${warnings.length === 1 ? '' : 's'}`) : ''));
  process.exit(1);
}
console.log(green('✓ human/ is valid') + (warnings.length ? yellow(` (${warnings.length} warning${warnings.length === 1 ? '' : 's'})`) : ''));
