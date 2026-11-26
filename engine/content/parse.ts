/**
 * Parsers for each kind of file under human/. Each parser reports problems as
 * diagnostics with a file and line, and never throws on bad content.
 */
import { firstCodeBlock, paragraphs, parseDoc, parseFactLine, plain, slugify, splitParts, type DocSection, type Fact } from './doc.ts';
import { parseWhen, yearOf } from './dates.ts';
import { arxivIdFrom, isArxivId, paperLinks, unquote } from './deeplinks.ts';
import {
  SHAPES,
  STATUSES,
  type Atlas,
  type Block,
  type Branch,
  type Connection,
  type Diagnostic,
  type Highlight,
  type Kind,
  type LineStyle,
  type LinkKind,
  type Milestone,
  type Paper,
  type ReadingStatus,
  type Section,
  type SectionLayout,
  type Shape,
  type Site,
} from './types.ts';

export class Reporter {
  constructor(public readonly diagnostics: Diagnostic[] = []) {}
  error(file: string, line: number, message: string) {
    this.diagnostics.push({ level: 'error', file, line, message });
  }
  warn(file: string, line: number, message: string) {
    this.diagnostics.push({ level: 'warning', file, line, message });
  }
}

/** Read facts into a map, warning about keys this kind of entry does not use. */
function readFacts(facts: Fact[], allowed: string[], file: string, r: Reporter, where: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of facts) {
    if (!allowed.includes(f.key)) {
      r.warn(file, f.line, `Unknown fact "${f.key}" in ${where}. Known facts: ${allowed.join(', ')}.`);
      continue;
    }
    if (f.key in out) r.warn(file, f.line, `"${f.key}" is set twice in ${where}; the last one wins.`);
    out[f.key] = f.value;
  }
  return out;
}

const listSplit = (v: string) =>
  v
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);

/* ------------------------------------------------------------------ site */

export function parseSite(text: string, file: string, r: Reporter): Site {
  const doc = parseDoc(text);
  const facts = readFacts(doc.preamble.facts, ['tagline', 'footer'], file, r, 'the site');
  if (!doc.title) r.error(file, 1, 'The site file needs a "# Title" line: it becomes the brand in the header.');
  return {
    title: doc.title || 'Atlas',
    tagline: facts.tagline ?? '',
    footer: facts.footer ?? '',
    about: [doc.preamble.body, ...doc.sections.map((s) => `## ${s.title}\n\n${s.body}`)].filter(Boolean).join('\n\n'),
    loc: { file, line: doc.titleLine || 1 },
  };
}

/* ----------------------------------------------------------------- kinds */

const KIND_ITEM = /^[-*]\s+\*\*(.+?)\*\*\s+`([a-z0-9-]+)`\s*[—–-]+\s*(.+)$/;
const LINK_ITEM = /^[-*]\s+\*\*(.+?)\*\*\s*[—–-]+\s*(solid|dashed|dotted)(?:\s+line)?\s*,\s*["“](.+?)["”]\s*[:—–-]?\s*(.*)$/i;

export function parseKinds(text: string, file: string, r: Reporter): { kinds: Kind[]; linkKinds: LinkKind[] } {
  const doc = parseDoc(text);
  const kinds: Kind[] = [];
  const linkKinds: LinkKind[] = [];
  for (const s of doc.sections) {
    const lines = s.body.split('\n');
    const isMilestone = /milestone/i.test(s.title);
    const isConnection = /connection|link/i.test(s.title);
    if (!isMilestone && !isConnection) {
      r.warn(file, s.line, `Section "${s.title}" is not "Kinds of milestone" or "Kinds of connection", so it is ignored.`);
      continue;
    }
    lines.forEach((line, i) => {
      const ln = s.bodyLine + i;
      if (!/^[-*]\s/.test(line)) return;
      if (isMilestone) {
        const m = KIND_ITEM.exec(line);
        if (!m) {
          r.error(file, ln, 'Write a kind as: - **Label** `id` — shape, colour   (e.g. - **Diffusion** `diffusion` — diamond, violet)');
          return;
        }
        const [shapeRaw = '', color = 'ink'] = m[3].split(',').map((x) => x.trim());
        const shape = shapeRaw.toLowerCase() as Shape;
        if (!SHAPES.includes(shape)) r.error(file, ln, `Unknown shape "${shapeRaw}". Use one of: ${SHAPES.join(', ')}.`);
        kinds.push({ id: m[2], label: m[1], shape: SHAPES.includes(shape) ? shape : 'dot', color, loc: { file, line: ln } });
      } else {
        const m = LINK_ITEM.exec(line);
        if (!m) {
          r.error(file, ln, 'Write a connection kind as: - **verb** — solid line, "Label": what it means');
          return;
        }
        linkKinds.push({ verb: m[1].trim(), style: m[2].toLowerCase() as LineStyle, label: m[3], explanation: m[4].trim(), loc: { file, line: ln } });
      }
    });
  }
  return { kinds, linkKinds };
}

