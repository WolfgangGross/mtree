/** One paper: links, reading status, notes, highlights with deep links, and where it is cited. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { locate } from '../../content/deeplinks';
import { STATUSES, type Content, type Highlight, type Paper, type ReadingStatus } from '../../content/types';
import { EditLink, Icon, StatusDot } from '../components/bits';
import { PaperLinks } from '../components/Inspector';
import { Md } from '../components/Md';
import { api, EDITABLE, useContent } from '../store';
import type { Route } from '../router';
import { NotFound } from './NotFound';

export function citedIn(content: Content, paperId: string) {
  const out: { atlas: Content['atlases'][number]; milestone: Content['atlases'][number]['milestones'][number] }[] = [];
  const re = new RegExp(`\\[@${paperId}(?:\\s*,|\\])`);
  for (const atlas of content.atlases)
    for (const m of atlas.milestones) {
      if (m.sources.includes(paperId) || re.test(m.lead) || m.parts.some((p) => re.test(p.body))) out.push({ atlas, milestone: m });
    }
  return out;
}

function StatusPicker({ paper }: { paper: Paper }) {
  const [busy, setBusy] = useState(false);
  if (!EDITABLE) return paper.status ? <StatusDot status={paper.status} /> : null;
  const set = async (s: ReadingStatus) => {
    setBusy(true);
    await api(`/paper/${paper.id}`, { status: paper.status === s ? '' : s });
    setBusy(false);
  };
  return (
    <div className={`status-picker${busy ? ' busy' : ''}`} role="group" aria-label="Reading status">
      {STATUSES.map((s) => (
        <button key={s} type="button" aria-pressed={paper.status === s} onClick={() => set(s)}>
          {s}
        </button>
      ))}
    </div>
  );
}

function NotesEditor({ paper, onDone }: { paper: Paper; onDone: () => void }) {
  const [text, setText] = useState(paper.notes);
  const [state, setState] = useState<{ saving: boolean; error: string }>({ saving: false, error: '' });
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);
  const save = async () => {
    setState({ saving: true, error: '' });
    const r = await api(`/paper/${paper.id}`, { notes: text });
    if (r.ok) onDone();
    else setState({ saving: false, error: r.error ?? 'Could not save.' });
  };
  return (
    <div className="notes-editor">
      <div className="editor-panes">
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'Enter')) {
              e.preventDefault();
              save();
            }
            if (e.key === 'Escape') onDone();
          }}
          placeholder={'Write in Markdown.\n\n[[ddpm]] links a milestone, [@ddpm, p. 4] cites a page, $x_t$ is maths.'}
          aria-label="Notes in Markdown"
          spellCheck
        />
        <div className="editor-preview">
          <span className="label">Preview</span>
          {text.trim() ? <Md source={text} /> : <p className="empty">Nothing yet.</p>}
        </div>
      </div>
      <div className="editor-bar">
        <span className="label">Saves to {paper.loc.file} · ⌘S to save · Esc to cancel</span>
        {state.error && <span className="error">{state.error}</span>}
        <button type="button" className="btn-plain" onClick={onDone}>
          Cancel
        </button>
        <button type="button" className="btn-ink" onClick={save} disabled={state.saving}>
          {state.saving ? 'Saving…' : 'Save notes'}
        </button>
      </div>
    </div>
  );
}

function HighlightItem({ paper, h }: { paper: Paper; h: Highlight }) {
  const at = h.locator ? locate(paper, h.locator) : null;
  const quote = h.quote ? locate(paper, '', h.quote) : null;
  return (
    <li className="highlight">
      <div className="hl-head">
        {h.locator &&
          (at && at.href ? (
            <a className="hl-loc" href={at.href} target="_blank" rel="noopener" title={at.exact ? `Jump to ${h.locator}` : 'Opens the paper (no exact anchor for this locator)'}>
              {h.locator} ↗
            </a>
          ) : (
            <span className="hl-loc">{h.locator}</span>
          ))}
        {EDITABLE && (
          <button type="button" className="hl-remove" title="Remove this highlight" onClick={() => api(`/paper/${paper.id}`, { removeHighlight: { line: h.loc.line, locator: h.locator, quote: h.quote, comment: h.comment } })}>
            <Icon name="close" size={11} />
          </button>
        )}
      </div>
      {h.quote && (
        <blockquote>
          {quote?.href ? (
            <a href={quote.href} target="_blank" rel="noopener" title="Open the paper at this sentence">
              “{h.quote}”
            </a>
          ) : (
            `“${h.quote}”`
          )}
        </blockquote>
      )}
      {h.comment && <Md source={h.comment} inline as="p" className="hl-comment" />}
    </li>
  );
}

function HighlightForm({ paper }: { paper: Paper }) {
  const [locator, setLocator] = useState('');
  const [quote, setQuote] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const preview = locator || quote ? locate(paper, locator, quote) : null;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await api(`/paper/${paper.id}`, { highlight: { locator, quote, comment } });
    if (!r.ok) return setError(r.error ?? 'Could not save.');
    setLocator('');
    setQuote('');
    setComment('');
    setError('');
  };
  return (
    <form className="hl-form" onSubmit={submit}>
      <span className="label">Add a highlight</span>
      <div className="hl-fields">
        <input value={locator} onChange={(e) => setLocator(e.target.value)} placeholder="Where: p. 4, §3.2, Figure 2" aria-label="Locator" />
        <input value={quote} onChange={(e) => setQuote(e.target.value)} placeholder="Quote (optional): exact words from the paper" aria-label="Quote" />
        <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Your comment (optional)" aria-label="Comment" />
        <button type="submit" className="btn-ink" disabled={!locator && !quote && !comment}>
          Add
        </button>
      </div>
      {preview?.href && (
        <span className="hl-preview label">
          Links to{' '}
          <a href={preview.href} target="_blank" rel="noopener">
            {preview.target === 'pdf' ? 'the PDF' : preview.target === 'html' ? 'the HTML version' : 'the page'}
            {preview.exact ? ' at that spot' : ''} ↗
          </a>
        </span>
      )}
      {error && <span className="error">{error}</span>}
    </form>
  );
}

function CopyCite({ id }: { id: string }) {
  const [done, setDone] = useState(false);
  const text = `[@${id}]`;
  return (
    <button
      type="button"
      className="cite-copy"
      title="Copy the citation to paste into milestones.md or notes"
      onClick={() => {
        navigator.clipboard?.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1400);
      }}
    >
      <code>{text}</code> <span className="label">{done ? 'copied' : 'copy'}</span>
    </button>
  );
}

export function PaperPage({ route }: { route: Route }) {
  const content = useContent();
  const paper = content.papers.find((p) => p.id === route.params.id);
  const [editing, setEditing] = useState(false);
  const cited = useMemo(() => (paper ? citedIn(content, paper.id) : []), [content, paper]);
  useEffect(() => {
    if (paper) document.title = `${paper.title} · ${content.site.title}`;
  }, [paper, content.site.title]);
  if (!paper) return <NotFound what={`paper called “${route.params.id}” in the library`} />;

  return (
    <article className="page narrow paper-page">
      <div className="tag-row">
        {paper.type && <span className="tag">{paper.type}</span>}
        {paper.tags.map((t) => (
          <a key={t} className="tag" href={`/library?tag=${encodeURIComponent(t)}`}>
            {t}
          </a>
        ))}
      </div>
      <h1 className="page-title">{paper.title}</h1>
      <div className="byline label">
        <span>{paper.authors || paper.citeAs}</span>
        {paper.published && <span>{paper.published}</span>}
        {paper.arxiv && <span>arXiv {paper.arxiv}</span>}
      </div>
      <PaperLinks paper={paper} />
      <div className="paper-tools">
        <StatusPicker paper={paper} />
        <span className="tools-right">
          <CopyCite id={paper.id} />
          <EditLink file={paper.loc.file} line={paper.loc.line} label="Edit file" />
        </span>
      </div>
      {paper.summary && <Md source={paper.summary} className="prose lede" />}

      <section className="paper-section">
        <div className="section-title-row">
          <h2>Notes</h2>
          {EDITABLE && !editing && (
            <button type="button" className="btn-plain" onClick={() => setEditing(true)}>
              <Icon name="edit" size={13} /> {paper.notes.trim() ? 'Edit notes' : 'Write notes'}
            </button>
          )}
        </div>
        {editing ? (
          <NotesEditor paper={paper} onDone={() => setEditing(false)} />
        ) : paper.notes.trim() ? (
          <Md source={paper.notes} />
        ) : (
          <p className="empty">{EDITABLE ? 'No notes yet. Write what you want to remember, in your own words.' : 'No notes yet.'}</p>
        )}
      </section>

      {paper.extra.map((x) => (
        <section key={x.heading} className="paper-section">
          <h2>{x.heading}</h2>
          <Md source={x.body} />
        </section>
      ))}

      <section className="paper-section">
        <h2>Highlights</h2>
        {paper.highlights.length ? (
          <ul className="highlights">
            {paper.highlights.map((h) => (
              <HighlightItem key={h.loc.line} paper={paper} h={h} />
            ))}
          </ul>
        ) : (
          <p className="empty">No highlights yet.</p>
        )}
        {EDITABLE && <HighlightForm paper={paper} />}
      </section>

      <section className="paper-section related">
        <span className="label">Cited in</span>
        {cited.length ? (
          <ul className="cited-list">
            {cited.map(({ atlas, milestone }) => (
              <li key={atlas.slug + milestone.id}>
                <a href={`/atlas/${atlas.slug}/${milestone.id}`}>{milestone.title}</a>
                <span className="label"> · {atlas.plainTitle} · {milestone.date}</span>
                {milestone.lead && <Md source={milestone.lead} atlas={atlas.slug} inline as="p" className="cited-lead" />}
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty">Not cited by any milestone yet. Add “{paper.id}” to a milestone’s sources.</p>
        )}
      </section>
    </article>
  );
}
