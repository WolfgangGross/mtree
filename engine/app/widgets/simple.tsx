/** Small content blocks: :::bars, :::callout and the ::sources index. */
import { useMemo, useState } from 'react';
import { parseFactLine } from '../../content/doc';
import type { Atlas, Paper } from '../../content/types';
import { StatusDot } from '../components/bits';
import { PaperLinks } from '../components/Inspector';
import { Md } from '../components/Md';
import { useContent } from '../store';

export function parseBars(body: string) {
  let max = 0;
  let unit = '';
  const rows: { label: string; value: number; text: string; strong: boolean }[] = [];
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const fact = parseFactLine(line);
    if (fact && fact.key === 'max') {
      max = parseFloat(fact.value);
      unit = fact.value.replace(/^[\d.\s]+/, '');
      continue;
    }
    const m = /^(\*\*)?(.+?)(\*\*)?\s*:\s*([\d.]+)\s*(\S*)\s*$/.exec(line);
    if (m) {
      rows.push({ label: m[2].replace(/\*\*$/, ''), value: parseFloat(m[4]), text: `${m[4]}${m[5]}`, strong: Boolean(m[1]) });
      if (!unit) unit = m[5];
    }
  }
  if (!max) max = Math.max(...rows.map((r) => r.value), 1);
  return { rows, max, unit };
}

export function Bars({ args, body }: { args: string; body: string }) {
  const { rows, max, unit } = parseBars(body);
  return (
    <figure className="bars">
      {args && <figcaption className="label">{args}</figcaption>}
      {rows.map((r) => (
        <div key={r.label} className={`bar-row${r.strong ? ' strong' : ''}`}>
          <div className="bar-text">
            <span>{r.label}</span>
            <b>{r.text}</b>
          </div>
          <div className="bar-track">
            <i style={{ width: `${Math.min(100, (r.value / max) * 100)}%` }} />
          </div>
        </div>
      ))}
      <div className="bar-axis label">
        <span>0{unit}</span>
        <span>
          {+(max / 2).toFixed(2)}
          {unit}
        </span>
        <span>
          {max}
          {unit}
        </span>
      </div>
    </figure>
  );
}

export function Callout({ args, body, atlas }: { args: string; body: string; atlas: string }) {
  return (
    <aside className="callout">
      {args && <span className="label">{args}</span>}
      <Md source={body} atlas={atlas} />
    </aside>
  );
}

/** Every paper an atlas cites: in milestone sources and in [@…] citations on the page. */
export function citedPapers(atlas: Atlas, papers: Paper[]): Paper[] {
  const ids = new Set<string>(atlas.milestones.flatMap((m) => m.sources));
  const texts = [atlas.summary, ...atlas.milestones.flatMap((m) => [m.lead, ...m.parts.map((p) => p.body)]), ...atlas.connections.map((c) => c.note), ...atlas.sections.flatMap((s) => s.blocks.map((b) => (b.type === 'prose' ? b.md : b.body)))];
  for (const t of texts) for (const m of t.matchAll(/\[@([a-z0-9][a-z0-9-]*)/gi)) ids.add(m[1]);
  return papers.filter((p) => ids.has(p.id)).sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999) || a.title.localeCompare(b.title));
}

export function SourceIndex({ atlas }: { atlas: Atlas }) {
  const content = useContent();
  const [query, setQuery] = useState('');
  const papers = useMemo(() => citedPapers(atlas, content.papers), [atlas, content.papers]);
  const usedBy = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const m of atlas.milestones) for (const s of m.sources) map.set(s, [...(map.get(s) ?? []), m.id]);
    return map;
  }, [atlas]);
  const q = query.trim().toLowerCase();
  const shown = papers.filter((p) => !q || [p.title, p.authors, p.citeAs, p.published, p.type, ...p.tags].join(' ').toLowerCase().includes(q));
  const byId = new Map(atlas.milestones.map((m) => [m.id, m]));
  return (
    <div className="source-index">
      <div className="index-bar">
        <input type="search" placeholder="Filter by author, title, year or type" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Filter sources" />
        <span className="label">
          {shown.length === papers.length ? `${papers.length} references` : `${shown.length} of ${papers.length}`}
        </span>
      </div>
      <ol className="ref-list">
        {shown.map((p) => (
          <li key={p.id} className="ref-row">
            <div className="ref-main">
              <a className="ref-title" href={`/library/${p.id}`}>
                {p.title}
              </a>
              <span className="ref-meta">
                {p.citeAs} · {p.published}
                {p.type ? ` · ${p.type}` : ''}
              </span>
              {(usedBy.get(p.id) ?? []).length > 0 && (
                <span className="ref-used">
                  {(usedBy.get(p.id) ?? []).map((id, i) => (
                    <span key={id}>
                      {i > 0 && ', '}
                      <a href={`/atlas/${atlas.slug}/${id}`} data-keep-scroll="true">
                        {byId.get(id)?.title}
                      </a>
                    </span>
                  ))}
                </span>
              )}
            </div>
            <div className="ref-side">
              <StatusDot status={p.status} />
              <PaperLinks paper={p} compact />
            </div>
          </li>
        ))}
        {!shown.length && <li className="empty">No sources match this search.</li>}
      </ol>
    </div>
  );
}
