// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '../app/markdown';
import { Reporter, parseAtlas, parsePaper } from '../content/parse';
import { validate } from '../content/validate';
import type { Content } from '../content/types';

function fixture(): Content {
  const r = new Reporter();
  const atlas = parseAtlas(
    'demo',
    'human/atlases/demo',
    {
      atlas: { file: 'a.md', text: '# Demo\n' },
      kinds: { file: 'k.md', text: '# K\n\n## Kinds of milestone\n- **D** `d` — dot, ink\n\n## Kinds of connection\n- **builds on** — solid line, "Use": x\n' },
      milestones: [{ file: 'm.md', text: '# M\n\n## DDPM\nid: ddpm\ndate: 2020\nkind: d\n\nLead.\n' }],
    },
    r,
  );
  const paper = parsePaper('ddpm', '# Denoising Diffusion Probabilistic Models\nauthors: Jonathan Ho, Ajay Jain, Pieter Abbeel\narxiv: 2006.11239\n', 'p.md', r);
  return { site: { title: 'S', tagline: '', footer: '', about: '', loc: { file: 's.md', line: 1 } }, atlases: [atlas], papers: [paper], diagnostics: r.diagnostics };
}

describe('markdown', () => {
  const content = fixture();

  it('links milestones with [[id]] and keeps scroll inside the same atlas', () => {
    const html = renderMarkdown('See [[ddpm]] and [[ddpm|the paper]].', content, { atlas: 'demo' });
    expect(html).toContain('<a class="mlink" href="/atlas/demo/ddpm" data-keep-scroll="true">DDPM</a>');
    expect(html).toContain('>the paper</a>');
  });

  it('marks unknown links instead of hiding them', () => {
    expect(renderMarkdown('[[nope]]', content)).toContain('class="broken-ref"');
    expect(renderMarkdown('[@nope]', content)).toContain('class="broken-ref"');
  });

  it('cites papers with deep links', () => {
    const html = renderMarkdown('As shown [@ddpm, p. 4].', content);
    expect(html).toContain('href="/library/ddpm"');
    expect(html).toContain('Ho, Jain &amp; Abbeel');
    expect(html).toContain('href="https://arxiv.org/pdf/2006.11239#page=4"');
    expect(html).toContain('p. 4 ↗');
  });

  it('renders inline and display maths', () => {
    const html = renderMarkdown('Noise $\\epsilon$ costs $5 and $10.\n\n$$x_t = \\sqrt{\\bar\\alpha_t} x_0$$\n', content);
    expect(html.match(/class="katex"/g)?.length).toBe(2);
    expect(html).toContain('class="math-block"');
    expect(html).toContain('costs $5 and $10');
  });

  it('opens external links in a new tab', () => {
    expect(renderMarkdown('[x](https://example.com)', content)).toContain('target="_blank"');
    expect(renderMarkdown('[x](/library)', content)).not.toContain('target=');
  });

  it('the validator reports the line of a bad reference inside a block', () => {
    const r = new Reporter();
    const c = fixture();
    c.atlases[0].milestones[0].parts.push({ heading: 'X', body: 'line one\nsee [[missing]]', loc: { file: 'm.md', line: 10 } });
    validate(c, r);
    expect(r.diagnostics).toMatchObject([{ level: 'error', file: 'm.md', line: 11 }]);
  });
});
