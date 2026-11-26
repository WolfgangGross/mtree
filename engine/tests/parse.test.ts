import { describe, expect, it } from 'vitest';
import { parseDoc, firstCodeBlock, slugify } from '../content/doc';
import { parseAtlas, parseBlocks, parseHighlight, parseKinds, parseMilestones, parsePaper, citeAsFrom, Reporter } from '../content/parse';
import { parseWhen } from '../content/dates';

const KINDS = `# Kinds

## Kinds of milestone
- **Diffusion** \`diffusion\` — diamond, violet
- **Robots** \`robot\` — dot, #336699

## Kinds of connection
- **builds on** — solid line, "Documented use": explicitly reused.
- **relates to** — dashed line, "Related idea": a parallel.
`;

const MILESTONES = `# Milestones

<!-- a comment that must not become content -->

## DDPM
id:       ddpm
date:     Jun 2020
kind:     diffusion
sources:  ddpm, other

Predict the noise.

### Mechanism
Pick a clean image.

### Why it matters
Coarse and fine.

## Diffusion Policy
date: Mar 2023
kind: robot

Denoise actions.
`;

const BRANCHES = `# Branches

## Diffusion foundations
short:      Foundations
icon:       layers
starts at:  ddpm

    ddpm   ·
    ·      diffusion-policy
`;

const CONNECTIONS = `# Connections

## Group
- Diffusion Policy builds on DDPM: applies denoising to actions.
- ddpm relates to Diffusion Policy — reversed on purpose
- Nothing here has a verb
`;

describe('doc reader', () => {
  it('splits title, facts, body and sections with true line numbers', () => {
    const doc = parseDoc(MILESTONES);
    expect(doc.title).toBe('Milestones');
    expect(doc.sections.map((s) => s.title)).toEqual(['DDPM', 'Diffusion Policy']);
    const ddpm = doc.sections[0];
    expect(ddpm.line).toBe(5);
    expect(ddpm.facts.map((f) => [f.key, f.value, f.line])).toEqual([
      ['id', 'ddpm', 6],
      ['date', 'Jun 2020', 7],
      ['kind', 'diffusion', 8],
      ['sources', 'ddpm, other', 9],
    ]);
    expect(ddpm.bodyLine).toBe(11);
    expect(ddpm.body.startsWith('Predict the noise.')).toBe(true);
  });

  it('ignores headings inside fenced code', () => {
    const doc = parseDoc('# T\n\n```\n## not a heading\n```\n\n## Real\nbody');
    expect(doc.sections.map((s) => s.title)).toEqual(['Real']);
  });

  it('does not treat URLs or prose with colons as facts', () => {
    const doc = parseDoc('# T\n\n## A\nSee https://example.com for more.\n');
    expect(doc.sections[0].facts).toEqual([]);
  });

  it('reads indented and fenced code blocks', () => {
    expect(firstCodeBlock('text\n\n    a  b\n    c\n', 10)).toEqual({ code: 'a  b\nc', line: 12 });
    expect(firstCodeBlock('```\nx y\n```', 3)).toEqual({ code: 'x y', line: 4 });
  });

  it('slugifies titles', () => {
    expect(slugify('Image & video')).toBe('image-and-video');
    expect(slugify('FLUX 3 family')).toBe('flux-3-family');
  });
});

