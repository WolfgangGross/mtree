import { describe, expect, it } from 'vitest';
import { addHighlight, paperIdFrom, paperTemplate, removeLine, setFact, setSection } from '../content/edit';
import { parsePaper, Reporter } from '../content/parse';

const PAPER = `# A Paper

authors:    Ann Author
published:  Jun 2020

## Notes

Old notes.

## Highlights

- p. 1 — first
`;

describe('editing paper files', () => {
  it('sets, replaces and removes facts, keeping the column aligned', () => {
    const withStatus = setFact(PAPER, 'status', 'reading');
    expect(withStatus).toContain('published:  Jun 2020\nstatus:     reading\n');
    const changed = setFact(withStatus, 'status', 'read');
    expect(changed).toContain('status:     read\n');
    expect(changed.match(/status:/g)).toHaveLength(1);
    expect(setFact(changed, 'status', '')).not.toContain('status:');
  });

  it('adds facts to a file that has none', () => {
    expect(setFact('# T\n\n## Notes\n', 'status', 'to read')).toBe('# T\n\nstatus: to read\n\n## Notes\n');
  });

  it('replaces the notes section and leaves highlights alone', () => {
    const out = setSection(PAPER, 'Notes', 'New notes.\n\nTwo paragraphs.');
    expect(out).toContain('## Notes\n\nNew notes.\n\nTwo paragraphs.\n\n## Highlights');
    expect(out).toContain('- p. 1 — first');
    expect(out).not.toContain('Old notes.');
  });

  it('creates a notes section before highlights when missing', () => {
    const out = setSection('# T\n\n## Highlights\n\n- x\n', 'Notes', 'Hello', 'Highlights');
    expect(out).toBe('# T\n\n## Notes\n\nHello\n\n## Highlights\n\n- x\n');
  });

  it('appends highlights and removes them by line', () => {
    const out = addHighlight(PAPER, { locator: '§3', quote: 'said "this"', comment: 'note' });
    expect(out).toContain('- p. 1 — first\n- §3 — "said ”this”" — note\n');
    const parsed = parsePaper('a', out, 'f.md', new Reporter());
    expect(parsed.highlights).toHaveLength(2);
    const line = parsed.highlights[1].loc.line;
    expect(removeLine(out, line)).toBe(PAPER);
    expect(addHighlight('# T\n', { locator: 'p. 2', quote: '', comment: '' })).toBe('# T\n\n## Highlights\n\n- p. 2\n');
  });

  it('setting and clearing a fact gives back the exact original bytes', () => {
    const original = '# T\n\nauthors:  A\n\n## Notes\n\n';
    expect(setFact(setFact(original, 'status', 'read'), 'status', '')).toBe(original);
  });

  it('does not delete a line that is not a list item', () => {
    expect(removeLine(PAPER, 1)).toBe(PAPER);
  });

  it('writes a fresh file that parses cleanly', () => {
    const text = paperTemplate({ title: 'Consistency Models', authors: 'Yang Song et al.', published: 'Mar 2023', arxiv: '2303.01469', status: 'to read' });
    const r = new Reporter();
    const p = parsePaper('consistency-models', text, 'f.md', r);
    expect(r.diagnostics).toEqual([]);
    expect(p).toMatchObject({ title: 'Consistency Models', arxiv: '2303.01469', status: 'to read', citeAs: 'Song et al.' });
  });

  it('makes short, unique file names from titles', () => {
    expect(paperIdFrom('Denoising Diffusion Probabilistic Models', new Set())).toBe('denoising-diffusion-probabilistic-models');
    expect(paperIdFrom('$\\pi_0$: A Vision-Language-Action Flow Model for General Robot Control', new Set())).toBe('vision-language-action-flow');
    expect(paperIdFrom('Attention Is All You Need', new Set(['attention-is-all-you']))).toBe('attention-is-all-you-2');
    expect(paperIdFrom('Attention Is All You Need', new Set(), 'Ashish Vaswani', '2017')).toBe('vaswani-2017-attention');
    expect(paperIdFrom('$\\pi_0$: A Vision-Language-Action Flow Model', new Set(['black-2024-vision']), 'Kevin Black', '2024')).toBe('black-2024-vision-2');
  });
});
