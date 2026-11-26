/** The front page: every atlas, then what you are reading. */
import { useEffect } from 'react';
import { paragraphs } from '../../content/doc';
import { KindSymbol, StatusDot } from '../components/bits';
import { Md } from '../components/Md';
import { EDITABLE, useContent } from '../store';

export function Home() {
  const content = useContent();
  useEffect(() => {
    document.title = content.site.title;
  }, [content.site.title]);
  const intro = paragraphs(content.site.about, 1)[0]?.text ?? '';
  const reading = content.papers.filter((p) => p.status === 'reading' || p.status === 'to read' || p.status === 'revisit').sort((a, b) => ['reading', 'revisit', 'to read'].indexOf(a.status) - ['reading', 'revisit', 'to read'].indexOf(b.status));
  const annotated = content.papers.filter((p) => p.notes.trim() || p.highlights.length);

  return (
    <div className="page narrow home">
      {intro && <Md source={intro} className="prose lede home-intro" />}

      <h2 className="list-heading">Atlases</h2>
      <ol className="entries">
        {content.atlases.map((a) => (
          <li key={a.slug} className="entry">
            <div className="entry-head">
              <a className="entry-title" href={`/atlas/${a.slug}`}>
                <Md source={a.title} inline />
              </a>
              <span className="label entry-date">{a.updated}</span>
            </div>
            {a.kicker && <span className="label">{a.kicker}</span>}
            {a.summary && <Md source={a.summary} atlas={a.slug} className="entry-text" />}
            <div className="tag-row">
              {a.kinds.map((k) => (
                <span key={k.id} className="tag">
                  <KindSymbol kind={k} size={7} /> {k.label}
                </span>
              ))}
              <span className="label cited-count">
                {a.milestones.length} milestones · {a.branches.length} branches · {a.connections.length} connections
              </span>
            </div>
          </li>
        ))}
        {!content.atlases.length && (
          <li className="empty">
            No atlases yet. Run <code>npm run new-atlas -- my-topic "My topic"</code> or ask your coding agent to start one.
          </li>
        )}
      </ol>

      {(reading.length > 0 || annotated.length > 0) && (
        <div className="home-columns">
          {reading.length > 0 && (
            <section>
              <h2 className="list-heading small">Reading list</h2>
              <ul className="mini-list">
                {reading.slice(0, 8).map((p) => (
                  <li key={p.id}>
                    <a href={`/library/${p.id}`}>{p.title}</a>
                    <span className="mini-meta">
                      <StatusDot status={p.status} /> {p.citeAs}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {annotated.length > 0 && (
            <section>
              <h2 className="list-heading small">Annotated</h2>
              <ul className="mini-list">
                {annotated.slice(0, 8).map((p) => (
                  <li key={p.id}>
                    <a href={`/library/${p.id}`}>{p.title}</a>
                    <span className="mini-meta label">
                      {p.highlights.length} highlights · {p.citeAs}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
      <p className="home-library">
        <a href="/library">
          Browse the library · {content.papers.length} sources →
        </a>
      </p>
      {EDITABLE && (
        <p className="label home-hint">
          Edit anything in <code>human/</code> and this page updates as you save.
        </p>
      )}
    </div>
  );
}

export function About() {
  const content = useContent();
  useEffect(() => {
    document.title = `About · ${content.site.title}`;
  }, [content.site.title]);
  return (
    <div className="page narrow about">
      <h1 className="page-title">About</h1>
      <Md source={content.site.about} />
    </div>
  );
}
