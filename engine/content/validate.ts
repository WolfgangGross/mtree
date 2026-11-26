/**
 * Cross-file checks: does every reference point at something that exists?
 * These run in `npm run check`, in the dev server overlay and in the tests.
 */
import type { Reporter } from './parse.ts';
import type { Atlas, Content, Loc } from './types.ts';
import { DIRECTIVES, HERO_WIDGETS, ICONS } from './widgets.ts';

const WIKI = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
const CITE = /\[@([a-z0-9][a-z0-9-]*)(?:\s*,[^\]]*)?\]/gi;

/** Find a wiki-link target: "id", "atlas-slug", or "atlas-slug/id". */
export function resolveWiki(content: Pick<Content, 'atlases'>, ref: string, current?: string): { atlas: Atlas; milestone?: string } | null {
  const r = ref.trim();
  if (r.includes('/')) {
    const [slug, id] = r.split('/');
    const atlas = content.atlases.find((a) => a.slug === slug);
    if (atlas && atlas.milestones.some((m) => m.id === id)) return { atlas, milestone: id };
    return null;
  }
  const ordered = [...content.atlases].sort((a, b) => Number(b.slug === current) - Number(a.slug === current));
  for (const atlas of ordered) {
    const m = atlas.milestones.find((x) => x.id === r || x.title.toLowerCase() === r.toLowerCase());
    if (m) return { atlas, milestone: m.id };
  }
  const atlas = content.atlases.find((a) => a.slug === r);
  return atlas ? { atlas } : null;
}

function scanRefs(content: Content, md: string, loc: Loc, current: string | undefined, r: Reporter) {
  const lineAt = (idx: number) => loc.line + (md.slice(0, idx).match(/\n/g)?.length ?? 0);
  for (const m of md.matchAll(WIKI)) {
    if (!resolveWiki(content, m[1], current)) r.error(loc.file, lineAt(m.index ?? 0), `[[${m[1]}]] does not match any milestone id, title or atlas.`);
  }
  for (const m of md.matchAll(CITE)) {
    if (!content.papers.some((p) => p.id === m[1])) r.error(loc.file, lineAt(m.index ?? 0), `[@${m[1]}] is not in the library. Add human/library/${m[1]}.md or fix the id.`);
  }
}

export function validate(content: Content, r: Reporter) {
  const paperIds = new Set(content.papers.map((p) => p.id));

  const slugs = new Set<string>();
  for (const atlas of content.atlases) {
    if (slugs.has(atlas.slug)) r.error(atlas.loc.file, 1, `Two atlases use the folder name "${atlas.slug}".`);
    slugs.add(atlas.slug);
    validateAtlas(content, atlas, paperIds, r);
  }

  for (const p of content.papers) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(p.id)) r.error(p.loc.file, 1, `Library file names must be lowercase words joined by dashes (got "${p.id}").`);
    scanRefs(content, p.summary, p.loc, undefined, r);
    scanRefs(content, p.notes, p.loc, undefined, r);
    for (const x of p.extra) scanRefs(content, x.body, x.loc, undefined, r);
    for (const h of p.highlights) scanRefs(content, h.comment, h.loc, undefined, r);
  }
  scanRefs(content, content.site.about, content.site.loc, undefined, r);
}