/* ------------------------------------------------------------ milestones */

const MILESTONE_FACTS = ['id', 'date', 'kind', 'sources'];

export function parseMilestones(text: string, file: string, r: Reporter): Milestone[] {
  const doc = parseDoc(text);
  return doc.sections.map((s) => {
    const f = readFacts(s.facts, MILESTONE_FACTS, file, r, `milestone "${s.title}"`);
    const { intro, parts } = splitParts(s.body, s.bodyLine);
    const paras = paragraphs(intro, s.bodyLine);
    const lead = paras[0]?.text ?? '';
    const rest = paras.slice(1).map((p) => p.text).join('\n\n');
    if (!lead) r.warn(file, s.line, `Milestone "${s.title}" has no lead sentence. Write one line under the facts: what did it unlock?`);
    if (!f.date) r.warn(file, s.line, `Milestone "${s.title}" has no date. Add a line like "date: Jun 2020".`);
    return {
      id: f.id || slugify(s.title),
      title: s.title,
      date: f.date ?? '',
      when: f.date ? parseWhen(f.date) : null,
      kind: f.kind ?? '',
      sources: f.sources ? listSplit(f.sources) : [],
      lead,
      parts: [
        ...(rest ? [{ heading: '', body: rest, loc: { file, line: paras[1].line } }] : []),
        ...parts.map((p) => ({ heading: p.heading, body: p.body, loc: { file, line: p.line } })),
      ],
      loc: { file, line: s.line },
    };
  });
}

/* -------------------------------------------------------------- branches */

const BRANCH_FACTS = ['id', 'short', 'icon', 'summary', 'starts at'];
const EMPTY_CELL = /^[·.\-_–—]+$/;

export function parseBranches(text: string, file: string, r: Reporter): Branch[] {
  const doc = parseDoc(text);
  return doc.sections.map((s) => {
    const f = readFacts(s.facts, BRANCH_FACTS, file, r, `branch "${s.title}"`);
    const code = firstCodeBlock(s.body, s.bodyLine);
    const grid: (string | null)[][] = [];
    if (!code) r.error(file, s.line, `Branch "${s.title}" needs a layout: an indented block of milestone ids, one row per line, "·" for an empty cell.`);
    else {
      code.code.split('\n').forEach((row) => {
        if (!row.trim()) return;
        grid.push(row.trim().split(/\s+/).map((cell) => (EMPTY_CELL.test(cell) ? null : cell)));
      });
    }
    const short = f.short || s.title;
    return {
      id: f.id || slugify(short),
      label: s.title,
      short,
      icon: f.icon || 'layers',
      summary: f.summary || '',
      start: f['starts at'] || '',
      grid,
      loc: { file, line: code ? code.line : s.line },
    };
  });
}

/* ----------------------------------------------------------- connections */

