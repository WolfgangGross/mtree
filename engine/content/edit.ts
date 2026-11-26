/**
 * Small, surgical edits to human files, used when you write notes in the app.
 * Each function returns the new file text and leaves everything else byte-for-byte.
 */
import { findHeadings, isFactLine } from './doc.ts';
import type { Highlight } from './types.ts';

function splitLines(text: string): string[] {
  return text.replace(/\r\n?/g, '\n').split('\n');
}

/** Join back, keeping whatever ending the file had; only add a final newline if there was none. */
function join(lines: string[]): string {
  const out = lines.join('\n');
  return out.endsWith('\n') ? out : out + '\n';
}

/** Set (or remove, with value '') a fact in the block right under the `#` title. */
export function setFact(text: string, key: string, value: string): string {
  const lines = splitLines(text);
  const heads = findHeadings(lines, 2);
  const h1 = heads.find(([, d]) => d === 1);
  const firstH2 = heads.find(([, d]) => d === 2)?.[0] ?? lines.length;
  let i = h1 && h1[0] < firstH2 ? h1[0] + 1 : 0;
  while (i < firstH2 && lines[i].trim() === '') i++;
  const start = i;
  while (i < firstH2 && isFactLine(lines[i])) i++;
  const end = i; // exclusive
  const re = new RegExp(`^(?:[-*]\\s+)?${key.replace(/ /g, ' ')}:\\s`);
  const existing = lines.slice(start, end).findIndex((l) => re.test(l));
  // Align with the other facts when they are padded into a column.
  const pad = lines
    .slice(start, end)
    .map((l) => /^([a-z][a-z0-9 ]*:\s+)/.exec(l)?.[1].length ?? 0)
    .reduce((a, b) => Math.max(a, b), 0);
  const line = `${(key + ':').padEnd(Math.max(pad, key.length + 2), ' ')}${value}`;
  if (existing >= 0) {
    if (value) lines[start + existing] = line;
    else lines.splice(start + existing, 1);
  } else if (value) {
    if (end > start) lines.splice(end, 0, line);
    else {
      const at = h1 ? h1[0] + 1 : 0;
      lines.splice(at, 0, '', line);
    }
  }
  return join(lines);
}

/** Replace the body of a `## heading` section, creating it (before `after`, or at the end) if missing. */
export function setSection(text: string, heading: string, body: string, before?: string): string {
  const lines = splitLines(text);
  const heads = findHeadings(lines, 2);
  const match = (h: string, t: string) => h.trim().toLowerCase().replace(/s$/, '') === t.toLowerCase().replace(/s$/, '');
  const idx = heads.findIndex(([, d, t]) => d === 2 && match(t, heading));
  const clean = body.replace(/\s+$/, '');
  if (idx >= 0) {
    const start = heads[idx][0] + 1;
    const next = heads.slice(idx + 1).find(([, d]) => d <= 2);
    const end = next ? next[0] : lines.length;
    const replacement = clean ? ['', ...clean.split('\n'), ''] : [''];
    lines.splice(start, end - start, ...replacement);
    return join(lines);
  }
  const block = [`## ${heading}`, '', ...(clean ? clean.split('\n') : []), ''];
  const beforeIdx = before ? heads.find(([, d, t]) => d === 2 && match(t, before)) : undefined;
  if (beforeIdx) {
    lines.splice(beforeIdx[0], 0, ...block);
    return join(lines);
  }
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  lines.push('', ...block);
  return join(lines);
}

export function formatHighlight(h: Pick<Highlight, 'locator' | 'quote' | 'comment'>): string {
  const parts = [h.locator.trim(), h.quote.trim() ? `"${h.quote.trim().replace(/"/g, '”')}"` : '', h.comment.trim()].filter(Boolean);
  return `- ${parts.join(' — ')}`;
}

/** Append one highlight to `## Highlights`, creating the section if needed. */
export function addHighlight(text: string, h: Pick<Highlight, 'locator' | 'quote' | 'comment'>): string {
  const lines = splitLines(text);
  const heads = findHeadings(lines, 2);
  const idx = heads.findIndex(([, d, t]) => d === 2 && /^highlights?$/i.test(t.trim()));
  const item = formatHighlight(h);
  if (idx < 0) {
    while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
    lines.push('', '## Highlights', '', item, '');
    return join(lines);
  }
  const next = heads.slice(idx + 1).find(([, d]) => d <= 2);
  let end = next ? next[0] : lines.length;
  while (end > heads[idx][0] + 1 && lines[end - 1].trim() === '') end--;
  lines.splice(end, 0, ...(end === heads[idx][0] + 1 ? ['', item] : [item]));
  return join(lines);
}

/** Remove the highlight written on a given 1-based line. */
export function removeLine(text: string, line: number): string {
  const lines = splitLines(text);
  if (line >= 1 && line <= lines.length && /^[-*]\s/.test(lines[line - 1])) lines.splice(line - 1, 1);
  return join(lines);
}

export interface NewPaper {
  title: string;
  authors?: string;
  published?: string;
  type?: string;
  arxiv?: string;
  url?: string;
  code?: string;
  tags?: string;
  status?: string;
  added?: string;
  summary?: string;
}

/** The text of a fresh library file. */
export function paperTemplate(p: NewPaper): string {
  const facts: [string, string | undefined][] = [
    ['authors', p.authors],
    ['published', p.published],
    ['type', p.type],
    ['arxiv', p.arxiv],
    ['url', p.url],
    ['code', p.code],
    ['tags', p.tags],
    ['status', p.status],
    ['added', p.added],
  ];
  const present = facts.filter(([, v]) => v);
  const width = Math.max(...present.map(([k]) => k.length + 2), 0) + 1;
  const factLines = present.map(([k, v]) => `${(k + ':').padEnd(width)}${v}`);
  return [`# ${p.title}`, '', ...factLines, '', ...(p.summary ? [p.summary, ''] : []), '## Notes', '', ''].join('\n');
}

/**
 * A file name for a new paper, in citation-key style when we know the first author and year:
 * "Attention Is All You Need", Vaswani, 2017 → "vaswani-2017-attention".
 * Otherwise the first few words of the title.
 */
export function paperIdFrom(title: string, taken: Set<string>, firstAuthor = '', year = ''): string {
  const words = title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\$[^$]*\$/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter((w) => w && !['a', 'an', 'the', 'of', 'for', 'and', 'with', 'via', 'to', 'in', 'on', 'from', 'using'].includes(w));
  const surname = (firstAuthor.trim().split(/\s+/).pop() ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  const keyword = words.find((w) => w.length > 2 && !/^\d+$/.test(w)) ?? words[0];
  let base = surname && /^\d{4}$/.test(year) && keyword ? `${surname}-${year}-${keyword}` : words.slice(0, 4).join('-') || 'paper';
  if (/^\d/.test(base)) base = `p-${base}`;
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  return id;
}
