/**
 * Read the whole human/ folder from disk into a `Content` (Node only).
 *
 *   human/site.md
 *   human/library/<paper-id>.md
 *   human/atlases/<slug>/atlas.md, kinds.md, milestones.md (or milestones/*.md),
 *                        branches.md, connections.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseAtlas, parsePaper, parseSite, Reporter, type AtlasFiles } from './parse.ts';
import { validate } from './validate.ts';
import type { Content } from './types.ts';

export const HUMAN_DIR = 'human';

function read(root: string, rel: string): { file: string; text: string } | undefined {
  const abs = path.join(root, rel);
  return fs.existsSync(abs) ? { file: rel, text: fs.readFileSync(abs, 'utf8') } : undefined;
}

function mdFiles(root: string, relDir: string): string[] {
  const abs = path.join(root, relDir);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_') && f.toLowerCase() !== 'readme.md')
    .sort()
    .map((f) => `${relDir}/${f}`);
}

export function loadContent(root: string): Content {
  const r = new Reporter();
  const human = HUMAN_DIR;

  const siteFile = read(root, `${human}/site.md`);
  if (!siteFile) r.error(`${human}/site.md`, 1, 'Missing human/site.md. Create it with a "# Title" line.');
  const site = parseSite(siteFile?.text ?? '# Atlas', `${human}/site.md`, r);

  const papers = mdFiles(root, `${human}/library`).map((file) => {
    const id = path.basename(file, '.md');
    return parsePaper(id, fs.readFileSync(path.join(root, file), 'utf8'), file, r);
  });

  const atlasesDir = path.join(root, human, 'atlases');
  const slugs = fs.existsSync(atlasesDir)
    ? fs
        .readdirSync(atlasesDir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && !d.name.startsWith('_') && !d.name.startsWith('.'))
        .map((d) => d.name)
        .sort()
    : [];

  const atlases = slugs.map((slug) => {
    const dir = `${human}/atlases/${slug}`;
    const milestoneFiles = [
      ...(read(root, `${dir}/milestones.md`) ? [`${dir}/milestones.md`] : []),
      ...mdFiles(root, `${dir}/milestones`),
    ];
    const files: AtlasFiles = {
      atlas: read(root, `${dir}/atlas.md`),
      kinds: read(root, `${dir}/kinds.md`),
      branches: read(root, `${dir}/branches.md`),
      connections: read(root, `${dir}/connections.md`),
      milestones: milestoneFiles.map((f) => read(root, f)!),
    };
    if (!files.milestones.length) r.warn(`${dir}/milestones.md`, 1, `Atlas "${slug}" has no milestones yet.`);
    return parseAtlas(slug, dir, files, r);
  });
  atlases.sort((a, b) => a.order - b.order || a.plainTitle.localeCompare(b.plainTitle));

  const content: Content = { site, atlases, papers, diagnostics: r.diagnostics };
  validate(content, r);
  content.diagnostics.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
  return content;
}
