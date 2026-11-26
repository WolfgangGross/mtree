/** The panel beside the tree: everything about one milestone. */
import type { Atlas, Milestone, Paper } from '../../content/types';
import { useContent } from '../store';
import { EditLink, Icon, KindSymbol, StatusDot } from './bits';
import { Md } from './Md';

export function PaperLinks({ paper, compact }: { paper: Paper; compact?: boolean }) {
  const l = paper.links;
  const typeLabel = paper.type ? paper.type[0].toUpperCase() + paper.type.slice(1) : 'Open';
  const items: [string, string | undefined][] = [
    [l.abs ? 'Abstract' : typeLabel, l.abs ?? (l.primary !== l.html && l.primary !== l.pdf ? l.primary : undefined)],
    ['PDF', l.pdf],
    ['HTML', l.html],
    ['Code', l.code],
    ['Project', l.project],
  ];
  if (l.abs && paper.url) items.splice(1, 0, ['Page', paper.url]);
  return (
    <span className={`paper-links${compact ? ' compact' : ''}`}>
      {items
        .filter(([, href]) => href)
        .map(([label, href]) => (
          <a key={label} href={href} target="_blank" rel="noopener">
            {label}
            <span aria-hidden="true"> ↗</span>
          </a>
        ))}
    </span>
  );
}

function SourceItem({ paper }: { paper: Paper }) {
  const noted = Boolean(paper.notes.trim()) || paper.highlights.length > 0;
  return (
    <li className="source-item">
      <a className="source-title" href={`/library/${paper.id}`}>
        {paper.title}
      </a>
      <div className="source-meta">
        <span>
          {paper.citeAs}
          {paper.published ? ` · ${paper.published}` : ''}
        </span>
        <StatusDot status={paper.status} />
        {noted && (
          <a className="notes-flag" href={`/library/${paper.id}`}>
            {paper.highlights.length ? `${paper.highlights.length} highlight${paper.highlights.length === 1 ? '' : 's'}` : 'notes'}
          </a>
        )}
      </div>
      <PaperLinks paper={paper} compact />
    </li>
  );
}

export function Inspector({ atlas, milestone, onSelect, onNext, position }: { atlas: Atlas; milestone: Milestone; onSelect: (id: string) => void; onNext: () => void; position: string }) {
  const content = useContent();
  const kind = atlas.kinds.find((k) => k.id === milestone.kind);
  const byId = new Map(atlas.milestones.map((m) => [m.id, m]));
  const linkKind = new Map(atlas.linkKinds.map((k) => [k.verb, k]));
  const earlier = atlas.connections.filter((c) => c.to === milestone.id);
  const later = atlas.connections.filter((c) => c.from === milestone.id);
  const papers = milestone.sources.map((id) => content.papers.find((p) => p.id === id)).filter((p): p is Paper => Boolean(p));

  const connection = (otherId: string, verb: string, note: string) => {
    const other = byId.get(otherId);
    if (!other) return null;
    const lk = linkKind.get(verb);
    return (
      <li key={otherId + verb}>
        <a
          href={`/atlas/${atlas.slug}/${otherId}`}
          data-keep-scroll="true"
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey) return;
            e.preventDefault();
            onSelect(otherId);
          }}
        >
          {other.title}
        </a>
        <span className={`conn-kind conn-${lk?.style ?? 'solid'}`} title={lk?.explanation}>
          <i />
          {lk?.label ?? verb}
        </span>
        {note && <Md source={note} atlas={atlas.slug} className="conn-note" />}
      </li>
    );
  };

  return (
    <article className="inspector" aria-live="polite">
      <header className="insp-top">
        <span className="label">
          <KindSymbol kind={kind} /> {kind?.label ?? milestone.kind}
        </span>
        <span className="label">{milestone.date}</span>
      </header>
      <div className="insp-body">
        <h3>{milestone.title}</h3>
        {milestone.lead && <Md source={milestone.lead} atlas={atlas.slug} inline as="p" className="lead" />}
        {milestone.parts.map((p, i) => (
          <section key={i} className="insp-part">
            {p.heading && <h4 className="label">{p.heading}</h4>}
            <Md source={p.body} atlas={atlas.slug} />
          </section>
        ))}
        {(earlier.length > 0 || later.length > 0) && (
          <section className="insp-part">
            {earlier.length > 0 && (
              <>
                <h4 className="label">Builds on · {earlier.length}</h4>
                <ul className="connections">{earlier.map((c) => connection(c.from, c.verb, c.note))}</ul>
              </>
            )}
            {later.length > 0 && (
              <>
                <h4 className="label">Leads to · {later.length}</h4>
                <ul className="connections">{later.map((c) => connection(c.to, c.verb, c.note))}</ul>
              </>
            )}
          </section>
        )}
        {papers.length > 0 && (
          <section className="insp-part">
            <h4 className="label">Primary sources</h4>
            <ul className="sources">
              {papers.map((p) => (
                <SourceItem key={p.id} paper={p} />
              ))}
            </ul>
          </section>
        )}
      </div>
      <footer className="insp-foot">
        <span className="label">{position}</span>
        <span className="insp-actions">
          <EditLink file={milestone.loc.file} line={milestone.loc.line} />
          <button type="button" className="btn-quiet" onClick={onNext}>
            Next <Icon name="arrow" size={13} />
          </button>
        </span>
      </footer>
    </article>
  );
}
