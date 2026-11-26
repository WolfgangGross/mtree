/**
 * The real human/ folder must always parse without errors, and the engine's
 * lists of blocks must match what it can render.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadContent } from '../content/load';
import { DIRECTIVES, HERO_WIDGETS } from '../content/widgets';
import { parseArxivAtom } from '../content/arxiv';

const root = new URL('../..', import.meta.url).pathname;

describe('human/ content', () => {
  const content = loadContent(root);

  it('has no errors', () => {
    const errors = content.diagnostics.filter((d) => d.level === 'error');
    expect(errors, errors.map((e) => `${e.file}:${e.line} ${e.message}`).join('\n')).toEqual([]);
  });

  it('keeps every milestone placed and every connection pointing at real milestones', () => {
    for (const atlas of content.atlases) {
      const ids = new Set(atlas.milestones.map((m) => m.id));
      for (const c of atlas.connections) {
        expect(ids.has(c.from) && ids.has(c.to)).toBe(true);
      }
    }
  });

  it('ported the diffusion atlas completely', () => {
    const atlas = content.atlases.find((a) => a.slug === 'diffusion-to-action')!;
    expect(atlas.milestones).toHaveLength(28);
    expect(atlas.connections).toHaveLength(34);
    expect(atlas.branches.map((b) => b.short)).toEqual(['Foundations', 'Image & video', 'Robotics & action', 'FLUX 3 family']);
    expect(content.papers.length).toBeGreaterThanOrEqual(33);
  });
});

describe('engine registries', () => {
  it('every block named in widgets.ts has a component', () => {
    const src = readFileSync(new URL('../app/widgets/registry.tsx', import.meta.url), 'utf8');
    for (const name of Object.keys(DIRECTIVES)) expect(src, `missing block ${name}`).toMatch(new RegExp(`['"]?${name}['"]?:`));
    for (const name of Object.keys(HERO_WIDGETS)) expect(src, `missing hero ${name}`).toMatch(new RegExp(`['"]${name}['"]:`));
  });
});

describe('arXiv metadata', () => {
  it('reads the Atom feed', () => {
    const xml = `<feed><entry><id>http://arxiv.org/abs/2303.01469v2</id><published>2023-03-02T18:30:16Z</published>
      <title>Consistency
        Models</title><author><name>Yang Song</name></author><author><name>Prafulla Dhariwal</name></author>
      <category term="cs.LG"/></entry></feed>`;
    expect(parseArxivAtom(xml)).toEqual({ id: '2303.01469', title: 'Consistency Models', authors: ['Yang Song', 'Prafulla Dhariwal'], published: 'Mar 2023', categories: ['cs.LG'] });
    expect(parseArxivAtom('<feed></feed>')).toBeNull();
  });
});