describe('parsers', () => {
  it('parses kinds and connection kinds', () => {
    const r = new Reporter();
    const { kinds, linkKinds } = parseKinds(KINDS, 'kinds.md', r);
    expect(r.diagnostics).toEqual([]);
    expect(kinds).toMatchObject([
      { id: 'diffusion', label: 'Diffusion', shape: 'diamond', color: 'violet' },
      { id: 'robot', label: 'Robots', shape: 'dot', color: '#336699' },
    ]);
    expect(linkKinds).toMatchObject([
      { verb: 'builds on', style: 'solid', label: 'Documented use' },
      { verb: 'relates to', style: 'dashed', label: 'Related idea' },
    ]);
  });

  it('parses milestones with parts, default ids and decimal dates', () => {
    const r = new Reporter();
    const [ddpm, policy] = parseMilestones(MILESTONES, 'm.md', r);
    expect(ddpm).toMatchObject({ id: 'ddpm', title: 'DDPM', kind: 'diffusion', sources: ['ddpm', 'other'], lead: 'Predict the noise.' });
    expect(ddpm.parts.map((p) => p.heading)).toEqual(['Mechanism', 'Why it matters']);
    expect(ddpm.when).toBeCloseTo(2020 + 5.5 / 12);
    expect(policy.id).toBe('diffusion-policy');
    expect(r.diagnostics).toEqual([]);
  });

  it('warns about unknown facts instead of failing', () => {
    const r = new Reporter();
    parseMilestones('# M\n\n## X\nid: x\ncolour: red\n\nLead.', 'm.md', r);
    expect(r.diagnostics[0]).toMatchObject({ level: 'warning', line: 5 });
    expect(r.diagnostics[0].message).toContain('Unknown fact "colour"');
    expect(r.diagnostics.every((d) => d.level === 'warning')).toBe(true);
  });

  it('assembles an atlas and reports bad connection lines with their line number', () => {
    const r = new Reporter();
    const atlas = parseAtlas(
      'demo',
      'human/atlases/demo',
      {
        atlas: { file: 'atlas.md', text: '# Demo *atlas*\nkicker: Test\n\nSummary here.\n\n[Go](#tree)\n\n## Tree\nid: tree\n\n::tree\n' },
        kinds: { file: 'kinds.md', text: KINDS },
        milestones: [{ file: 'm.md', text: MILESTONES }],
        branches: { file: 'b.md', text: BRANCHES },
        connections: { file: 'c.md', text: CONNECTIONS },
      },
      r,
    );
    expect(atlas.plainTitle).toBe('Demo atlas');
    expect(atlas.actions).toEqual([{ label: 'Go', href: '#tree' }]);
    expect(atlas.summary).toBe('Summary here.');
    expect(atlas.branches[0]).toMatchObject({ id: 'foundations', start: 'ddpm', grid: [['ddpm', null], [null, 'diffusion-policy']] });
    expect(atlas.connections).toMatchObject([
      { from: 'ddpm', to: 'diffusion-policy', verb: 'builds on', note: 'applies denoising to actions.', loc: { line: 4 } },
      { from: 'diffusion-policy', to: 'ddpm', verb: 'relates to', note: 'reversed on purpose' },
    ]);
    expect(r.diagnostics).toMatchObject([{ level: 'error', file: 'c.md', line: 6 }]);
    expect(atlas.sections[0].blocks).toMatchObject([{ type: 'directive', name: 'tree' }]);
  });

  it('splits section bodies into prose and directives', () => {
    const r = new Reporter();
    const blocks = parseBlocks('Intro text.\n\n:::bars Title\nA: 1%\n:::\n\nAfter.\n\n::sources', 20, 'a.md', r);
    expect(blocks).toMatchObject([
      { type: 'prose', md: 'Intro text.', loc: { line: 20 } },
      { type: 'directive', name: 'bars', args: 'Title', body: 'A: 1%', loc: { line: 22 } },
      { type: 'prose', md: 'After.', loc: { line: 26 } },
      { type: 'directive', name: 'sources', loc: { line: 28 } },
    ]);
    parseBlocks(':::bars\nnever closed', 1, 'a.md', r);
    expect(r.diagnostics[0].message).toContain('never closed');
  });

  it('parses a paper with notes, highlights and other sections', () => {
    const r = new Reporter();
    const p = parsePaper(
      'ddpm',
      '# Denoising Diffusion Probabilistic Models\n\nauthors:  Jonathan Ho, Ajay Jain, Pieter Abbeel\npublished: Jun 2020\narxiv: https://arxiv.org/abs/2006.11239v2\nstatus: reading\ntags: diffusion, foundations\n\nShort summary.\n\n## Notes\n\nMy notes.\n\n## Highlights\n\n- p. 4 — "a quote" — my comment\n- §3.2 — just a comment\n\n## Questions\n\nWhy?\n',
      'human/library/ddpm.md',
      r,
    );
    expect(r.diagnostics).toEqual([]);
    expect(p).toMatchObject({ arxiv: '2006.11239v2', citeAs: 'Ho, Jain & Abbeel', year: 2020, status: 'reading', tags: ['diffusion', 'foundations'], summary: 'Short summary.', notes: 'My notes.' });
    expect(p.highlights).toMatchObject([
      { locator: 'p. 4', quote: 'a quote', comment: 'my comment', loc: { line: 17 } },
      { locator: '§3.2', quote: '', comment: 'just a comment' },
    ]);
    expect(p.extra).toMatchObject([{ heading: 'Questions', body: 'Why?' }]);
    expect(p.links.pdf).toBe('https://arxiv.org/pdf/2006.11239v2');
  });

  it('reads highlights written in different shapes', () => {
    expect(parseHighlight('- “curly quote”', 'f', 1)).toMatchObject({ locator: '', quote: 'curly quote', comment: '' });
    expect(parseHighlight('- Figure 2 — the architecture', 'f', 1)).toMatchObject({ locator: 'Figure 2', quote: '', comment: 'the architecture' });
    expect(parseHighlight('- just a thought', 'f', 1)).toMatchObject({ locator: '', comment: 'just a thought' });
    expect(parseHighlight('not a list item', 'f', 1)).toBeNull();
  });

  it('derives a citation name from authors', () => {
    expect(citeAsFrom('Jonathan Ho, Ajay Jain, Pieter Abbeel')).toBe('Ho, Jain & Abbeel');
    expect(citeAsFrom('Chelsea Finn, Sergey Levine')).toBe('Finn & Levine');
    expect(citeAsFrom('Kevin Black, Noah Brown, Danny Driess et al.')).toBe('Black et al.');
    expect(citeAsFrom('Chefer et al.')).toBe('Chefer et al.');
    expect(citeAsFrom('Black Forest Labs')).toBe('Black Forest Labs');
  });
});

describe('dates', () => {
  it('reads the ways papers write dates', () => {
    expect(parseWhen('Mar 2015')).toBeCloseTo(2015 + 2.5 / 12);
    expect(parseWhen('2021–22')).toBeCloseTo(2021.5);
    expect(parseWhen('Sep–Oct 2022')).toBeCloseTo(2022 + 8.5 / 12);
    expect(parseWhen('Sep 2026 report')).toBeCloseTo(2026 + 8.5 / 12);
    expect(parseWhen('September 2026')).toBeCloseTo(2026 + 8.5 / 12);
    expect(parseWhen('soon')).toBeNull();
  });
});