function validateAtlas(content: Content, atlas: Atlas, paperIds: Set<string>, r: Reporter) {
  const ids = new Map<string, Loc>();
  const titles = new Map<string, Loc>();
  const kindIds = new Set(atlas.kinds.map((k) => k.id));
  for (const k of atlas.kinds) {
    if (atlas.kinds.filter((x) => x.id === k.id).length > 1) r.error(k.loc.file, k.loc.line, `The kind id "${k.id}" is used twice.`);
  }

  for (const m of atlas.milestones) {
    const prev = ids.get(m.id);
    if (prev) r.error(m.loc.file, m.loc.line, `Milestone id "${m.id}" is already used at ${prev.file}:${prev.line}.`);
    ids.set(m.id, m.loc);
    const t = m.title.toLowerCase();
    const prevT = titles.get(t);
    if (prevT) r.error(m.loc.file, m.loc.line, `Milestone title "${m.title}" is already used at ${prevT.file}:${prevT.line}. Titles must be unique so connections can name them.`);
    titles.set(t, m.loc);
    if (!/^[a-z0-9][a-z0-9-]*$/i.test(m.id)) r.error(m.loc.file, m.loc.line, `Milestone id "${m.id}" may only use letters, digits and dashes.`);
    if (!m.kind) r.warn(m.loc.file, m.loc.line, `Milestone "${m.title}" has no kind. Add "kind: <id>" using a kind from kinds.md.`);
    else if (!kindIds.has(m.kind)) r.error(m.loc.file, m.loc.line, `Milestone "${m.title}" uses kind "${m.kind}", which kinds.md does not define. Known kinds: ${[...kindIds].join(', ')}.`);
    if (m.date && m.when === null) r.warn(m.loc.file, m.loc.line, `Could not read a year from the date "${m.date}". Write it like "Mar 2015" or "2021–22".`);
    for (const s of m.sources) {
      if (!paperIds.has(s)) r.error(m.loc.file, m.loc.line, `Milestone "${m.title}" cites "${s}", which is not in the library. Add human/library/${s}.md or fix the id.`);
    }
    scanRefs(content, m.lead, m.loc, atlas.slug, r);
    for (const p of m.parts) scanRefs(content, p.body, p.loc, atlas.slug, r);
  }

  const placed = new Set<string>();
  const branchIds = new Set<string>();
  for (const b of atlas.branches) {
    if (branchIds.has(b.id)) r.error(b.loc.file, b.loc.line, `Two branches have the id "${b.id}". Give one a different "short:" or "id:".`);
    branchIds.add(b.id);
    if (!(ICONS as readonly string[]).includes(b.icon)) r.warn(b.loc.file, b.loc.line, `Unknown icon "${b.icon}". Available: ${ICONS.join(', ')}.`);
    const seen = new Set<string>();
    b.grid.forEach((row, y) =>
      row.forEach((cell) => {
        if (!cell) return;
        if (!ids.has(cell)) r.error(b.loc.file, b.loc.line + y, `Branch "${b.label}" places "${cell}", which is not a milestone id.`);
        if (seen.has(cell)) r.error(b.loc.file, b.loc.line + y, `Branch "${b.label}" places "${cell}" twice.`);
        seen.add(cell);
        placed.add(cell);
      }),
    );
    if (b.start && !seen.has(b.start)) r.error(b.loc.file, b.loc.line, `Branch "${b.label}" starts at "${b.start}", which is not in its layout.`);
  }
  for (const m of atlas.milestones) {
    if (atlas.branches.length && !placed.has(m.id)) r.warn(m.loc.file, m.loc.line, `Milestone "${m.title}" is not placed in any branch, so it only appears on the timeline.`);
  }

  const byId = new Map(atlas.milestones.map((m) => [m.id, m]));
  const pairs = new Set<string>();
  for (const c of atlas.connections) {
    const a = byId.get(c.from);
    const b = byId.get(c.to);
    if (c.from === c.to) r.error(c.loc.file, c.loc.line, 'A milestone cannot connect to itself.');
    const key = [c.from, c.to].sort().join('|');
    if (pairs.has(key)) r.warn(c.loc.file, c.loc.line, `"${b?.title}" and "${a?.title}" are already connected.`);
    pairs.add(key);
    if (a?.when != null && b?.when != null && b.when < a.when - 0.25) {
      r.warn(c.loc.file, c.loc.line, `"${b.title}" (${b.date}) ${c.verb} "${a.title}" (${a.date}), which came later. Put the later idea first in the sentence.`);
    }
    if (!c.note) r.warn(c.loc.file, c.loc.line, 'Add a short reason after a colon: "A builds on B: why".');
    scanRefs(content, c.note, c.loc, atlas.slug, r);
  }

  if (atlas.hero && !(atlas.hero.widget in HERO_WIDGETS)) {
    r.error(atlas.hero.loc.file, atlas.hero.loc.line, `Unknown hero "${atlas.hero.widget}". Available: ${Object.keys(HERO_WIDGETS).join(', ')}.`);
  }
  scanRefs(content, atlas.summary, atlas.loc, atlas.slug, r);

  const sectionIds = new Set<string>();
  for (const s of atlas.sections) {
    if (sectionIds.has(s.id)) r.error(s.loc.file, s.loc.line, `Two sections share the anchor "#${s.id}". Set a different "id:" on one.`);
    sectionIds.add(s.id);
    for (const b of s.blocks) {
      if (b.type === 'directive') {
        if (!(b.name in DIRECTIVES)) r.error(b.loc.file, b.loc.line, `Unknown block "${b.name}". Available: ${Object.keys(DIRECTIVES).join(', ')}.`);
        scanRefs(content, b.body, { file: b.loc.file, line: b.loc.line + 1 }, atlas.slug, r);
      } else scanRefs(content, b.md, b.loc, atlas.slug, r);
    }
  }
  for (const a of atlas.actions) {
    if (a.href.startsWith('#') && !sectionIds.has(a.href.slice(1))) r.warn(atlas.loc.file, atlas.loc.line, `The link "${a.label}" points at #${a.href.slice(1)}, but no section has that id.`);
  }
}