export function parseConnections(text: string, file: string, linkKinds: LinkKind[], resolve: (ref: string) => string | null, r: Reporter): Connection[] {
  const raw = text.replace(/\r\n?/g, '\n').replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ''));
  const out: Connection[] = [];
  const verbs = [...linkKinds].sort((a, b) => b.verb.length - a.verb.length);
  let inFence = false;
  raw.split('\n').forEach((line, i) => {
    const ln = i + 1;
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    if (inFence || !/^[-*]\s+/.test(line)) return;
    const sentence = line.replace(/^[-*]\s+/, '').trim();
    let best: { verb: string; at: number } | null = null;
    for (const k of verbs) {
      const m = new RegExp(`\\s${k.verb.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s`, 'i').exec(sentence);
      if (m && (!best || m.index < best.at)) best = { verb: k.verb, at: m.index };
    }
    if (!best) {
      r.error(file, ln, `No connection verb found. Write "Later idea <verb> Earlier idea: why", using one of: ${verbs.map((v) => v.verb).join(', ') || '(define verbs in kinds.md)'}.`);
      return;
    }
    const subject = sentence.slice(0, best.at).trim();
    const rest = sentence.slice(best.at + best.verb.length + 2);
    const split = /:\s|\s[—–]\s/.exec(rest);
    const object = (split ? rest.slice(0, split.index) : rest).trim();
    const note = split ? rest.slice(split.index + split[0].length).trim() : '';
    const to = resolve(subject);
    const from = resolve(object);
    if (!to) r.error(file, ln, `"${subject}" is not a milestone title or id.`);
    if (!from) r.error(file, ln, `"${object}" is not a milestone title or id.`);
    if (to && from) out.push({ from, to, verb: best.verb, note, loc: { file, line: ln } });
  });
  return out;
}

/* ----------------------------------------------------------------- atlas */

const COVER_FACTS = ['kicker', 'updated', 'accent', 'hero', 'hero caption', 'hero stages', 'order'];
const SECTION_FACTS = ['id', 'kicker', 'intro', 'nav', 'layout'];
const LAYOUTS: SectionLayout[] = ['stacked', 'split', 'wide'];
const LEAF = /^::([a-z][a-z0-9-]*)(?:\s+(.*))?$/;
const OPEN = /^:::+\s*([a-z][a-z0-9-]*)(?:\s+(.*))?$/;
const CLOSE = /^:::+\s*$/;
const LINKS_ONLY = /^(\s*\[[^\]]+\]\([^)]+\)\s*[·|•,]?\s*)+$/;

export function parseBlocks(body: string, bodyLine: number, file: string, r: Reporter): Block[] {
  const blocks: Block[] = [];
  const lines = body.split('\n');
  let prose: string[] = [];
  let proseLine = bodyLine;
  const flush = () => {
    const md = prose.join('\n').trim();
    if (md) blocks.push({ type: 'prose', md, loc: { file, line: proseLine } });
    prose = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ln = bodyLine + i;
    const open = OPEN.exec(line);
    if (open) {
      flush();
      const inner: string[] = [];
      let j = i + 1;
      while (j < lines.length && !CLOSE.test(lines[j])) inner.push(lines[j++]);
      if (j >= lines.length) r.error(file, ln, `":::${open[1]}" is never closed. End the block with a line containing only ":::".`);
      blocks.push({ type: 'directive', name: open[1], args: (open[2] ?? '').trim(), body: inner.join('\n'), loc: { file, line: ln } });
      i = j;
      proseLine = bodyLine + i + 1;
      continue;
    }
    const leaf = LEAF.exec(line);
    if (leaf) {
      flush();
      blocks.push({ type: 'directive', name: leaf[1], args: (leaf[2] ?? '').trim(), body: '', loc: { file, line: ln } });
      proseLine = ln + 1;
      continue;
    }
    if (!prose.length && !line.trim()) continue;
    if (!prose.length) proseLine = ln;
    prose.push(line);
  }
  flush();
  return blocks;
}

function parseSection(s: DocSection, file: string, r: Reporter): Section {
  const f = readFacts(s.facts, SECTION_FACTS, file, r, `section "${s.title}"`);
  const layout = (f.layout ?? 'stacked') as SectionLayout;
  if (!LAYOUTS.includes(layout)) r.warn(file, s.line, `Unknown layout "${f.layout}". Use one of: ${LAYOUTS.join(', ')}.`);
  return {
    id: f.id || slugify(s.title),
    title: s.title,
    kicker: f.kicker ?? '',
    intro: f.intro ?? '',
    nav: f.nav ?? '',
    layout: LAYOUTS.includes(layout) ? layout : 'stacked',
    blocks: parseBlocks(s.body, s.bodyLine, file, r),
    loc: { file, line: s.line },
  };
}

