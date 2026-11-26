/**
 * A tiny reader for the human/ file format: Markdown with "facts".
 *
 *   # Title                <- the document title
 *   key: value             <- facts: `key: value` lines right under a heading
 *
 *   Body text …
 *
 *   ## Entry               <- each `##` heading starts an entry
 *   key: value
 *
 *   Body text, `###` parts, code blocks …
 *
 * HTML comments are ignored. Line numbers are kept so that every
 * diagnostic can point at the exact line a human needs to fix.
 */

export interface Fact {
  key: string;
  value: string;
  line: number;
}

export interface DocSection {
  depth: number;
  title: string;
  line: number;
  facts: Fact[];
  /** Raw markdown after the facts, up to the next heading of the same or higher level. */
  body: string;
  /** Line number of the first line of `body`. */
  bodyLine: number;
}

export interface Doc {
  title: string;
  titleLine: number;
  /** Facts and body between the `#` title and the first `##`. */
  preamble: DocSection;
  /** All `##` sections in order. `###` headings stay inside their body. */
  sections: DocSection[];
}

const FACT = /^(?:[-*]\s+)?([a-z][a-z0-9]*(?: [a-z0-9]+)*):\s+(\S.*?)\s*$/;
const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const FENCE = /^\s{0,3}(`{3,}|~{3,})/;

/** Replace HTML comments with blank lines so line numbers stay true. */
export function stripComments(text: string): string {
  return text.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ''));
}

export function isFactLine(line: string): boolean {
  return FACT.test(line);
}

export function parseFactLine(line: string): { key: string; value: string } | null {
  const m = FACT.exec(line);
  return m ? { key: m[1], value: m[2] } : null;
}

/**
 * Split lines into headings, tracking fenced code so a `#` inside code is not a heading.
 * Returns [lineIndex, depth, text] for every heading.
 */
export function findHeadings(lines: string[], maxDepth = 6): [number, number, string][] {
  const out: [number, number, string][] = [];
  let fence: string | null = null;
  lines.forEach((line, i) => {
    const f = FENCE.exec(line);
    if (f) {
      const marker = f[1][0];
      if (fence === null) fence = marker;
      else if (fence === marker) fence = null;
      return;
    }
    if (fence) return;
    const h = HEADING.exec(line);
    if (h && h[1].length <= maxDepth) out.push([i, h[1].length, h[2]]);
  });
  return out;
}

function readSection(lines: string[], start: number, end: number, depth: number, title: string, headingLine: number): DocSection {
  // start: index of first line after the heading. end: exclusive.
  let i = start;
  while (i < end && lines[i].trim() === '') i++;
  const facts: Fact[] = [];
  while (i < end) {
    const m = FACT.exec(lines[i]);
    if (!m) break;
    facts.push({ key: m[1], value: m[2], line: i + 1 });
    i++;
  }
  if (facts.length === 0) i = start;
  const bodyLines = lines.slice(i, end);
  // trim leading blank lines but remember the offset
  let lead = 0;
  while (lead < bodyLines.length && bodyLines[lead].trim() === '') lead++;
  const body = bodyLines.slice(lead).join('\n').replace(/\s+$/, '');
  return { depth, title, line: headingLine, facts, body, bodyLine: i + lead + 1 };
}

export function parseDoc(raw: string): Doc {
  const text = stripComments(raw.replace(/\r\n?/g, '\n'));
  const lines = text.split('\n');
  const headings = findHeadings(lines, 2);
  const h1 = headings.find(([, d]) => d === 1);
  const sectionsStart = headings.filter(([, d]) => d === 2);
  const firstH2 = sectionsStart.length ? sectionsStart[0][0] : lines.length;
  const titleIdx = h1 && h1[0] < firstH2 ? h1[0] : -1;
  const preamble = readSection(lines, titleIdx + 1, firstH2, 1, h1 && titleIdx >= 0 ? h1[2] : '', titleIdx + 1);
  const sections = sectionsStart.map(([idx, depth, title], k) => {
    const end = k + 1 < sectionsStart.length ? sectionsStart[k + 1][0] : lines.length;
    return readSection(lines, idx + 1, end, depth, title, idx + 1);
  });
  return { title: titleIdx >= 0 ? h1![2] : '', titleLine: titleIdx + 1, preamble, sections };
}

/** Split a markdown body into `###` parts. Text before the first `###` is the intro. */
export function splitParts(body: string, bodyLine: number): { intro: string; parts: { heading: string; body: string; line: number }[] } {
  const lines = body.split('\n');
  const heads = findHeadings(lines, 3).filter(([, d]) => d === 3);
  const introEnd = heads.length ? heads[0][0] : lines.length;
  const intro = lines.slice(0, introEnd).join('\n').trim();
  const parts = heads.map(([idx, , heading], k) => {
    const end = k + 1 < heads.length ? heads[k + 1][0] : lines.length;
    return { heading, body: lines.slice(idx + 1, end).join('\n').trim(), line: bodyLine + idx };
  });
  return { intro, parts };
}

/** Split markdown into paragraphs (blank-line separated), keeping start lines. */
export function paragraphs(body: string, bodyLine: number): { text: string; line: number }[] {
  const out: { text: string; line: number }[] = [];
  const lines = body.split('\n');
  let buf: string[] = [];
  let startLine = 0;
  lines.forEach((l, i) => {
    if (l.trim() === '') {
      if (buf.length) out.push({ text: buf.join('\n'), line: startLine });
      buf = [];
    } else {
      if (!buf.length) startLine = bodyLine + i;
      buf.push(l);
    }
  });
  if (buf.length) out.push({ text: buf.join('\n'), line: startLine });
  return out;
}

/** Find the first code block (fenced or indented) in a body. */
export function firstCodeBlock(body: string, bodyLine: number): { code: string; line: number } | null {
  const lines = body.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const f = FENCE.exec(lines[i]);
    if (f) {
      const marker = f[1];
      const out: string[] = [];
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim().startsWith(marker)) return { code: out.join('\n'), line: bodyLine + i + 1 };
        out.push(lines[j]);
      }
      return { code: out.join('\n'), line: bodyLine + i + 1 };
    }
    if (/^( {4}|\t)\S/.test(lines[i]) && (i === 0 || lines[i - 1].trim() === '')) {
      const out: string[] = [];
      let j = i;
      while (j < lines.length && (/^( {4}|\t)/.test(lines[j]) || lines[j].trim() === '')) {
        out.push(lines[j].replace(/^( {4}|\t)/, ''));
        j++;
      }
      while (out.length && out[out.length - 1].trim() === '') out.pop();
      return { code: out.join('\n'), line: bodyLine + i };
    }
  }
  return null;
}

export function slugify(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Strip inline markdown (emphasis, code, links) to plain text. */
export function plain(md: string): string {
  return md
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