export interface AtlasFiles {
  atlas?: { file: string; text: string };
  kinds?: { file: string; text: string };
  milestones: { file: string; text: string }[];
  branches?: { file: string; text: string };
  connections?: { file: string; text: string };
}

export function parseAtlas(slug: string, dir: string, files: AtlasFiles, r: Reporter): Atlas {
  const atlasFile = files.atlas?.file ?? `${dir}/atlas.md`;
  if (!files.atlas) r.error(atlasFile, 1, `Atlas "${slug}" has no atlas.md. Create it with a "# Title" line.`);
  const doc = parseDoc(files.atlas?.text ?? '');
  const f = readFacts(doc.preamble.facts, COVER_FACTS, atlasFile, r, 'the atlas cover');
  if (files.atlas && !doc.title) r.error(atlasFile, 1, 'The atlas needs a "# Title" line.');

  // Summary paragraphs, with a paragraph of only links turned into actions.
  const summary: string[] = [];
  const actions: { label: string; href: string }[] = [];
  for (const p of paragraphs(doc.preamble.body, doc.preamble.bodyLine)) {
    if (LINKS_ONLY.test(p.text)) {
      for (const m of p.text.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)) actions.push({ label: m[1], href: m[2] });
    } else summary.push(p.text);
  }

  let hero: Atlas['hero'] = null;
  if (f.hero) {
    const heroLine = doc.preamble.facts.find((x) => x.key === 'hero')!.line;
    hero = {
      widget: f.hero.trim(),
      caption: f['hero caption'] ?? '',
      stages: f['hero stages'] ? f['hero stages'].split(/\s*[,·]\s*/).filter(Boolean) : [],
      loc: { file: atlasFile, line: heroLine },
    };
  }

  const { kinds, linkKinds } = files.kinds ? parseKinds(files.kinds.text, files.kinds.file, r) : { kinds: [], linkKinds: [] };
  if (!files.kinds) r.warn(`${dir}/kinds.md`, 1, `Atlas "${slug}" has no kinds.md, so milestones have no kinds and connections no verbs.`);

  const milestones = files.milestones.flatMap((m) => parseMilestones(m.text, m.file, r));
  const byRef = new Map<string, string>();
  for (const m of milestones) {
    byRef.set(m.id.toLowerCase(), m.id);
    byRef.set(m.title.toLowerCase(), m.id);
    byRef.set(plain(m.title).toLowerCase(), m.id);
  }
  const resolve = (ref: string) => byRef.get(ref.trim().toLowerCase()) ?? null;
  const branches = files.branches ? parseBranches(files.branches.text, files.branches.file, r) : [];
  const connections = files.connections ? parseConnections(files.connections.text, files.connections.file, linkKinds, resolve, r) : [];

  const order = f.order ? Number(f.order) : 100;
  return {
    slug,
    title: doc.title || slug,
    plainTitle: plain(doc.title || slug),
    kicker: f.kicker ?? '',
    updated: f.updated ?? '',
    accent: f.accent ?? '',
    order: Number.isFinite(order) ? order : 100,
    summary: summary.join('\n\n'),
    actions,
    hero,
    kinds,
    linkKinds,
    milestones,
    connections,
    branches,
    sections: doc.sections.map((s) => parseSection(s, atlasFile, r)),
    dir,
    loc: { file: atlasFile, line: doc.titleLine || 1 },
  };
}

/* ----------------------------------------------------------------- paper */

const PAPER_FACTS = ['authors', 'cite as', 'published', 'type', 'arxiv', 'url', 'pdf', 'html', 'code', 'project', 'status', 'tags', 'added'];
const HIGHLIGHT = /^[-*]\s+(.+)$/;

/** "Jonathan Ho, Ajay Jain, Pieter Abbeel" → "Ho, Jain & Abbeel"; 4+ authors → "Ho et al." */
export function citeAsFrom(authors: string): string {
  const people = authors
    .replace(/,?\s*et al\.?/gi, '')
    .split(/\s*,\s*|\s+and\s+|\s*&\s*/)
    .map((a) => a.trim())
    .filter((a) => a && !/^et al\.?$/i.test(a));
  const last = (n: string) => n.split(/\s+/).pop() ?? n;
  const etAl = /et al/i.test(authors);
  if (!people.length) return '';
  // A single name may be an organisation ("Black Forest Labs"), so keep it whole.
  if (people.length === 1) return etAl ? `${last(people[0])} et al.` : people[0];
  if (people.length >= 4 || etAl) return `${last(people[0])} et al.`;
  if (people.length === 2) return `${last(people[0])} & ${last(people[1])}`;
  return `${last(people[0])}, ${last(people[1])} & ${last(people[2])}`;
}

export function parseHighlight(line: string, file: string, ln: number): Highlight | null {
  const m = HIGHLIGHT.exec(line);
  if (!m) return null;
  // locator — "quote" — comment   (locator and comment optional)
  const parts = m[1].split(/\s+[—–]\s+/);
  let locator = '';
  let quote = '';
  const rest: string[] = [];
  for (const p of parts) {
    const q = unquote(p);
    if (q && !quote) quote = q;
    else if (!locator && !quote && !rest.length && p.length <= 40) locator = p.trim();
    else rest.push(p);
  }
  if (!quote && !rest.length && locator) {
    rest.push(locator);
    locator = '';
  }
  return { locator, quote, comment: rest.join(' — ').trim(), loc: { file, line: ln } };
}

export function parsePaper(id: string, text: string, file: string, r: Reporter): Paper {
  const doc = parseDoc(text);
  const f = readFacts(doc.preamble.facts, PAPER_FACTS, file, r, `paper "${id}"`);
  if (!doc.title) r.error(file, 1, 'A paper needs a "# Title" line.');
  let arxiv = f.arxiv ? arxivIdFrom(f.arxiv) : '';
  if (f.arxiv && !arxiv) r.warn(file, doc.preamble.facts.find((x) => x.key === 'arxiv')!.line, `"${f.arxiv}" does not look like an arXiv id (e.g. 2006.11239).`);
  if (!arxiv && f.url) arxiv = arxivIdFrom(f.url);
  const status = (f.status ?? '').toLowerCase() as ReadingStatus;
  if (status && !STATUSES.includes(status)) r.warn(file, doc.preamble.facts.find((x) => x.key === 'status')!.line, `Unknown status "${f.status}". Use one of: ${STATUSES.join(', ')}.`);

  let notes = '';
  const extra: Paper['extra'] = [];
  const highlights: Highlight[] = [];
  for (const s of doc.sections) {
    if (/^notes?$/i.test(s.title.trim())) notes = s.body;
    else if (/^highlights?$/i.test(s.title.trim())) {
      s.body.split('\n').forEach((line, i) => {
        const h = parseHighlight(line, file, s.bodyLine + i);
        if (h) highlights.push(h);
      });
    } else extra.push({ heading: s.title, body: s.body, loc: { file, line: s.line } });
  }
  const base = {
    arxiv: arxiv && isArxivId(arxiv) ? arxiv : '',
    url: f.url ?? '',
    pdf: f.pdf ?? '',
    html: f.html ?? '',
    code: f.code ?? '',
    project: f.project ?? '',
  };
  const authors = f.authors ?? '';
  const published = f.published ?? '';
  const links = paperLinks(base);
  if (!links.primary) r.warn(file, 1, `Paper "${id}" has no link. Add "arxiv: <id>" or "url: <link>".`);
  return {
    id,
    title: doc.title || id,
    authors,
    citeAs: f['cite as'] || citeAsFrom(authors) || doc.title || id,
    published,
    year: yearOf(published),
    type: f.type ?? (base.arxiv ? 'paper' : ''),
    ...base,
    status: STATUSES.includes(status) ? status : '',
    tags: f.tags ? f.tags.split(/\s*,\s*/).filter(Boolean) : [],
    added: f.added ?? '',
    summary: doc.preamble.body,
    notes,
    extra,
    highlights,
    links,
    loc: { file, line: doc.titleLine || 1 },
  };
}

export { parseFactLine };
